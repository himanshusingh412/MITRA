"""Eligibility and recommendation engine.

Port of frontend/lib/eligibility.ts. Rules are declarative data from the shared
catalogue, so adding a scheme never touches this file.

Every result carries the specific rules that produced it. A citizen refused a benefit
has a right to know which criterion failed, and an auditor has a right to reproduce
the decision — which is why this is a rule engine and not a model.
"""

from __future__ import annotations

from typing import Any, Literal

from app.services.catalogue import all_schemes, get_scheme

MatchLevel = Literal["eligible", "verify", "not-eligible"]

# Profile keys as they appear in the shared rule data (camelCase, from TypeScript).
_FIELD_ALIASES = {
    "annualIncome": "annual_income",
    "familySize": "family_size",
    "hasDisability": "has_disability",
    "disabilityPercent": "disability_percent",
    "landHoldingHectares": "land_holding_hectares",
    "existingBenefits": "existing_benefits",
    "lifeEvents": "life_events",
}


def _read_field(profile: dict[str, Any], field: str) -> Any:
    if field in profile:
        return profile[field]
    return profile.get(_FIELD_ALIASES.get(field, field))


def evaluate_rule(profile: dict[str, Any], rule: dict[str, Any]) -> bool:
    actual = _read_field(profile, rule["field"])
    expected = rule.get("value")
    op = rule["op"]

    if op == "exists":
        return actual is not None and actual != ""
    if op == "eq":
        return actual == expected
    if op == "neq":
        return actual != expected
    if op == "lte":
        return isinstance(actual, (int, float)) and isinstance(expected, (int, float)) and actual <= expected
    if op == "gte":
        return isinstance(actual, (int, float)) and isinstance(expected, (int, float)) and actual >= expected
    if op == "in":
        return isinstance(expected, list) and actual in expected
    if op == "nin":
        return isinstance(expected, list) and actual not in expected
    if op == "includes":
        return isinstance(actual, list) and expected in actual
    if op == "excludes":
        return isinstance(actual, list) and expected not in actual
    return False


_THRESHOLD_OPS = {"lte", "gte"}


def evaluate_scheme(profile: dict[str, Any], scheme: dict[str, Any]) -> dict[str, Any]:
    passed: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []

    for rule in scheme["rules"]:
        ok = evaluate_rule(profile, rule)
        entry = {"label": rule["label"], "passed": ok, "soft": bool(rule.get("soft"))}
        (passed if ok else failed).append(entry)

    hard_failures = [f for f in failed if not f["soft"]]
    soft_failures = [f for f in failed if f["soft"]]

    # A near-miss is only worth surfacing when the failing criterion is a *threshold*
    # (an income ceiling, an age band) — those genuinely vary between states. A
    # categorical failure (rural citizen, urban-only scheme) is a real disqualification,
    # and telling the citizen to "go and check" would waste a trip they cannot afford.
    only_threshold_failure = len(hard_failures) == 1 and any(
        r["label"] == hard_failures[0]["label"] and r["op"] in _THRESHOLD_OPS
        for r in scheme["rules"]
    )

    if not hard_failures and not soft_failures:
        level: MatchLevel = "eligible"
        reason = f"You meet all {len(passed)} criteria we can check for this scheme."
    elif not hard_failures:
        level = "verify"
        plural = "s need" if len(soft_failures) > 1 else " needs"
        reason = (
            f"You meet the main criteria. {len(soft_failures)} point{plural} "
            "confirmation with a document or at your local centre."
        )
    elif only_threshold_failure:
        level = "verify"
        reason = (
            f'You are close: one limit does not match — "{hard_failures[0]["label"].lower()}". '
            "Worth confirming, because states often set this threshold differently."
        )
    else:
        level = "not-eligible"
        if len(hard_failures) == 1:
            reason = (
                "You do not currently meet one essential condition: "
                f"{hard_failures[0]['label'].lower()}."
            )
        else:
            reason = (
                f"{len(hard_failures)} of the required criteria do not match your profile right now."
            )

    total_rules = len(scheme["rules"])
    score = 0 if total_rules == 0 else round(len(passed) / total_rules * 100)

    return {
        "schemeId": scheme["id"],
        "level": level,
        "score": score,
        "passed": passed,
        "failed": failed,
        "reason": reason,
    }


_LEVEL_WEIGHT = {"eligible": 1000, "verify": 500, "not-eligible": 0}


def recommend_schemes(
    profile: dict[str, Any],
    limit: int | None = None,
    include_ineligible: bool = False,
    sector: str | None = None,
) -> list[dict[str, Any]]:
    """Ranks schemes for a citizen.

    Beyond raw eligibility, schemes tied to a declared life event are boosted: someone
    who just lost their job should see employment support before a savings scheme they
    also technically qualify for.
    """
    rows: list[tuple[int, dict[str, Any], dict[str, Any]]] = []

    for scheme in all_schemes():
        if sector and scheme["sector"] != sector:
            continue
        result = evaluate_scheme(profile, scheme)
        if not include_ineligible and result["level"] == "not-eligible":
            continue

        life_events = _read_field(profile, "lifeEvents") or []
        existing = _read_field(profile, "existingBenefits") or []

        boost = 200 if any(e in life_events for e in scheme.get("relatedLifeEvents", [])) else 0
        already_has = -900 if scheme["id"] in existing else 0
        rank = _LEVEL_WEIGHT[result["level"]] + result["score"] + boost + already_has

        rows.append((rank, scheme, result))

    rows.sort(key=lambda r: r[0], reverse=True)
    out = [{"scheme": s, "result": r} for _, s, r in rows]
    return out[:limit] if limit else out


def build_checklist(
    profile: dict[str, Any],
    scheme: dict[str, Any],
    documents: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Personalised document checklist.

    Conditional documents are only included when their predicate matches this citizen,
    so nobody is asked for paperwork they do not actually need.
    """
    from datetime import datetime, timezone

    owner_id = profile.get("id")
    out: list[dict[str, Any]] = []

    for doc in scheme["documents"]:
        required_if = doc.get("requiredIf")
        if required_if and not evaluate_rule(profile, required_if):
            continue

        match = next(
            (d for d in documents if d.get("type") == doc["id"] and d.get("ownerId") == owner_id),
            None,
        )

        if not match:
            out.append({"id": doc["id"], "name": doc["name"], "status": "missing",
                        "detail": "Not in your document vault yet."})
            continue

        expires_at = match.get("expiresAt")
        if expires_at:
            try:
                expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                days_left = (expiry - datetime.now(timezone.utc)).days
                if days_left < 0:
                    out.append({"id": doc["id"], "name": doc["name"], "status": "missing",
                                "detail": f"Expired {abs(days_left)} days ago — renew before applying."})
                    continue
                if days_left < 90:
                    out.append({"id": doc["id"], "name": doc["name"], "status": "expiring",
                                "detail": f"Valid for {days_left} more days. Renew soon."})
                    continue
            except ValueError:
                # An unparseable expiry is treated as unknown rather than as valid —
                # failing open here would let an expired certificate through silently.
                out.append({"id": doc["id"], "name": doc["name"], "status": "expiring",
                            "detail": "Expiry date could not be read. Check it before applying."})
                continue

        if not match.get("verified"):
            out.append({"id": doc["id"], "name": doc["name"], "status": "expiring",
                        "detail": "Uploaded but not yet verified."})
            continue

        out.append({"id": doc["id"], "name": doc["name"], "status": "have",
                    "detail": "Verified and ready to use."})

    return out
