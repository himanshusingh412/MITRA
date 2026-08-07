"""Pre-application document verification.

Port of frontend/lib/documentVerification.ts.

Around 71% of welfare rejections are clerical: a name spelled differently across two
documents, a lapsed certificate, a transposed date of birth. The citizen finds out
weeks later, after the application has already failed. This runs *before* submission
and converts each inconsistency into a specific correction they can make now.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from app.services.fuzzy import (
    Comparison,
    compare_addresses,
    compare_dates,
    compare_id_numbers,
    compare_names,
    parse_indian_date,
)

FieldKey = Literal["name", "dob", "address", "gender", "idNumber", "fatherName"]
Severity = Literal["blocker", "warning", "info"]

FIELDS: list[str] = ["name", "dob", "address", "gender", "idNumber", "fatherName"]

FIELD_LABEL = {
    "name": "Name",
    "dob": "Date of birth",
    "address": "Address",
    "gender": "Gender",
    "idNumber": "ID number",
    "fatherName": "Father's / husband's name",
}

# Documents are trusted unevenly. Aadhaar is the de-facto spine of Indian identity,
# so when documents disagree the Aadhaar value is normally the one to correct towards.
DOCUMENT_AUTHORITY = {
    "aadhaar": 100, "birth-cert": 90, "passport": 88, "pan": 85, "death-cert": 80,
    "voter-id": 70, "disability-cert": 70, "driving-license": 65, "caste-cert": 60,
    "ration-card": 55, "income-cert": 55, "marksheet": 50, "school-cert": 50,
    "bank-passbook": 45, "land-record": 45,
}

# Each document carries its own identifier under a different scheme — an Aadhaar number
# and a PAN are *supposed* to differ. Comparing them across types would report a
# mismatch for every citizen, which is noise, not signal.
_AADHAAR_LINKED = {"aadhaar", "bank-passbook", "ration-card", "job-card"}


def _authority(doc_type: str) -> int:
    return DOCUMENT_AUTHORITY.get(doc_type, 40)


def _comparable_identifiers(type_a: str, type_b: str) -> bool:
    if type_a == type_b:
        return True
    return type_a in _AADHAAR_LINKED and type_b in _AADHAAR_LINKED


def _format_date(iso: str) -> str:
    y, m, d = iso.split("-")
    return f"{d}/{m}/{y}"


def extract_fields(doc: dict[str, Any]) -> dict[str, str]:
    """INTEGRATION SEAM — OCR.

    In the prototype, fields are already present on the record. In production this is
    replaced by a Google Vision / Tesseract call; nothing downstream changes because
    the return shape is identical.
    """
    ex = doc.get("extracted") or {}
    return {k: v for k, v in ex.items() if k in FIELDS and v}


def import_from_digilocker(owner_id: str, available: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """INTEGRATION SEAM — DigiLocker.

    Real integration swaps this for the Issued Documents API. Documents arriving this
    way are digitally signed at source, so they are marked verified and treated as
    authoritative during conflict resolution.
    """
    return [
        {**d, "verified": True, "source": "digilocker"}
        for d in available
        if d.get("ownerId") == owner_id
    ]


def _compare_field(field: str, a: str, b: str) -> Comparison:
    if field in ("name", "fatherName"):
        return compare_names(a, b)
    if field == "dob":
        return compare_dates(a, b)
    if field == "address":
        return compare_addresses(a, b)
    if field == "idNumber":
        ok, note = compare_id_numbers(a, b)
        return Comparison(1.0 if ok else 0.0, "match" if ok else "mismatch", note)
    if field == "gender":
        same = a.strip().lower()[:1] == b.strip().lower()[:1]
        return Comparison(
            1.0 if same else 0.0,
            "match" if same else "mismatch",
            "Gender matches." if same else "Gender differs between documents.",
        )
    return Comparison(0.0, "mismatch", "Field could not be compared.")


def _resolve_canonical(field: str, docs: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Chooses the value to trust, weighting each document's vote by how authoritative
    that document type is."""
    entries = [
        (d, extract_fields(d).get(field))
        for d in docs
        if extract_fields(d).get(field)
    ]
    entries = [(d, v) for d, v in entries if v]
    if not entries:
        return None

    best_doc, best_value, best_weight = entries[0][0], entries[0][1], -1.0

    for doc, value in entries:
        weight = float(_authority(doc.get("type", ""))) + (25 if doc.get("verified") else 0)
        for other_doc, other_value in entries:
            if other_doc is doc:
                continue
            cmp = _compare_field(field, value, other_value)
            if cmp.verdict == "match":
                weight += _authority(other_doc.get("type", "")) * 0.5
            elif cmp.verdict == "likely-match":
                weight += _authority(other_doc.get("type", "")) * 0.2
        if weight > best_weight:
            best_weight, best_doc, best_value = weight, doc, value

    agreeing = sum(
        1 for _, v in entries if _compare_field(field, best_value, v).verdict != "mismatch"
    )
    return {
        "value": best_value,
        "sourceDocId": best_doc["id"],
        "agreement": round(agreeing / len(entries) * 100),
    }


