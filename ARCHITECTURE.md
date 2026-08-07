# Architecture

**Phase 2 deliverable** · MITRA

---

## 1. Design principles

1. **Reasoning is data-driven, not hardcoded.** Eligibility criteria live in a structured catalogue. Adding a scheme is a data change, never a code change.
2. **Every verdict is explainable.** The engine returns the specific rules that produced a result. No screen shows a score without its reasoning.
3. **Vendor independence.** No application code calls an AI vendor SDK directly. The prototype ships a fully deterministic engine and runs with zero API keys.
4. **Citizen and government planes are separate.** Different sessions, different storage keys, different shells, no shared provider.
5. **Degrade, never fail.** Offline, storage-blocked, or provider-down states reduce functionality without breaking the app.

## 2. High-level design

```
┌──────────────────────────────────────────────────────────────┐
│  CLIENTS                                                     │
│  Citizen web (Next.js) · Admin portal · Future mobile/WhatsApp│
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│  PRESENTATION — Next.js App Router                           │
│  Route groups: (citizen) · (admin) · (auth)                  │
│  Design system · i18n · offline cache · a11y layer           │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│  REASONING CORE  ← runs locally in the prototype             │
│                                                              │
│  ┌────────────────┐ ┌──────────────────┐ ┌────────────────┐ │
│  │ Eligibility    │ │ Recommendation   │ │ Life-event     │ │
│  │ engine         │ │ ranking          │ │ detection      │ │
│  └────────────────┘ └──────────────────┘ └────────────────┘ │
│  ┌────────────────┐ ┌──────────────────┐ ┌────────────────┐ │
│  │ Document       │ │ Fuzzy matching   │ │ Assistant      │ │
│  │ verification   │ │ primitives       │ │ (intent)       │ │
│  └────────────────┘ └──────────────────┘ └────────────────┘ │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│  DATA                                                        │
│  Scheme catalogue (rules as data) · Citizen profiles ·       │
│  Documents + OCR fields · Applications · Notifications       │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│  INTEGRATION SEAMS  ← stubbed, clearly marked, swappable     │
│  OCR · DigiLocker · STT/TTS · LLM · Maps · Dept. portals     │
└──────────────────────────────────────────────────────────────┘
```

## 3. The reasoning core

This is where MITRA's value sits. Five modules, each independently testable.

### 3.1 Eligibility engine (`lib/eligibility.ts`)

Evaluates a citizen profile against a scheme's declarative rule set.

- **Rule** = `{ field, op, value, label, soft? }`. Operators: `eq, neq, lte, gte, in, nin, includes, excludes, exists`.
- **Hard rule failure** → not eligible. **Soft rule failure** → downgrade to *verify*.
- **Threshold near-miss handling:** if the single failing rule is a numeric threshold (`lte`/`gte`), the result is *verify*, because states set these differently. A categorical failure (wrong area, wrong gender for a girl-child scheme) is a real disqualification and stays *not eligible* — telling a citizen to "go and check" would waste a trip.
- Returns passed rules, failed rules, a score, and a written reason.

### 3.2 Recommendation ranking

`rank = levelWeight + matchScore + lifeEventBoost − alreadyHeldPenalty`

A declared life event boosts related schemes by 200, so a citizen who just lost their job sees employment support above a savings scheme they also qualify for. Benefits already held are demoted by 900.

### 3.3 Life-event detection

Regex intent patterns over free text, covering inflected forms, Hinglish and transliterated terms. Detected events merge into the profile, so every later recommendation reflects what the citizen just said.

### 3.4 Document verification (`lib/documentVerification.ts`)

The pre-application check. Pipeline:

```
extract fields (OCR seam)
   → compare every document against every other, field by field
   → resolve canonical value per field via authority-weighted vote
   → convert each disagreement into an actionable correction
   → add expiry + completeness checks
   → sort blockers first
```

Two design decisions matter:

- **Authority weighting.** Aadhaar 100, birth certificate 90, PAN 85 … bank passbook 45. When documents disagree, the citizen is told to correct *towards* the more authoritative one. DigiLocker-sourced documents get +25 because they are signed at issue.
- **Identifier scoping.** A PAN and an Aadhaar number are supposed to differ, so identifiers are only compared between documents that should carry the same number. Without this, every citizen gets a false blocker.

### 3.5 Fuzzy matching (`lib/fuzzy.ts`)

Separates harmless variation from real inconsistency:

- **Names** — honorific stripping, transliteration folding (`ksh→x`, `ph→f`, `b/v/w→v`, vowel-length collapse), whole-string phonetic key for spacing variants, then token-wise Jaro-Winkler that tolerates word order and extra surnames.
- **Dates** — parses DD/MM/YYYY, YYYY-MM-DD, two-digit years, named months and year-only records; detects day/month transposition as a distinct, softer case.
- **Addresses** — abbreviation expansion, token overlap, PIN code as the decisive signal.

Ordering matters: `ksh` must fold before `kh` and `sh` consume its letters, or Lakshmi and Laxmi never converge. This was found by test, not by inspection.

## 4. Request flow — "I lost my job"

```
Citizen types into hero input
  → /assistant?q=…
  → detectIntent + detectLifeEvents → 'job-loss'
  → profile updated with the new life event
  → recommendSchemes(profile) re-ranks, boosting employment schemes
  → reply rendered with grounded scheme cards
  → each card carries its eligibility verdict from the same engine
```

The assistant cannot invent a scheme or a benefit amount: every fact in a reply is read from the catalogue.

## 5. Production topology

The prototype's reasoning core runs client-side. In deployment it moves server-side unchanged — the modules are pure functions over data.

```
Vercel edge (Next.js) ──► FastAPI (GCP, India region)
                            ├── PostgreSQL (profiles, applications, documents)
                            ├── Redis (cache, rate limits, reminder queue)
                            ├── Vector store (semantic scheme search)
                            └── Provider adapters: OCR · STT/TTS · LLM · DigiLocker
```

**Why the reasoning stays deterministic even with an LLM available:** eligibility must be auditable and reproducible. An LLM that decides entitlement cannot be explained to a citizen whose application was refused, and cannot be defended to an auditor. The LLM's role is language — translation, plain-language explanation, understanding messy input — while the *verdict* comes from rules. This boundary is deliberate.

## 6. Failure behaviour

| Failure | Behaviour |
|---|---|
| No AI key configured | Full functionality; deterministic engine handles everything |
| Network lost | Cached scheme content readable; banner shown; no silent staleness |
| `localStorage` blocked | App runs; preferences simply do not persist |
| OCR unavailable | Documents still stored; verification reports what it could read |
| Corrupt saved preferences | Caught and ignored; never blocks render |

## 7. Scalability path

Stateless presentation and reasoning layers scale horizontally. Eligibility results cache in Redis keyed by profile hash plus catalogue version. The catalogue is versioned so a rule change invalidates cleanly. Reads move to Postgres replicas; reminder generation runs as a scheduled job rather than on request.

## 8. Known architectural limitations

- The prototype holds all state in React context; there is no persistence layer yet, so refreshing resets application state. The Prisma schema in `DATABASE.md` defines the target model.
- The scheme catalogue models central schemes only. State variants need a rule-inheritance mechanism that does not exist yet.
- Verification compares documents pairwise — O(n²) in documents per citizen. Fine at realistic volumes (under 20 documents), but would need batching if document counts grew substantially.
