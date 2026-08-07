# Research: Competitor & Gap Analysis

**Phase 1 deliverable** · MITRA — Bharat Pragati, SIH 2026

---

## 1. The access problem, stated precisely

India's welfare architecture is not short of schemes. It is short of a **discovery-to-delivery layer**. A citizen who is fully entitled to a benefit must independently:

1. Learn the scheme exists.
2. Work out whether they qualify, from criteria written in administrative language.
3. Identify which documents apply *to them* out of a generic list.
4. Confirm those documents are valid, unexpired and mutually consistent.
5. Find the right portal, in the right language, and complete the form.
6. Track it, and know what to do when it stalls.

Each step loses people. The scheme itself is never the bottleneck — steps 1, 3 and 4 are.

## 2. What already exists, and where each stops

| Platform | What it does well | Where it stops |
|---|---|---|
| **UMANG** | Aggregates 1,700+ services from many departments into one app; genuinely broad. | Organised **by department**, not by citizen situation. You must already know which service you want. No eligibility reasoning — it will happily let you open a form you cannot qualify for. |
| **MyScheme** | Genuine eligibility filtering by attributes; a real step forward on discovery. | Form-driven, not conversational: the citizen must know their own attributes in the system's vocabulary. Discovery ends at the scheme page — no document checking, no application tracking, no follow-through. |
| **DigiLocker** | Authoritative, digitally signed documents; solves document *availability*. | Solves availability, not **consistency**. It will store an Aadhaar and a marksheet that disagree about your date of birth and never mention it. No link between the documents you hold and the schemes you might want. |
| **MyGov** | Engagement, consultation, campaigns. | Not a service-delivery channel. Informational. |
| **CSC network** | Human help, essential for last-mile and low-literacy citizens; high trust. | Requires travel, costs money, queues, and quality varies by operator. The operator has no tool that reasons about eligibility either. |
| **NSP (scholarships)** | Deep, well-run vertical for one domain. | Single-domain and deadline-driven. A family managing a scholarship, a pension and a health card deals with three unconnected systems. |
| **e-Shram** | Registration and identity for unorganised workers at scale. | A registry, not an assistant. |

## 3. The gap

Every existing platform is organised around **the government's structure** — department, scheme, portal. None is organised around **the citizen's life**.

Concretely, nothing in the current landscape does the following:

1. **Accepts a life situation as the input.** "I lost my job", "my daughter is starting college" — not a dropdown of scheme categories.
2. **Explains a verdict.** Existing tools return a filtered list. None shows *which criterion* you met or missed, so a citizen cannot tell whether to appeal, wait, or correct something.
3. **Checks documents against each other before submission.** This is the single largest preventable failure and no platform does it.
4. **Holds the whole household.** Benefits are managed at family level; every tool is single-account.
5. **Follows through.** Discovery and application are separate systems; nothing carries a citizen from "what am I entitled to" to "it has been paid".

## 4. The rejection finding

The most actionable research result is that **most rejections are clerical, not eligibility failures**. Across the districts modelled:

| Cause | Share |
|---|---|
| Name mismatch across documents | 31% |
| Expired supporting certificate | 22% |
| Date of birth inconsistency | 18% |
| Incomplete document set | 14% |
| Address mismatch | 10% |
| Other | 5% |

**71% of rejections come from documents disagreeing with each other or having lapsed.** These citizens qualified. Their paperwork did not agree with itself, and nobody told them until after the application failed.

This is why MITRA's document verification runs *before* submission rather than being a passive vault. It is also the highest-leverage intervention available, because it requires no policy change — only a check that currently nobody performs.

### Why fuzzy matching is required, not optional

A naive equality check produces false alarms on almost every Indian document set, because legitimate variation is the norm:

- **Transliteration has no standard.** रवि is romanised Ravi or Rabi; लक्ष्मी is Lakshmi or Laxmi. Both are correct.
- **Compound names split unpredictably.** "Ram Dev" and "Ramdev" are the same name.
- **Honorifics leak into name fields.** "Shri Ravi Kumar" on one record, "Ravi Kumar" on another.
- **Surnames appear inconsistently.** Aadhaar may carry two tokens where a land record carries three.
- **Date formats vary.** DD/MM/YYYY, YYYY-MM-DD, "12 Jan 1998", and year-only records on older Aadhaar.
- **Identifiers differ by design.** A PAN and an Aadhaar number *should* be different; comparing them would flag every citizen.

A checker that flags all of these produces alert fatigue, and a citizen who is warned about everything reads nothing. MITRA's matcher folds harmless variation and surfaces only genuine disagreement — a swapped day and month, a different birth year, an expired certificate.

## 5. How MITRA is positioned

MITRA is **not** a replacement for UMANG, DigiLocker or the CSC network. It is the reasoning and guidance layer that sits above them:

- DigiLocker supplies authoritative documents → MITRA checks them against each other.
- UMANG and departmental portals accept applications → MITRA determines *which* to apply for and prepares the citizen to succeed.
- CSCs provide human help → MITRA gives both citizen and operator a tool that reasons about eligibility.

The differentiator is not the scheme database. It is **explained eligibility reasoning plus pre-submission document consistency**, in the citizen's own language, across the whole household.

## 6. Design consequences

Each finding maps to a decision in the build:

| Finding | Design decision |
|---|---|
| Citizens think in life events, not scheme names | Life-event detection drives recommendation ranking |
| Filtered lists do not tell you why | Every result shows rule-by-rule reasoning |
| 71% of rejections are clerical | Cross-document verification before submission |
| Legitimate spelling variation is the norm | Phonetic folding and token-wise name matching |
| Benefits are managed per household | Family dashboard as a primary surface, not a setting |
| Rules vary by state and change | Eligibility criteria stored as data, never hardcoded |
| Advice can be wrong and a wasted trip is costly | Three-level verdict with an explicit "verify" state |

## 7. Limitations of this research

Rejection-cause figures are representative estimates modelled for the prototype, not audited departmental statistics; the pattern they describe is well documented, but the exact percentages would need validation against real district data during a pilot. The scheme catalogue covers 18 central schemes and does not model state-level variants, which are numerous and materially different in several states. Both are addressed in the pilot plan rather than claimed as solved.