def _suggestion_for(
    field: str,
    doc_a: dict[str, Any],
    doc_b: dict[str, Any],
    value_a: str,
    value_b: str,
    canonical: str | None,
) -> tuple[str, str | None]:
    auth_a, auth_b = _authority(doc_a.get("type", "")), _authority(doc_b.get("type", ""))
    trusted, to_fix = (doc_a, doc_b) if auth_a >= auth_b else (doc_b, doc_a)
    trusted_value = value_a if auth_a >= auth_b else value_b
    t_name, f_name = trusted.get("name", "a document"), to_fix.get("name", "a document")

    if field in ("name", "fatherName"):
        return (
            f'Get the name on your {f_name} corrected to match your {t_name} — "{trusted_value}". '
            f"Most departments accept the {t_name} spelling as the correct one. You can request "
            "this correction at a Common Service Centre.",
            canonical or trusted_value,
        )
    if field == "dob":
        parsed = parse_indian_date(trusted_value)
        shown = f" ({_format_date(parsed.iso)})" if parsed else ""
        return (
            f"Your {f_name} shows a different date of birth. Apply for a correction so it matches "
            f"your {t_name}{shown}. Submitting with mismatched dates is one of the most common "
            "reasons applications are rejected.",
            canonical or trusted_value,
        )
    if field == "address":
        return (
            f"Update the address on your {f_name} to match your {t_name}. If you have moved "
            "recently, update the older document first — scheme verification uses your current "
            "address.",
            canonical or trusted_value,
        )
    if field == "gender":
        return (
            f"The gender recorded on your {f_name} does not match your {t_name}. This will block "
            "verification — get it corrected before you apply.",
            canonical or trusted_value,
        )
    if field == "idNumber":
        return (
            f"The ID number linked on your {f_name} does not match. Re-check the number and "
            "re-link it, as payments are released against this identifier.",
            canonical or trusted_value,
        )
    return ("Check this field across both documents and correct the older one.", None)


