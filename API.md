# API

**MITRA REST API** · FastAPI · `/api/v1`

Interactive docs run at `/docs` (Swagger) and `/redoc` once the server is up. This
document is the reference; the OpenAPI schema is generated from the code, so the two
cannot drift.

---

## Run it

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

No API keys, no database, no external services. All reasoning is local.

```bash
python -m pytest -q        # 77 tests
```

## Design

**Response envelope** — every response, success or failure:

```json
{ "data": {}, "error": null, "meta": {} }
```

**Errors** carry a machine-readable `code` plus a human message. Stack traces never
cross the boundary.

```json
{ "data": null, "error": { "code": "SCHEME_NOT_FOUND", "message": "That scheme is not in the catalogue." }, "meta": {} }
```

| Status | Meaning |
|---|---|
| 400 | Malformed request |
| 401 | Not authenticated, or token invalid/expired |
| 403 | Authenticated but not permitted |
| 404 | Resource does not exist |
| 422 | Validation failed — `error.field` names the offending field |
| 429 | Rate limited |
| 500 | Server fault (generic message; detail is logged, not returned) |

**Single source of truth.** The scheme catalogue is authored in
`frontend/lib/schemes.ts` and exported to `shared/schemes.json`, which this API reads.
There is no second copy of the eligibility criteria — two copies would drift, and drift
here means the app and the API telling a citizen different things about their money.

Regenerate with `cd frontend && npx tsx scripts/exportSchemes.ts`.

---

## Endpoints

### `GET /health`
Liveness plus catalogue version and scheme count.

```json
{ "data": { "status": "ok", "version": "1.0.0", "catalogueVersion": 1, "schemes": 18 } }
```

---

### `GET /schemes`
List the catalogue. Query: `sector`, `q` (free-text over name, ministry and tagline).

`meta` carries `total` and the `sectors` label map.

### `GET /schemes/{scheme_id}`
One scheme, including its rule set and document requirements. `404` if unknown.

---

### `POST /eligibility/check`

Evaluates a profile. Omit `schemeId` to evaluate all 18 at once.

```json
{
  "profile": {
    "id": "u-ravi", "name": "Ravi Kumar", "age": 34, "gender": "male",
    "state": "Bihar", "district": "Muzaffarpur", "area": "rural",
    "occupation": "farmer", "annualIncome": 148000, "category": "obc",
    "familySize": 5, "hasDisability": false, "landHoldingHectares": 1.2,
    "existingBenefits": [], "lifeEvents": ["farming-season"]
  },
  "schemeId": "pm-kisan"
}
```

```json
{
  "data": {
    "schemeId": "pm-kisan",
    "level": "eligible",
    "score": 100,
    "passed": [{ "label": "You are a farmer with cultivable land", "passed": true, "soft": false }],
    "failed": [],
    "reason": "You meet all 4 criteria we can check for this scheme."
  }
}
```

`level` is one of `eligible`, `verify`, `not-eligible`.

**Why three levels.** A failing *numeric threshold* (income ceiling, age band) returns
`verify`, because states set these differently and it is worth the citizen checking. A
failing *categorical* rule — rural citizen against an urban-only scheme — returns
`not-eligible`, because sending someone to a Common Service Centre for a scheme they
cannot get costs them a day's wage and a bus fare.

`passed` and `failed` are returned in full. A citizen refused a benefit has a right to
know which criterion failed, and an auditor has a right to reproduce the decision.

---

### `POST /eligibility/recommend`

Ranked recommendations. Body: `profile`, `limit` (1–50, default 10), `sector`,
`includeIneligible`.

Ranking: `levelWeight + matchScore + lifeEventBoost − alreadyHeldPenalty`. A declared
life event boosts related schemes by 200, so someone who just lost their job sees
employment support above a savings scheme they also qualify for. Benefits already held
are demoted by 900.

### `POST /eligibility/checklist/{scheme_id}`

Personalised document checklist. Body: `profile`, `documents`.

Conditional documents are only included when their predicate matches this citizen — a
generic list that asks for paperwork you do not need is why people give up.

Each item: `{ id, name, status: "have" | "missing" | "expiring", detail }`.

---

### `POST /documents/verify`

