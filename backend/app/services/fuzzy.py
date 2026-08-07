"""Fuzzy matching primitives for Indian identity documents.

Port of frontend/lib/fuzzy.ts, behaviourally identical — the same input must produce
the same verdict on both sides, or a citizen gets different answers from the app and
the API. The shared test vectors in tests/test_engines.py enforce that.

The problem being solved: Indian documents routinely disagree in ways that are not
errors. The same person is "RAVI KUMAR" on Aadhaar, "Ravi Kumar Singh" on a land
record and "Sri Ravikumar" on a certificate. Flagging all of these produces alert
fatigue, and a citizen warned about everything reads nothing.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

Verdict = Literal["match", "likely-match", "mismatch"]


# ─── String distance ─────────────────────────────────────────────────────────


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)

    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        curr = [i]
        for j, cb in enumerate(b, start=1):
            cost = 0 if ca == cb else 1
            curr.append(min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost))
        prev = curr
    return prev[len(b)]


def jaro_winkler(a: str, b: str) -> float:
    """Preferred over Levenshtein for personal names: it rewards a matching prefix,
    which is where Indian name variants agree most."""
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0

    match_window = max(0, max(len(a), len(b)) // 2 - 1)
    a_matches = [False] * len(a)
    b_matches = [False] * len(b)
    matches = 0

    for i, ca in enumerate(a):
        start = max(0, i - match_window)
        end = min(i + match_window + 1, len(b))
        for j in range(start, end):
            if b_matches[j] or ca != b[j]:
                continue
            a_matches[i] = True
            b_matches[j] = True
            matches += 1
            break

    if matches == 0:
        return 0.0

    transpositions = 0
    k = 0
    for i, ca in enumerate(a):
        if not a_matches[i]:
            continue
        while not b_matches[k]:
            k += 1
        if ca != b[k]:
            transpositions += 1
        k += 1
    transpositions //= 2

    jaro = (
        matches / len(a) + matches / len(b) + (matches - transpositions) / matches
    ) / 3

    prefix = 0
    for i in range(min(4, len(a), len(b))):
        if a[i] == b[i]:
            prefix += 1
        else:
            break

    return jaro + prefix * 0.1 * (1 - jaro)


# ─── Name normalisation ──────────────────────────────────────────────────────

_HONORIFICS = re.compile(
    r"\b(shri|sri|smt|smti|kum|km|mr|mrs|ms|dr|late|s/o|d/o|w/o|c/o)\b\.?",
    re.IGNORECASE,
)

# Longest clusters first: 'ksh' must fold before 'kh' and 'sh' consume its letters,
# or Lakshmi and Laxmi never converge. Found by test, not by inspection.
_TRANSLITERATION_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile("ksh"), "x"),
    (re.compile("ks"), "x"),
    (re.compile("jn"), "gy"),
    (re.compile("ph"), "f"),
    (re.compile("kh"), "k"),
    (re.compile("gh"), "g"),
    (re.compile("th"), "t"),
    (re.compile("dh"), "d"),
    (re.compile("bh"), "b"),
    (re.compile("ch"), "c"),
    (re.compile("sh"), "s"),
    (re.compile("aa"), "a"),
    (re.compile("ee"), "i"),
    (re.compile("ie"), "i"),
    (re.compile("oo"), "u"),
    (re.compile("ou"), "u"),
    # b/v/w are one phoneme class across much of eastern and northern India:
    # the same person is Rabi in Bengali-influenced records and Ravi elsewhere.
    (re.compile("[vwb]"), "v"),
    (re.compile("z"), "j"),
    (re.compile("q"), "k"),
    (re.compile("y$"), "i"),
    (re.compile(r"(.)\1+"), r"\1"),
]


def normalise_name(raw: str) -> str:
    s = _HONORIFICS.sub(" ", raw)
    s = re.sub(r"[^\w\s]", " ", s, flags=re.UNICODE)
    s = re.sub(r"\d", " ", s)
    return re.sub(r"\s+", " ", s).strip().lower()


def phonetic_key(raw: str) -> str:
    s = normalise_name(raw).replace(" ", "")
    for pattern, replacement in _TRANSLITERATION_RULES:
        s = pattern.sub(replacement, s)
    return s


@dataclass
class Comparison:
    score: float
    verdict: Verdict
    note: str


def compare_names(a: str, b: str) -> Comparison:
    """Token-wise so word order and extra surnames do not cause false alarms."""
    na, nb = normalise_name(a), normalise_name(b)

    if not na or not nb:
        return Comparison(0.0, "mismatch", "One of the documents has no readable name.")
    if na == nb:
        return Comparison(1.0, "match", "Names are identical.")

    # Word-boundary variation only: "Ram Dev" vs "Ramdev". Whether a compound given
    # name is written as one word or two is a typing convention, not an identity.
    if phonetic_key(na) == phonetic_key(nb):
        return Comparison(
            1.0, "match", "Same name — the words are only spaced or spelled differently."
        )

    ta = [t for t in na.split(" ") if t]
    tb = [t for t in nb.split(" ") if t]
    short, long = (ta, tb) if len(ta) <= len(tb) else (tb, ta)

    used: set[int] = set()
    total = 0.0
    for token in short:
        best, best_idx = 0.0, -1
        for idx, other in enumerate(long):
            if idx in used:
                continue
            # A single-letter token is an initial: a first-letter match is agreement.
            if len(token) == 1 or len(other) == 1:
                sim = 0.95 if token[0] == other[0] else 0.0
            else:
                sim = max(
                    jaro_winkler(token, other),
                    jaro_winkler(phonetic_key(token), phonetic_key(other)),
                )
            if sim > best:
                best, best_idx = sim, idx
        if best_idx >= 0:
            used.add(best_idx)
        total += best

    token_score = total / len(short)
    extra_tokens = len(long) - len(short)
    # Each unmatched extra token costs a little, never enough alone to fail.
    score = max(0.0, token_score - extra_tokens * 0.06)

    if score >= 0.92:
        note = (
            "Same name — one document includes an extra surname or initial."
            if extra_tokens > 0
            else "Same name, only spelling or case differs."
        )
        return Comparison(score, "match", note)
    if score >= 0.78:
        return Comparison(
            score,
            "likely-match",
            "Names look like the same person but the spelling differs enough to be worth checking.",
        )
    return Comparison(
        score, "mismatch", "These names do not appear to belong to the same person."
    )


# ─── Date normalisation ──────────────────────────────────────────────────────

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


@dataclass
class ParsedDate:
    iso: str
    year_only: bool


def _expand_year(y: str) -> str:
    if len(y) == 4:
        return y
    n = int(y)
    # Two-digit years on identity documents are birth years, so they are in the past.
    return str(1900 + n if n > 30 else 2000 + n)


def parse_indian_date(raw: str) -> ParsedDate | None:
    """Handles the formats that actually appear on Indian documents."""
    s = raw.strip()
    if not s:
        return None

    if re.fullmatch(r"\d{4}", s):
        return ParsedDate(f"{s}-01-01", True)

    named = re.fullmatch(r"(\d{1,2})[\s\-/]*([A-Za-z]{3,})[\s\-/]*(\d{2,4})", s)
    if named:
        mm = _MONTHS.get(named.group(2)[:3].lower())
        if mm:
            return ParsedDate(
                f"{_expand_year(named.group(3))}-{mm:02d}-{int(named.group(1)):02d}", False
            )

    parts = [p for p in re.split(r"[/\-.\s]+", s) if p]
    if len(parts) == 3 and all(p.isdigit() for p in parts):
        if len(parts[0]) == 4:  # ISO
            return ParsedDate(f"{parts[0]}-{int(parts[1]):02d}-{int(parts[2]):02d}", False)
        # Otherwise DD-MM-YYYY; US MM/DD is not used on these documents.
        return ParsedDate(
            f"{_expand_year(parts[2])}-{int(parts[1]):02d}-{int(parts[0]):02d}", False
        )
    return None


def compare_dates(a: str, b: str) -> Comparison:
    pa, pb = parse_indian_date(a), parse_indian_date(b)
    if not pa or not pb:
        return Comparison(0.0, "mismatch", "One of the dates could not be read clearly.")
    if pa.iso == pb.iso:
        return Comparison(1.0, "match", "Dates of birth match exactly.")

    ya, ma, da = (int(x) for x in pa.iso.split("-"))
    yb, mb, db = (int(x) for x in pb.iso.split("-"))

    # A year-only record cannot disagree about day and month.
    if (pa.year_only or pb.year_only) and ya == yb:
        return Comparison(
            0.9, "likely-match", "Years match; one document records only the year of birth."
        )
    # Day and month swapped — a data-entry error, not a different person.
    if ya == yb and ma == db and da == mb:
        return Comparison(
            0.72, "likely-match", "Day and month appear swapped between the two documents."
        )
    if ya == yb and ma == mb:
        return Comparison(
            0.6, "mismatch", f"Same month and year, but the day differs ({da} vs {db})."
        )
    if ya == yb:
        return Comparison(0.4, "mismatch", "Same birth year but a different day and month.")

    diff = abs(ya - yb)
    return Comparison(
        0.0, "mismatch", f"Birth years differ by {diff} year{'s' if diff > 1 else ''}."
    )


# ─── Address normalisation ───────────────────────────────────────────────────

_ADDRESS_ABBREVIATIONS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(rd|rd\.)\b", re.I), "road"),
    (re.compile(r"\b(st|st\.)\b", re.I), "street"),
    (re.compile(r"\b(nr|nr\.)\b", re.I), "near"),
    (re.compile(r"\b(opp|opp\.)\b", re.I), "opposite"),
    (re.compile(r"\b(vill|vill\.|vlg)\b", re.I), "village"),
    (re.compile(r"\b(dist|dist\.|distt)\b", re.I), "district"),
    (re.compile(r"\b(teh|teh\.|tehsil|tal|taluka)\b", re.I), "tehsil"),
    (re.compile(r"\b(po|p\.o\.)\b", re.I), "post office"),
    (re.compile(r"\b(ps|p\.s\.)\b", re.I), "police station"),
    (re.compile(r"\b(hno|h\.no\.|house no|hse no)\b", re.I), "house number"),
    (re.compile(r"\b(apt|apt\.)\b", re.I), "apartment"),
    (re.compile(r"\b(bldg|bldg\.)\b", re.I), "building"),
    (re.compile(r"\b(ngr)\b", re.I), "nagar"),
    (re.compile(r"\b(col|colony)\b", re.I), "colony"),
]


def extract_pincode(raw: str) -> str | None:
    m = re.search(r"\b([1-9]\d{5})\b", raw)
    return m.group(1) if m else None


def normalise_address(raw: str) -> str:
    s = raw.lower()
    for pattern, replacement in _ADDRESS_ABBREVIATIONS:
        s = pattern.sub(replacement, s)
    s = re.sub(r"[^\w\s]", " ", s, flags=re.UNICODE)
    return re.sub(r"\s+", " ", s).strip()


def compare_addresses(a: str, b: str) -> Comparison:
    """PIN code is the decisive signal — the same address is written at wildly
    different levels of detail across documents."""
    pin_a, pin_b = extract_pincode(a), extract_pincode(b)
    na, nb = normalise_address(a), normalise_address(b)

    if not na or not nb:
        return Comparison(0.0, "mismatch", "One of the documents has no readable address.")

    set_a = {w for w in na.split() if len(w) > 2}
    set_b = {w for w in nb.split() if len(w) > 2}
    overlap = len(set_a & set_b) / max(1, min(len(set_a), len(set_b)))

    if pin_a and pin_b and pin_a != pin_b:
        return Comparison(
            min(overlap, 0.5),
            "mismatch",
            f"PIN codes differ ({pin_a} vs {pin_b}) — these look like different addresses.",
        )
    if pin_a and pin_b and pin_a == pin_b and overlap >= 0.5:
        return Comparison(0.95, "match", "Same PIN code and matching locality details.")
    if overlap >= 0.75:
        return Comparison(overlap, "match", "Addresses agree on all the key details.")
    if overlap >= 0.45:
        return Comparison(
            overlap,
            "likely-match",
            "Addresses broadly agree but one is written in more detail than the other.",
        )
    return Comparison(
        overlap, "mismatch", "Addresses do not appear to describe the same place."
    )


# ─── Identifiers ─────────────────────────────────────────────────────────────


def normalise_id_number(raw: str) -> str:
    return re.sub(r"[\s\-]", "", raw).upper()


def compare_id_numbers(a: str, b: str) -> tuple[bool, str]:
    na, nb = normalise_id_number(a), normalise_id_number(b)
    if na == nb:
        return True, "Identifiers match."
    # Compare only the visible tail when one side is masked (XXXX XXXX 1234).
    if re.match(r"^[X*]+", na) or re.match(r"^[X*]+", nb):
        if na[-4:] == nb[-4:]:
            return True, "Last four digits match on a masked identifier."
    return False, "Identifiers do not match."