def verify_document_set(
    profile: dict[str, Any],
    documents: list[dict[str, Any]],
    scheme: dict[str, Any] | None = None,
) -> dict[str, Any]:
    owner_id = profile.get("id")
    docs = [d for d in documents if d.get("ownerId") == owner_id]
    issues: list[dict[str, Any]] = []
    fields_compared = 0

    # 1. Compare every document against every other, field by field.
    for field in FIELDS:
        for i in range(len(docs)):
            for j in range(i + 1, len(docs)):
                a = extract_fields(docs[i]).get(field)
                b = extract_fields(docs[j]).get(field)
                if not a or not b:
                    continue
                if field == "idNumber" and not _comparable_identifiers(
                    docs[i].get("type", ""), docs[j].get("type", "")
                ):
                    continue

                fields_compared += 1
                cmp = _compare_field(field, a, b)
                if cmp.verdict == "match":
                    continue

                canonical_entry = _resolve_canonical(field, docs)
                canonical = canonical_entry["value"] if canonical_entry else None
                text, recommended = _suggestion_for(
                    field, docs[i], docs[j], a, b, canonical
                )
                severity: Severity = (
                    "blocker"
                    if cmp.verdict == "mismatch" and field != "address"
                    else "warning"
                )
                issues.append({
                    "id": f"{field}-{docs[i]['id']}-{docs[j]['id']}",
                    "severity": severity,
                    "field": field,
                    "documentIds": [docs[i]["id"], docs[j]["id"]],
                    "title": (
                        f"{FIELD_LABEL[field]} differs between "
                        f"{docs[i].get('name', 'a document')} and {docs[j].get('name', 'a document')}"
                    ),
                    "detail": (
                        f'{docs[i].get("name", "A document")} says "{a}", '
                        f'{docs[j].get("name", "another")} says "{b}". {cmp.note}'
                    ),
                    "suggestion": text,
                    "recommendedValue": recommended,
                    "confidence": round((1 - cmp.score) * 100),
                })

    # 2. Resolve the value to trust for each field.
    canonical_values: dict[str, Any] = {}
    for field in FIELDS:
        resolved = _resolve_canonical(field, docs)
        if resolved:
            canonical_values[field] = resolved

    # 3. Compare trusted values against what the citizen typed into their profile.
    if "name" in canonical_values:
        cmp = compare_names(canonical_values["name"]["value"], profile.get("name", ""))
        if cmp.verdict == "mismatch":
            issues.append({
                "id": "profile-name-mismatch",
                "severity": "warning",
                "field": "name",
                "documentIds": [canonical_values["name"]["sourceDocId"]],
                "title": "Your profile name does not match your documents",
                "detail": (
                    f'Your documents consistently show "{canonical_values["name"]["value"]}" '
                    f'but your MITRA profile says "{profile.get("name", "")}".'
                ),
                "suggestion": (
                    f'Update your MITRA profile to "{canonical_values["name"]["value"]}" so that '
                    "auto-filled forms match your documents exactly."
                ),
                "recommendedValue": canonical_values["name"]["value"],
                "confidence": round((1 - cmp.score) * 100),
            })

    # 4. Expiry checks.
    now = datetime.now(timezone.utc)
    for doc in docs:
        expires_at = doc.get("expiresAt")
        if not expires_at:
            continue
        try:
            expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        except ValueError:
            continue
        days_left = (expiry - now).days
        if days_left < 0:
            issues.append({
                "id": f"expired-{doc['id']}",
                "severity": "blocker",
                "field": "idNumber",
                "documentIds": [doc["id"]],
                "title": f"{doc.get('name', 'A document')} has expired",
                "detail": (
                    f"It lapsed {abs(days_left)} days ago, on "
                    f"{_format_date(expiry.date().isoformat())}."
                ),
                "suggestion": (
                    f"Apply for a fresh {doc.get('name', 'document').lower()} before you submit. "
                    "Most departments reject applications carrying an expired certificate outright."
                ),
                "recommendedValue": None,
                "confidence": 100,
            })
        elif days_left < 90:
            issues.append({
                "id": f"expiring-{doc['id']}",
                "severity": "warning",
                "field": "idNumber",
                "documentIds": [doc["id"]],
                "title": f"{doc.get('name', 'A document')} expires in {days_left} days",
                "detail": (
                    f"Valid until {_format_date(expiry.date().isoformat())}. Processing takes time, "
                    "and it may still be under review when the certificate lapses."
                ),
                "suggestion": "Renew it now so the certificate stays valid through the whole review period.",
                "recommendedValue": None,
                "confidence": 90,
            })

    # 5. Scheme completeness.
    if scheme:
        held = {d.get("type") for d in docs}
        for req in scheme["documents"]:
            if req["id"] not in held:
                issues.append({
                    "id": f"missing-{req['id']}",
                    "severity": "blocker",
                    "field": "idNumber",
                    "documentIds": [],
                    "title": f"{req['name']} is missing",
                    "detail": f"{scheme['shortName']} requires this document and it is not in your vault yet.",
                    "suggestion": (
                        f"Upload your {req['name'].lower()}, or fetch it from DigiLocker if it is "
                        "already issued digitally."
                    ),
                    "recommendedValue": None,
                    "confidence": 100,
                })

    blockers = sum(1 for i in issues if i["severity"] == "blocker")
    warnings = sum(1 for i in issues if i["severity"] == "warning")

    if fields_compared == 0:
        consistency = 100 if docs else 0
    else:
        consistency = max(0, round(100 - (blockers * 18 + warnings * 7)))

    if not docs:
        summary = (
            "No documents uploaded yet. Add your documents and MITRA will cross-check them "
            "before you apply."
        )
    elif blockers:
        summary = (
            f"{blockers} issue{'s' if blockers > 1 else ''} will very likely cause a rejection. "
            f"Fix {'these' if blockers > 1 else 'this'} before submitting."
        )
    elif warnings:
        summary = (
            f"Your documents broadly agree. {warnings} minor point"
            f"{'s are' if warnings > 1 else ' is'} worth correcting to be safe."
        )
    else:
        summary = f"All {len(docs)} documents agree with each other. You are ready to submit."

    order = {"blocker": 0, "warning": 1, "info": 2}
    issues.sort(key=lambda i: (order[i["severity"]], -i["confidence"]))

    return {
        "documentsChecked": len(docs),
        "fieldsCompared": fields_compared,
        "consistencyScore": consistency,
        "readyToSubmit": blockers == 0 and len(docs) > 0,
        "issues": issues,
        "canonicalValues": canonical_values,
        "summary": summary,
    }