**The pre-application check.** Compares every document against every other one and
returns actionable corrections. Optional `schemeId` adds a completeness check.

```json
{
  "data": {
    "documentsChecked": 5,
    "fieldsCompared": 31,
    "consistencyScore": 68,
    "readyToSubmit": false,
    "issues": [
      {
        "id": "expired-d-income-ravi",
        "severity": "blocker",
        "field": "idNumber",
        "documentIds": ["d-income-ravi"],
        "title": "Income Certificate has expired",
        "detail": "It lapsed 35 days ago, on 03/07/2026.",
        "suggestion": "Apply for a fresh income certificate before you submit. Most departments reject applications carrying an expired certificate outright.",
        "recommendedValue": null,
        "confidence": 100
      }
    ],
    "canonicalValues": {
      "name": { "value": "Ravi Kumar", "sourceDocId": "d-aadhaar-ravi", "agreement": 100 }
    },
    "summary": "1 issue will very likely cause a rejection. Fix this before submitting."
  }
}
```

`severity`: `blocker` (will very likely cause rejection), `warning`, `info`. Blockers
sort first.

`canonicalValues` are what MITRA will auto-fill into forms — taken from the most
authoritative document rather than what the citizen typed, because the department
verifies against documents.

**What it deliberately does not flag.** Transliteration variants (Rabi/Ravi,
Lakshmi/Laxmi), spacing variants (Ram Dev/Ramdev), honorifics, extra surnames, date
format differences, and identifiers from different schemes (a PAN is *supposed* to
differ from an Aadhaar). A checker that warns about everything gets ignored, and then
it protects nobody.

---

### `POST /assistant/ask`

Body: `message` (1–2000 chars), `profile`, `locale` (`en`, `hi`, `bn`, `ta`, `mr`).
Rate limited to 60/min per IP.

```json
{
  "data": {
    "text": "आपने पढ़ाई शुरू करने का ज़िक्र किया, इसलिए पहले ये योजनाएँ देखिए:",
    "schemeRefs": ["post-matric-scholarship", "pre-matric-scholarship"],
    "actions": [{ "label": "See all matches", "href": "/schemes" }],
    "detectedEvents": ["started-studies"]
  }
}
```

Deterministic — identical input always returns identical output. A citizen who asks
twice and gets different advice has no reason to trust either answer.

Grounded — `schemeRefs` can only contain catalogue IDs, so the assistant cannot invent
a scheme or a benefit amount. This is asserted in the test suite.

---

### `POST /auth/admin/login`

Body: `officerId`, `password`. Rate limited to 10/hour per IP.

Returns `accessToken` (JWT, 15 min), `expiresIn`, `role`, `name`.

Prototype credentials: `officer` / `mitra2026`.

**Authentication errors are deliberately identical** — the same code, message and
timing whether the account is unknown, the password is wrong, or the account is
disabled. Distinguishing them lets an attacker enumerate valid government officer IDs.

### `GET /auth/admin/me`
Current session. Requires a valid admin bearer token.

### `GET /admin/insights`
Aggregate analytics. Requires admin authentication. No citizen identifiers cross this
boundary.

---

## Authentication boundary

Citizen and admin tokens are signed with **different secrets** and carry **different
audiences**:

```
Citizen:  aud = "mitra:citizen",  secret = JWT_CITIZEN_SECRET
Admin:    aud = "mitra:admin",    secret = JWT_ADMIN_SECRET
```

A citizen token presented to an admin route is not merely unauthorised — its signature
**cannot be verified at all**. Token confusion between the two planes is impossible by
construction, rather than by a role check somebody might forget to add. This is
asserted directly in `test_admin_route_rejects_citizen_token`.

## Rate limits

| Endpoint | Limit |
|---|---|
| `POST /auth/admin/login` | 10 / hour / IP |
| `POST /assistant/ask` | 60 / minute / IP |
| Others | 100 / minute / IP |

In-memory sliding window in the prototype; Redis-backed in production, because an
in-memory limiter across three replicas is really a limit of 3×.

## Not yet built

Citizen OAuth login, application CRUD, document upload, notifications and family
endpoints are specified in `database/prisma/schema.prisma` but not implemented — the
prototype's citizen state lives in the frontend. `TESTING.md` §5 states the gaps.
