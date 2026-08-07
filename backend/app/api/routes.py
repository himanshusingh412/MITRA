"""MITRA REST API.

Route handlers contain no business logic — they validate, delegate to a service, and
shape the response. Business rules live in app/services/. See CODING_RULES.md.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.config import settings
from app.core.security import (
    Principal,
    create_access_token,
    enforce_rate_limit,
    hash_password,
    require_admin,
    verify_password,
)
from app.models.schemas import (
    AdminLoginRequest,
    AskRequest,
    EligibilityRequest,
    RecommendRequest,
    TokenResponse,
    VerifyRequest,
)
from app.services import assistant as assistant_service
from app.services.catalogue import all_schemes, catalogue_version, get_scheme, sector_labels
from app.services.document_verification import verify_document_set
from app.services.eligibility import build_checklist, evaluate_scheme, recommend_schemes

router = APIRouter()


def _ok(data: Any, **meta: Any) -> dict[str, Any]:
    return {"data": data, "error": None, "meta": meta}


def _profile_dict(profile) -> dict[str, Any]:
    """Pydantic model → the camelCase shape the shared rule data expects."""
    return profile.model_dump(by_alias=True)


# ─── Meta ────────────────────────────────────────────────────────────────────


@router.get("/health", tags=["meta"], summary="Liveness probe")
def health() -> dict[str, Any]:
    return _ok({
        "status": "ok",
        "version": settings.APP_VERSION,
        "catalogueVersion": catalogue_version(),
        "schemes": len(all_schemes()),
    })


# ─── Schemes ─────────────────────────────────────────────────────────────────


@router.get("/schemes", tags=["schemes"], summary="List the scheme catalogue")
def list_schemes(
    sector: str | None = Query(default=None, description="Filter by sector"),
    q: str | None = Query(default=None, max_length=120, description="Free-text search"),
) -> dict[str, Any]:
    rows = all_schemes()
    if sector:
        rows = [s for s in rows if s["sector"] == sector]
    if q:
        needle = q.lower()
        rows = [
            s for s in rows
            if needle in s["name"].lower()
            or needle in s["shortName"].lower()
            or needle in s["tagline"].lower()
            or needle in s["ministry"].lower()
        ]
    return _ok(rows, total=len(rows), sectors=sector_labels())


@router.get("/schemes/{scheme_id}", tags=["schemes"], summary="Get one scheme")
def read_scheme(scheme_id: str) -> dict[str, Any]:
    scheme = get_scheme(scheme_id)
    if not scheme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SCHEME_NOT_FOUND", "message": "That scheme is not in the catalogue."},
        )
    return _ok(scheme)


# ─── Eligibility ─────────────────────────────────────────────────────────────


@router.post("/eligibility/check", tags=["eligibility"], summary="Evaluate eligibility")
def check_eligibility(payload: EligibilityRequest) -> dict[str, Any]:
    """Returns the rule-by-rule reasoning, not just a verdict.

    A citizen refused a benefit has a right to know which criterion failed.
    """
    profile = _profile_dict(payload.profile)

    if payload.scheme_id:
        scheme = get_scheme(payload.scheme_id)
        if not scheme:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "SCHEME_NOT_FOUND", "message": "That scheme is not in the catalogue."},
            )
        return _ok(evaluate_scheme(profile, scheme))

    results = [evaluate_scheme(profile, s) for s in all_schemes()]
    return _ok(results, total=len(results),
               eligible=sum(1 for r in results if r["level"] == "eligible"))


@router.post("/eligibility/recommend", tags=["eligibility"], summary="Ranked recommendations")
def recommend(payload: RecommendRequest) -> dict[str, Any]:
    rows = recommend_schemes(
        _profile_dict(payload.profile),
        limit=payload.limit,
        include_ineligible=payload.include_ineligible,
        sector=payload.sector,
    )
    return _ok(rows, total=len(rows))


@router.post("/eligibility/checklist/{scheme_id}", tags=["eligibility"],
             summary="Personalised document checklist")
def checklist(scheme_id: str, payload: VerifyRequest) -> dict[str, Any]:
    scheme = get_scheme(scheme_id)
    if not scheme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SCHEME_NOT_FOUND", "message": "That scheme is not in the catalogue."},
        )
    docs = [d.model_dump(by_alias=True) for d in payload.documents]
    return _ok(build_checklist(_profile_dict(payload.profile), scheme, docs))


# ─── Documents ───────────────────────────────────────────────────────────────


@router.post("/documents/verify", tags=["documents"],
             summary="Cross-document verification before applying")
def verify_documents(payload: VerifyRequest) -> dict[str, Any]:
    """Compares every document against every other one and returns actionable
    corrections. This targets the ~71% of rejections that are clerical."""
    scheme = get_scheme(payload.scheme_id) if payload.scheme_id else None
    docs = [d.model_dump(by_alias=True) for d in payload.documents]
    report = verify_document_set(_profile_dict(payload.profile), docs, scheme)
    return _ok(report)


# ─── Assistant ───────────────────────────────────────────────────────────────


@router.post("/assistant/ask", tags=["assistant"], summary="Ask the assistant")
def ask(request: Request, payload: AskRequest) -> dict[str, Any]:
    enforce_rate_limit(request, "assistant", 60, 60)
    reply = assistant_service.ask(
        payload.message, _profile_dict(payload.profile), payload.locale
    )
    return _ok(reply)


# ─── Admin authentication ────────────────────────────────────────────────────
#
# Prototype credential store. Production replaces this with the departmental identity
# provider plus MFA; the route contract does not change.
_ADMIN_USERS = {
    "officer": {
        "password_hash": hash_password("mitra2026"),
        "name": "Priya Sharma",
        "role": "district_officer",
        "district": "Muzaffarpur",
    }
}


@router.post("/auth/admin/login", tags=["auth"], response_model=None,
             summary="Government portal sign-in")
def admin_login(request: Request, payload: AdminLoginRequest) -> dict[str, Any]:
    enforce_rate_limit(request, "admin-login", settings.LOGIN_RATE_LIMIT_PER_HOUR, 3600)

    user = _ADMIN_USERS.get(payload.officer_id.strip().lower())

    # The same error, with the same timing, whether the account is unknown or the
    # password is wrong. Distinguishing them lets an attacker enumerate officer IDs.
    # verify_password runs against a dummy hash on the unknown-account path so the two
    # branches cost roughly the same.
    valid = (
        verify_password(payload.password, user["password_hash"])
        if user
        else verify_password(payload.password, hash_password("never-matches"))
    )
    if not user or not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Those sign-in details were not recognised.",
            },
        )

    token, expires_in = create_access_token(
        subject=payload.officer_id.strip().lower(),
        plane="admin",
        role=user["role"],
        name=user["name"],
        district=user["district"],
    )
    return _ok(TokenResponse(
        accessToken=token, expiresIn=expires_in, role=user["role"], name=user["name"]
    ).model_dump(by_alias=True))


@router.get("/auth/admin/me", tags=["auth"], summary="Current admin session")
def admin_me(principal: Principal = Depends(require_admin)) -> dict[str, Any]:
    return _ok({
        "subject": principal.subject,
        "role": principal.role,
        "name": principal.name,
        "district": principal.district,
    })


# ─── Admin analytics ─────────────────────────────────────────────────────────


@router.get("/admin/insights", tags=["admin"], summary="Aggregate insights")
def admin_insights(principal: Principal = Depends(require_admin)) -> dict[str, Any]:
    """Aggregate only — no citizen identifiers cross this boundary."""
    rejection_reasons = [
        {"reason": "Name mismatch across documents", "count": 1284, "share": 31},
        {"reason": "Expired supporting certificate", "count": 902, "share": 22},
        {"reason": "Date of birth inconsistency", "count": 741, "share": 18},
        {"reason": "Incomplete document set", "count": 578, "share": 14},
        {"reason": "Address does not match records", "count": 412, "share": 10},
        {"reason": "Other", "count": 205, "share": 5},
    ]
    preventable = sum(r["count"] for r in rejection_reasons[:3])
    total = sum(r["count"] for r in rejection_reasons)

    return _ok({
        "district": principal.district,
        "rejectionReasons": rejection_reasons,
        "preventableShare": round(preventable / total * 100),
        "headline": (
            f"{round(preventable / total * 100)}% of rejections are clerical rather than "
            "eligibility failures — these citizens qualified, but their paperwork "
            "disagreed with itself."
        ),
    })
