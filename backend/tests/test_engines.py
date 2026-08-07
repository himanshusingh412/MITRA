"""MITRA backend test suite.

The fuzzy-matching and eligibility cases below are the *same vectors* used by the
TypeScript suite in frontend/lib/__tests__/engines.test.ts. That is the point: the app
and the API must never give a citizen different answers about their entitlement, and
duplicated logic drifts unless something holds it together.

Run: cd backend && python -m pytest -q
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.services.assistant import ask, detect_life_events
from app.services.catalogue import all_schemes, get_scheme
from app.services.document_verification import verify_document_set
from app.services.eligibility import build_checklist, evaluate_scheme, recommend_schemes
from app.services.fuzzy import (
    compare_addresses,
    compare_dates,
    compare_names,
    jaro_winkler,
    parse_indian_date,
)
from main import app


def iso(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


RAVI = {
    "id": "u-ravi",
    "name": "Ravi Kumar",
    "age": 34,
    "gender": "male",
    "state": "Bihar",
    "district": "Muzaffarpur",
    "area": "rural",
    "occupation": "farmer",
    "annualIncome": 148000,
    "category": "obc",
    "familySize": 5,
    "hasDisability": False,
    "landHoldingHectares": 1.2,
    "existingBenefits": ["e-shram"],
    "lifeEvents": ["farming-season"],
}

ANJALI = {
    "id": "u-anjali",
    "name": "Anjali Kumari",
    "age": 17,
    "gender": "female",
    "state": "Bihar",
    "district": "Muzaffarpur",
    "area": "rural",
    "occupation": "student",
    "annualIncome": 0,
    "category": "obc",
    "familySize": 5,
    "hasDisability": False,
    "existingBenefits": [],
    "lifeEvents": ["started-studies"],
}

DOCUMENTS = [
    {
        "id": "d-aadhaar-ravi", "name": "Aadhaar Card", "type": "aadhaar",
        "ownerId": "u-ravi", "verified": True, "source": "digilocker",
        "extracted": {
            "name": "Ravi Kumar", "dob": "14/03/1992", "gender": "Male",
            "address": "Vill- Bahadurpur, PO- Kanti, Dist- Muzaffarpur, Bihar - 843130",
            "idNumber": "XXXX XXXX 4417", "fatherName": "Ram Dev Singh",
        },
    },
    {
        # Transliteration variant — same person. Must NOT be flagged.
        "id": "d-pan-ravi", "name": "PAN Card", "type": "pan",
        "ownerId": "u-ravi", "verified": True, "source": "digilocker",
        "extracted": {"name": "Rabi Kumar", "dob": "14/03/1992",
                      "fatherName": "Ramdev Singh", "idNumber": "BXKPK4417M"},
    },
    {
        # Day/month swapped — a genuine data-entry error.
        "id": "d-land-ravi", "name": "Land Record", "type": "land-record",
        "ownerId": "u-ravi", "verified": True, "source": "upload",
        "extracted": {"name": "Ravi Kumar Singh", "dob": "03/14/1992",
                      "address": "Bahadurpur Village, Kanti Block, Muzaffarpur, Bihar 843130",
                      "fatherName": "Ram Dev Singh"},
    },
    {
        # Already lapsed — a blocker.
        "id": "d-income-ravi", "name": "Income Certificate", "type": "income-cert",
        "ownerId": "u-ravi", "verified": True, "source": "csc", "expiresAt": iso(-35),
        "extracted": {"name": "Ravi Kumar", "fatherName": "Ram Dev Singh"},
    },
    {
        "id": "d-bank-ravi", "name": "Bank Passbook", "type": "bank-passbook",
        "ownerId": "u-ravi", "verified": True, "source": "upload",
        "extracted": {"name": "Ravi Kumar", "idNumber": "XXXX XXXX 4417"},
    },
    {
        "id": "d-aadhaar-anjali", "name": "Aadhaar Card", "type": "aadhaar",
        "ownerId": "u-anjali", "verified": True, "source": "digilocker",
        "extracted": {"name": "Anjali Kumari", "dob": "22/07/2009", "gender": "Female"},
    },
    {
        # Genuine birth-year mismatch — a blocker.
        "id": "d-marksheet-anjali", "name": "Class 10 Marksheet", "type": "marksheet",
        "ownerId": "u-anjali", "verified": True, "source": "upload",
        "extracted": {"name": "Anjali Kumari", "dob": "22/07/2008"},
    },
]


# ─── Fuzzy name matching ─────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "a,b,expected",
    [
        ("Ravi Kumar", "RAVI KUMAR", "match"),
        ("Ravi Kumar", "Ravi  Kumar", "match"),
        ("Ravi Kumar", "Shri Ravi Kumar", "match"),
        ("Ravi Kumar", "Kumar Ravi", "match"),
        ("Ravi Kumar", "Ravi Kumar Singh", "match"),
        ("Ravi Kumar", "Rabi Kumar", "match"),
        ("Ram Dev Singh", "Ramdev Singh", "match"),
        ("Ram Dev Singh", "Ramdeo Singh", "likely-match"),
        ("Jai Prakash", "Jaiprakash", "match"),
        ("Ravi Kumar", "R Kumar", "match"),
        ("Lakshmi", "Laxmi", "match"),
        ("Krishna", "Krishnaa", "match"),
        ("Ravi Kumar", "Sunita Devi", "mismatch"),
    ],
)
def test_compare_names(a: str, b: str, expected: str) -> None:
    assert compare_names(a, b).verdict == expected


def test_jaro_winkler_bounds() -> None:
    assert jaro_winkler("abc", "abc") == 1.0
    assert jaro_winkler("abc", "xyz") == 0.0


# ─── Dates ───────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("14/03/1992", "1992-03-14"),
        ("1992-03-14", "1992-03-14"),
        ("14-03-92", "1992-03-14"),
        ("14 Mar 1992", "1992-03-14"),
    ],
)
def test_parse_indian_date(raw: str, expected: str) -> None:
    parsed = parse_indian_date(raw)
    assert parsed is not None and parsed.iso == expected


def test_year_only_is_flagged() -> None:
    parsed = parse_indian_date("1959")
    assert parsed is not None and parsed.year_only is True


@pytest.mark.parametrize(
    "a,b,expected",
    [
        ("14/03/1992", "1992-03-14", "match"),
        ("14/03/1992", "14-03-1992", "match"),
        ("14/03/1992", "03/14/1992", "likely-match"),
        ("1959", "01/01/1959", "match"),
        ("1959", "14/03/1959", "likely-match"),
        ("22/07/2009", "22/07/2008", "mismatch"),
        ("14/03/1992", "15/03/1992", "mismatch"),
    ],
)
def test_compare_dates(a: str, b: str, expected: str) -> None:
    assert compare_dates(a, b).verdict == expected


# ─── Addresses ───────────────────────────────────────────────────────────────


def test_same_address_different_formats() -> None:
    a = "Vill- Bahadurpur, PO- Kanti, Dist- Muzaffarpur, Bihar - 843130"
    b = "Bahadurpur Village, Kanti Block, Muzaffarpur, Bihar 843130"
    assert compare_addresses(a, b).verdict != "mismatch"


def test_different_pin_is_mismatch() -> None:
    a = "Vill- Bahadurpur, PO- Kanti, Muzaffarpur, Bihar - 843130"
    b = "Sector 22, Gurugram, Haryana 122015"
    assert compare_addresses(a, b).verdict == "mismatch"


# ─── Cross-document verification ─────────────────────────────────────────────


def test_finds_expired_certificate() -> None:
    report = verify_document_set(RAVI, DOCUMENTS)
    assert any(i["id"] == "expired-d-income-ravi" for i in report["issues"])


def test_flags_swapped_day_month() -> None:
    report = verify_document_set(RAVI, DOCUMENTS)
    assert any(
        i["field"] == "dob" and "d-land-ravi" in i["documentIds"] for i in report["issues"]
    )


def test_does_not_flag_transliteration_variant() -> None:
    """Rabi/Ravi is the same name. Flagging it trains citizens to ignore warnings."""
    report = verify_document_set(RAVI, DOCUMENTS)
    assert not any(
        i["field"] == "name" and "d-pan-ravi" in i["documentIds"] for i in report["issues"]
    )


def test_does_not_compare_aadhaar_against_pan() -> None:
    """Different identifier schemes are supposed to differ."""
    report = verify_document_set(RAVI, DOCUMENTS)
    assert not any(
        i["field"] == "idNumber" and "d-pan-ravi" in i["documentIds"]
        for i in report["issues"]
    )


def test_does_not_flag_ram_dev_vs_ramdev() -> None:
    report = verify_document_set(RAVI, DOCUMENTS)
    assert not any(i["field"] == "fatherName" for i in report["issues"])


def test_canonical_name_from_authoritative_document() -> None:
    report = verify_document_set(RAVI, DOCUMENTS)
    assert report["canonicalValues"]["name"]["value"] == "Ravi Kumar"


def test_every_issue_has_an_actionable_suggestion() -> None:
    report = verify_document_set(RAVI, DOCUMENTS)
    assert all(len(i["suggestion"]) > 20 for i in report["issues"])


def test_blockers_sort_first() -> None:
    report = verify_document_set(RAVI, DOCUMENTS)
    severities = [i["severity"] for i in report["issues"]]
    if "warning" in severities:
        assert "blocker" not in severities[severities.index("warning"):]


def test_catches_birth_year_mismatch() -> None:
    report = verify_document_set(ANJALI, DOCUMENTS)
    assert any(i["field"] == "dob" for i in report["issues"])


def test_no_documents_is_not_ready() -> None:
    report = verify_document_set({**RAVI, "id": "nobody"}, DOCUMENTS)
    assert report["readyToSubmit"] is False
    assert "No documents" in report["summary"]


def test_consistency_score_reflects_real_problems_only() -> None:
    report = verify_document_set(RAVI, DOCUMENTS)
    assert report["consistencyScore"] > 40


# ─── Eligibility ─────────────────────────────────────────────────────────────


def test_farmer_eligible_for_pm_kisan() -> None:
    assert evaluate_scheme(RAVI, get_scheme("pm-kisan"))["level"] == "eligible"


def test_obc_student_eligible_for_scholarship() -> None:
    assert evaluate_scheme(ANJALI, get_scheme("post-matric-scholarship"))["level"] == "eligible"


def test_rural_citizen_not_eligible_for_urban_housing() -> None:
    """A categorical failure is a real disqualification, not a 'go and check'."""
    assert evaluate_scheme(RAVI, get_scheme("pmay-urban"))["level"] == "not-eligible"


def test_adult_male_not_eligible_for_girl_child_scheme() -> None:
    assert evaluate_scheme(RAVI, get_scheme("sukanya-samriddhi"))["level"] == "not-eligible"


def test_every_verdict_is_explained() -> None:
    for scheme in all_schemes():
        result = evaluate_scheme(RAVI, scheme)
        assert len(result["reason"]) > 10
        assert len(result["passed"]) + len(result["failed"]) == len(scheme["rules"])


# ─── Recommendations ─────────────────────────────────────────────────────────


def test_recommendations_exclude_ineligible_by_default() -> None:
    rows = recommend_schemes(RAVI, limit=5)
    assert rows and all(r["result"]["level"] != "not-eligible" for r in rows)


def test_eligible_outrank_verify() -> None:
    rows = recommend_schemes(RAVI)
    levels = [r["result"]["level"] for r in rows]
    if "verify" in levels:
        assert "eligible" not in levels[levels.index("verify"):]


def test_held_benefits_are_demoted() -> None:
    rows = recommend_schemes(RAVI, limit=3)
    assert not any(r["scheme"]["id"] == "e-shram" for r in rows)


def test_sector_filter() -> None:
    rows = recommend_schemes(ANJALI, sector="education")
    assert rows and all(r["scheme"]["sector"] == "education" for r in rows)


# ─── Checklist ───────────────────────────────────────────────────────────────


def test_checklist_recognises_held_documents() -> None:
    items = build_checklist(RAVI, get_scheme("pm-kisan"), DOCUMENTS)
    assert items and any(i["status"] == "have" for i in items)


def test_conditional_documents_respect_profile() -> None:
    rural = build_checklist(RAVI, get_scheme("pm-kisan"), DOCUMENTS)
    urban = build_checklist({**RAVI, "area": "urban"}, get_scheme("pm-kisan"), DOCUMENTS)
    assert len(urban) < len(rural)


# ─── Assistant ───────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "text,event",
    [
        ("I lost my job last month", "job-loss"),
        ("my wife is pregnant", "childbirth"),
        ("my daughter is starting college", "started-studies"),
        ("my father turned 60", "senior-citizen"),
    ],
)
def test_life_event_detection(text: str, event: str) -> None:
    assert event in detect_life_events(text)


def test_named_scheme_resolves() -> None:
    assert "pm-kisan" in ask("tell me about PM-KISAN", RAVI)["schemeRefs"]


def test_assistant_is_deterministic() -> None:
    """Different advice on repeat asking would make the whole thing untrustworthy."""
    q = "what schemes am I eligible for"
    assert ask(q, RAVI)["text"] == ask(q, RAVI)["text"]


def test_hindi_returns_devanagari() -> None:
    text = ask("hello", RAVI, "hi")["text"]
    assert any("ऀ" <= ch <= "ॿ" for ch in text)


def test_tamil_returns_tamil_script() -> None:
    text = ask("hello", RAVI, "ta")["text"]
    assert any("஀" <= ch <= "௿" for ch in text)


def test_life_event_phrase_is_translated() -> None:
    """Regression: the interpolated life-event phrase used to stay English, producing
    a Hindi sentence with an English clause in the middle."""
    text = ask("my daughter is starting college", RAVI, "hi")["text"]
    assert "starting your studies" not in text
    assert "पढ़ाई" in text


def test_no_latin_clause_leaks_into_indic_replies() -> None:
    for locale in ("hi", "bn", "ta", "mr"):
        text = ask("I lost my job", RAVI, locale)["text"]
        assert "losing your job" not in text


def test_assistant_never_returns_empty() -> None:
    for q in ["hi", "track my application", "documents", "renew", "xyzzy"]:
        assert len(ask(q, RAVI)["text"]) > 0


def test_assistant_only_cites_real_schemes() -> None:
    """The assistant must not be able to invent a scheme."""
    valid = {s["id"] for s in all_schemes()}
    for q in ["I lost my job", "scholarship", "pension for my father", "health"]:
        assert set(ask(q, RAVI)["schemeRefs"]).issubset(valid)


# ─── Catalogue integrity ─────────────────────────────────────────────────────


def test_catalogue_is_complete() -> None:
    schemes = all_schemes()
    assert len(schemes) == 18
    assert len({s["id"] for s in schemes}) == len(schemes)
    for s in schemes:
        assert s["rules"] and s["documents"]
        assert s["officialUrl"].startswith("https://")
        assert len(s["summary"]) > 80


# ─── API ─────────────────────────────────────────────────────────────────────

client = TestClient(app)


def test_health() -> None:
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["data"]["schemes"] == 18


def test_list_and_filter_schemes() -> None:
    assert len(client.get("/api/v1/schemes").json()["data"]) == 18
    rows = client.get("/api/v1/schemes", params={"sector": "pension"}).json()["data"]
    assert rows and all(s["sector"] == "pension" for s in rows)


def test_unknown_scheme_returns_404_envelope() -> None:
    r = client.get("/api/v1/schemes/does-not-exist")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "SCHEME_NOT_FOUND"


def test_eligibility_endpoint() -> None:
    r = client.post("/api/v1/eligibility/check",
                    json={"profile": RAVI, "schemeId": "pm-kisan"})
    assert r.status_code == 200
    assert r.json()["data"]["level"] == "eligible"


def test_recommend_endpoint() -> None:
    r = client.post("/api/v1/eligibility/recommend", json={"profile": RAVI, "limit": 5})
    assert r.status_code == 200
    assert len(r.json()["data"]) <= 5


def test_verify_endpoint() -> None:
    r = client.post("/api/v1/documents/verify",
                    json={"profile": RAVI, "documents": DOCUMENTS})
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["documentsChecked"] == 5
    assert any(i["severity"] == "blocker" for i in data["issues"])


def test_assistant_endpoint() -> None:
    r = client.post("/api/v1/assistant/ask",
                    json={"message": "I lost my job", "profile": RAVI, "locale": "en"})
    assert r.status_code == 200
    assert "job-loss" in r.json()["data"]["detectedEvents"]


def test_validation_error_is_structured() -> None:
    r = client.post("/api/v1/eligibility/check",
                    json={"profile": {**RAVI, "age": 999}})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_unsupported_locale_rejected() -> None:
    r = client.post("/api/v1/assistant/ask",
                    json={"message": "hi", "profile": RAVI, "locale": "fr"})
    assert r.status_code == 422


# ─── Auth boundary ───────────────────────────────────────────────────────────


def test_admin_login_succeeds() -> None:
    r = client.post("/api/v1/auth/admin/login",
                    json={"officerId": "officer", "password": "mitra2026"})
    assert r.status_code == 200
    assert r.json()["data"]["accessToken"]


def test_admin_login_errors_are_generic() -> None:
    """Identical message for unknown account and wrong password — otherwise an
    attacker can enumerate valid government officer IDs."""
    unknown = client.post("/api/v1/auth/admin/login",
                          json={"officerId": "nobody", "password": "whatever"})
    wrong = client.post("/api/v1/auth/admin/login",
                        json={"officerId": "officer", "password": "wrong"})
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json()["error"] == wrong.json()["error"]


def test_admin_route_requires_authentication() -> None:
    assert client.get("/api/v1/admin/insights").status_code in (401, 403)


def test_admin_route_rejects_citizen_token() -> None:
    """A citizen token is signed with a different secret, so it is unverifiable here —
    not merely unauthorised."""
    from app.core.security import create_access_token

    token, _ = create_access_token("u-ravi", "citizen", "citizen", "Ravi Kumar")
    r = client.get("/api/v1/admin/insights", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_admin_insights_with_valid_token() -> None:
    login = client.post("/api/v1/auth/admin/login",
                        json={"officerId": "officer", "password": "mitra2026"})
    token = login.json()["data"]["accessToken"]
    r = client.get("/api/v1/admin/insights", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["data"]["preventableShare"] == 71
