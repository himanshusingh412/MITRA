# MITRA — Production Readiness Audit

**Date:** 8 August 2026
**Target reviewed:** `https://frontend-peach-eta-1ngi4ebnwm.vercel.app` (production alias) + working tree at commit `ff517cc`
**Scope:** Structure, functionality, API, security, database, AI, UI/UX, performance, deployment, GitHub, dependencies, code quality, SIH readiness.

Every finding below was reproduced against the running system or the actual source. Nothing is inferred.

---

## Executive summary

MITRA is a genuinely strong prototype. The eligibility engine, the cross-document verification engine and the design system are of a quality well above typical hackathon work, the accessibility fundamentals are real (skip links, `prefers-reduced-motion`, ARIA labels, semantic landmarks), and 79 engine assertions pass. As a demo it is close to excellent.

As a **production deployment it is not safe today.** Four issues are release-blocking, and one of them is a truthfulness problem rather than a purely technical one:

1. Every write API is open to the anonymous internet. I changed the citizen's name from an unauthenticated `curl` on the public URL.
2. The admin portal has no server-side authorisation. I reached the full Government Dashboard as "Super Admin" without a password.
3. The admin password is hardcoded in client JavaScript and printed in the deployed HTML.
4. The interface tells citizens their data never leaves the device, while sending their name, income, caste category, district and disability status to Google.

None of these are hard to fix — roughly a day of focused work clears all four. But they must be fixed before this is public, and #4 must be fixed before it is demonstrated to judges, because it is the kind of claim a judge will test.

**Overall Project Score: 61 / 100** (Demo quality 88; production readiness 38.)

---

## Severity index

| # | Issue | Severity | Est. fix |
|---|---|---|---|
| C1 | All write APIs unauthenticated | **Critical** | 4h |
| C2 | Admin authorisation is client-side only | **Critical** | 3h |
| C3 | Admin credentials hardcoded in shipped bundle | **Critical** | 1h |
| C4 | False privacy claim — PII sent to Google while UI says otherwise | **Critical** | 2h |
| H1 | AI endpoint is an open, unmetered spend proxy | High | 2h |
| H2 | No rate limiting anywhere in production path | High | 3h |
| H3 | Upstream error text leaked to clients | High | 15m |
| H4 | 3 high-severity dependency CVEs (postcss, sharp) | High | 1h |
| H5 | Docs assert security controls that do not exist | High | 2h |
| M1 | ~2,950 lines of duplicated engine logic, unreachable and untested for parity | Medium | — |
| M2 | Roadmap/TASKS status contradicts the repository | Medium | 30m |
| M3 | `npm run lint` is unconfigured and hangs | Medium | 20m |
| M4 | No `maxDuration`/timeout on AI route | Medium | 30m |
| M5 | No input length cap on assistant | Medium | 20m |
| M6 | Prisma schema duplicated in two locations | Medium | 20m |
| M7 | CI secret scan misses `frontend/.env` | Medium | 10m |
| M8 | Unused dependency `framer-motion` (~110 kB) | Medium | 10m |
| M9 | No `vercel.json`; no CSP header | Medium | 1h |
| L1 | Stale comment in `next.config.mjs` | Low | 5m |
| L2 | `DEMO_CITIZEN_ID` marked Sensitive in Vercel unnecessarily | Low | 5m |
| L3 | Bundle ~300 kB First Load JS on a rural-3G target | Low | 3h |

---

## PHASE 1 — Project structure

**Verified:** 102 tracked files, clean `frontend / backend / database / docs / shared` separation, `@/*` alias resolves, no broken imports, no circular imports found, `tsconfig.json` is strict and correct, `.gitignore` correctly covers `.env`, `.env.*`, `node_modules`, `.next`, `venv`.

### M1 — Duplicated engine logic, unreachable and unverified

**Location:** `frontend/lib/{eligibility,documentVerification,fuzzy,assistant}.ts` vs `backend/app/services/{eligibility,document_verification,fuzzy,assistant}.py`

| Module | TypeScript | Python |
|---|---|---|
| eligibility | 207 | 224 |
| documentVerification | 479 | 389 |
| fuzzy | 435 | 382 |
| assistant | 449 | 385 |

**Why it matters.** `backend/main.py` states the catalogue is generated into `shared/schemes.json` "so the app and the API can never disagree about a citizen's entitlement." That guarantee covers the *data* but not the *rules* — the rules are hand-reimplemented in two languages with no cross-language parity test. Grep confirms the frontend never calls the backend (no `NEXT_PUBLIC_API`, no `localhost:8000`, no fetch to any FastAPI route). So today the Python engine is 1,380 lines of dead code that cannot be exercised by the product, yet an SIH judge reading `ARCHITECTURE.md` will believe it is live.

**Reproduce.** `grep -rn "localhost:8000\|NEXT_PUBLIC_API" frontend/` → no results.

**Fix.** Pick one. Either (a) delete the Python engines and present the backend honestly as a future service, or (b) deploy FastAPI and have the frontend call it, adding a golden-file test that runs the same fixtures through both. Do not ship both silently.

**Priority:** P2 · **Est:** 4h (a) / 2d (b)

### M2 — Roadmap contradicts the repository

**Location:** `ROADMAP.md`, `TASKS.md`

Both mark Phase 0 as the only completed phase and Phases 1–12 "Not started". The repo already contains `ARCHITECTURE.md`, `API.md` (Phase 2), `UI_GUIDELINES.md` (Phase 3), `database/prisma/schema.prisma` (Phase 4), a full backend (Phase 5), a working AI route (Phase 6), the entire citizen frontend (Phase 7), the admin portal (Phase 8), `SECURITY.md` (Phase 9), `TESTING.md` (Phase 10), `DEPLOYMENT.md` (Phase 11) and `DEMO_SCRIPT.md` (Phase 12).

**Why it matters.** A judge who opens `TASKS.md` sees a project claiming 1/13 completion while demoing a finished product. It reads as either careless or as documentation nobody maintains — both damage the "ready for government pilot" positioning the PRD is aiming at.

**Fix.** Update both status tables to reflect reality. 30 minutes, high return.

**Priority:** P1 · **Est:** 30m

---

## PHASE 2 — Functional testing

I clicked through every citizen route on production: Home, Schemes, scheme detail (`/schemes/pm-kisan`), Services, My Applications, Documents, Documents → Verify, Family, Notifications, Settings, Assistant, plus all five admin routes.

**Working correctly:** all sidebar navigation, scheme cards → detail, eligibility panel (4/4 criteria with per-rule explanations), "View your application" → `/applications`, family switcher, notification filters, category/sector filter chips, dark-mode toggle, language selector, voice assistant button, mobile hamburger at 390 px, `documents/verify` (68% consistency, 3 issues, 39 field pairs — genuinely impressive), the AI assistant (real reasoning, correct PM-KISAN eligibility explanation with landholding/income/exclusion breakdown).

**No console errors** on any route. **No hydration warnings.** **No infinite loaders.** **No broken links.** The only 404 I hit was `/my-applications`, which is not a real route — the correct path is `/applications` and nothing links to the wrong one.

### Fixed during this session

Before this audit, **nothing persisted**. All state was in-memory from `lib/demoData.ts`; marking notifications read and reloading restored them. That is now resolved: Neon Postgres is provisioned, seeded, and wired through `/api/bootstrap` + four write routes, verified persisting across hard reloads in production.

### M3 — `npm run lint` is unconfigured

**Location:** `frontend/package.json` → `"lint": "next lint"`

**Reproduce.** `cd frontend && npx next lint` → drops into an interactive "How would you like to configure ESLint?" prompt and never exits.

**Why it matters.** In CI or any non-TTY context this hangs the job until timeout. The script advertises a quality gate that does not exist. Note CI does not currently call it, so this is latent rather than active breakage.

**Fix.** Add `frontend/eslint.config.mjs`:

```js
import js from '@eslint/js';
import next from '@next/eslint-plugin-next';

export default [
  js.configs.recommended,
  { plugins: { '@next/next': next }, rules: { ...next.configs.recommended.rules } },
  { ignores: ['.next/**', 'node_modules/**', 'prisma/**'] },
];
```

Then add `- name: Lint` / `run: npm run lint` to `.github/workflows/ci.yml`.

**Priority:** P2 · **Est:** 20m

### Minor — admin trend chart renders empty

**Location:** `frontend/app/admin/page.tsx:65,70`

The "Applications over time" bars use `style={{ height: '<pct>%' }}`, which requires a parent with a resolved height. In the production screenshot the bars did not render — the chart area was blank with only month labels. Verify the parent container has an explicit height (`h-40` or similar) rather than relying on flex intrinsic sizing.

**Priority:** P2 · **Est:** 20m

---

## PHASE 3 — API audit

Eight endpoints: `/api/bootstrap`, `/api/profile`, `/api/applications`, `/api/applications/[id]`, `/api/documents`, `/api/notifications`, `/api/assistant`, `/api/health`.

| Endpoint | AuthN | AuthZ | Validation | Rate limit | Envelope |
|---|---|---|---|---|---|
| `GET /api/bootstrap` | ✗ none | ✗ none | n/a | ✗ | ✓ |
| `PATCH /api/profile` | ✗ none | ✗ none | ✓ allow-list | ✗ | ✓ |
| `POST /api/applications` | ✗ none | ✗ none | ✓ required fields | ✗ | ✓ |
| `PATCH /api/applications/[id]` | ✗ none | ✗ none | ✓ exists + state | ✗ | ✓ |
| `POST /api/documents` | ✗ none | ✗ none | ⚠ name/type only | ✗ | ✓ |
| `PATCH /api/notifications` | ✗ none | ✗ none | ✓ | ✗ | ✓ |
| `POST /api/assistant` | ✗ none | ✗ none | ✗ **none** | ✗ | ✗ bespoke |
| `GET /api/health` | ✗ none | n/a | n/a | ✗ | ✗ bespoke |

Good: consistent `{data, error, meta}` envelope on the six DB routes, `force-dynamic` correctly set, generic `INTERNAL_ERROR` on unhandled exceptions, no stack traces leaked from DB routes, no secrets in any client bundle except the admin password (C3).

### C1 — Every write API is open to the anonymous internet · **CRITICAL**

**Location:** all routes under `frontend/app/api/`; identity comes from `DEMO_CITIZEN_ID` in `lib/db/client.ts`, never from a request credential.

**Why it matters.** There is no session, no cookie, no token, no ownership check. Any person or bot on the internet can read the citizen's full profile — name, age, income, caste category, district, disability status, and all eleven documents including Aadhaar/PAN extraction fields — and can modify them. For an application whose stated purpose is handling welfare data for vulnerable citizens, this is the most serious possible defect. It is also a DPDP Act exposure the moment a real citizen's data is entered.

**Reproduce** (run from any machine, no credentials):

```bash
curl -X PATCH https://frontend-peach-eta-1ngi4ebnwm.vercel.app/api/profile \
  -H 'Content-Type: application/json' -d '{"name":"AUDIT_PROOF_ANON_WRITE"}'
```

**Observed:** `{"data":{"id":"u-ravi","name":"AUDIT_PROOF_ANON_WRITE",...}}` — HTTP 200, write committed. (I restored the value immediately.)

Reading is equally open: `curl .../api/bootstrap` returns the entire household unauthenticated.

**Fix.** Add real session auth before public exposure. Minimum viable shape:

```ts
// frontend/lib/db/session.ts
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_CITIZEN_SECRET!);

export async function requireCitizen(): Promise<string> {
  const token = (await cookies()).get('mitra_session')?.value;
  if (!token) throw new HttpError('UNAUTHENTICATED', 'Sign in to continue.', 401);
  const { payload } = await jwtVerify(token, secret);
  return payload.sub as string;          // the citizen id — never a client-supplied value
}
```

Then in every route replace `DEMO_CITIZEN_ID` with `await requireCitizen()`, and scope every query by it. Critically, `/api/applications/[id]` and `/api/documents` must also verify **ownership** — that the row's `applicantId`/`ownerId` equals the session subject — or an authenticated citizen can still edit another's application by guessing an id (IDOR).

Interim mitigation if a demo must stay public today: put the whole deployment behind Vercel password protection, or gate writes on a shared secret header.

**Priority:** P0 · **Est:** 4h

### H3 — Upstream error text leaked to clients

**Location:** `frontend/app/api/assistant/route.ts:44-50`

```ts
const errText = await response.text();
return NextResponse.json({ error: `Gemini API error: ${response.status}`, details: errText }, ...);
```

**Why it matters.** Google's error bodies echo request metadata and quota/project details. This contradicts the discipline correctly applied in `backend/main.py` ("Never leak a stack trace to a client") and in your own `lib/db/http.ts`.

**Fix.** Log `errText` server-side; return `{ error: { code: 'AI_UNAVAILABLE', message: 'The assistant is unavailable right now.' } }`.

**Priority:** P1 · **Est:** 15m

### M5 — No input length cap on the assistant

**Reproduce.** Posting a 60,000-character message returns HTTP 200 and is forwarded to Gemini in full (verified: 60,030 bytes uploaded, model answered).

**Fix.** Reject `message.length > 2000` with 422 before calling the model. Also validate `locale` against the `Locale` union rather than interpolating it into the system prompt.

**Priority:** P1 · **Est:** 20m

---

## PHASE 4 — Security review

### C2 — Admin authorisation is client-side only · **CRITICAL**

**Location:** `frontend/components/adminShell.tsx:24-38, 55-60`; no `middleware.ts` exists anywhere in the project.

The only gate is:

```ts
const s = readAdminSession();          // reads window.sessionStorage
if (!s) router.replace('/admin/login');
```

**Why it matters.** `sessionStorage` is attacker-controlled. There is no server-side check on any admin route, and no `middleware.ts` to add one. The admin pages are statically prerendered, so their markup and data ship to anyone who requests them regardless of session state.

**Reproduce** (no password at any point):

1. Open `https://frontend-peach-eta-1ngi4ebnwm.vercel.app/admin` → redirected to `/admin/login`.
2. In DevTools console: `sessionStorage.setItem('mitra.admin.session.v1', JSON.stringify({name:'Unauthenticated Attacker',role:'Super Admin',district:'ALL'}))`
3. Navigate to `/admin`.

**Observed:** full Government Dashboard — 17,080 applications, district breakdown, rejection analytics, complaints — with the sidebar showing *Unauthenticated Attacker · Super Admin · ALL district* and the header badge reading "Restricted — official use only". Screenshot captured during this audit.

**Fix.** Server-enforced sessions. Add `frontend/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_ADMIN_SECRET!);

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/admin')) return NextResponse.next();
  if (req.nextUrl.pathname === '/admin/login') return NextResponse.next();
  const token = req.cookies.get('mitra_admin')?.value;
  if (!token) return NextResponse.redirect(new URL('/admin/login', req.url));
  try {
    await jwtVerify(token, secret);              // signature = the actual gate
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
}

export const config = { matcher: '/admin/:path*' };
```

The cookie must be `httpOnly`, `secure`, `sameSite: 'strict'`. Admin data must then move behind authenticated API routes rather than being bundled from `demoData.ts`.

**Priority:** P0 · **Est:** 3h

### C3 — Admin credentials hardcoded in the shipped bundle · **CRITICAL**

**Location:** `frontend/app/admin/login/page.tsx:38`

```ts
if (officerId.trim().toLowerCase() === 'officer' && password === 'mitra2026') {
```

**Why it matters.** Client-side credential comparison means the credential *is* the bundle. There is no server to keep a secret from the client here — the check itself is public.

**Reproduce.**

```bash
curl -s https://frontend-peach-eta-1ngi4ebnwm.vercel.app/_next/static/chunks/app/admin/login/page-00cc989af9d5d123.js | grep -o '.\{60\}mitra2026.\{20\}'
# "officer"===s.trim().toLowerCase()&&"mitra2026"===n?((0,m.vJ)({nam
```

It is additionally rendered in the page HTML as a visible "Demo credentials: officer / mitra2026" hint.

**Note on intent.** The in-code comment says "Prototype credential check. Production replaces this with the departmental identity provider" — the intent is right and honestly documented. The problem is that this prototype is deployed at a public URL today.

**Fix.** Move verification server-side: `POST /api/admin/login` compares against an Argon2id hash from `process.env`, sets an httpOnly cookie, and returns only success/failure. Keep the deliberately generic error message and the 5-attempt lockout — both are good instincts already present — but enforce the lockout server-side, since the current `attempts` counter is React state and resets on refresh. Keep the on-screen demo hint only if the deployment is password-protected.

**Priority:** P0 · **Est:** 1h

### C4 — The interface makes a false privacy promise · **CRITICAL**

**Location:** `frontend/app/assistant/page.tsx:132` (UI copy) vs `:43` (behaviour); `SECURITY.md:13`; `frontend/next.config.mjs:9`; `README.md:12`

The assistant screen tells the citizen, directly above the chat:

> "Runs entirely on your device — no data leaves MITRA to answer you."

The same screen sends this to Google's `generativelanguage.googleapis.com`:

```ts
body: JSON.stringify({ message: q, profile: user, locale })
```

`profile: user` is the complete `CitizenProfile`: **name, age, gender, state, district, area, occupation, annualIncome, category (caste), familySize, hasDisability, disabilityPercent, landHoldingHectares, existingBenefits, lifeEvents.**

`SECURITY.md` compounds it: *"External data transmission | **None.** All reasoning is local; no API keys, no outbound calls"*. `next.config.mjs` comments *"no external API calls, no API keys"*. `README.md` opens with *"No API keys. No database. No external services."* All four statements are now false — `/api/health` returns `{"aiConfigured":true,"aiModel":"gemini-3.1-flash-lite"}`.

**Why it matters.** This is worse than a technical bug. Telling a vulnerable citizen their caste, income and disability status stay on their device while transmitting them to a third-party US-headquartered model provider is a consent failure, a DPDP Act problem, and — if a judge opens the network tab during your demo — the single fastest way to lose the room. Judges at SIH finals do open network tabs.

**Fix.** Two options, both acceptable; pick deliberately.

- **Honest disclosure (recommended).** Change the copy to *"Answers use a secure cloud AI model. Your profile details are sent to generate a personalised answer."* Update `SECURITY.md`, `README.md` and `next.config.mjs`. Add a settings toggle for "on-device only" that forces the local `ask()` engine.
- **Make the claim true.** Send only the message and a minimised, non-identifying context (age band, rural/urban, occupation) — never name, exact income, or caste — and keep personalisation in the local engine.

Note the local engine already exists and is good (`lib/assistant.ts`, 449 lines, used as the offline fallback), so the second option is realistic.

**Priority:** P0 · **Est:** 2h

### H1 — The AI endpoint is an open, unmetered spend proxy

**Reproduce.**

```bash
curl -X POST https://frontend-peach-eta-1ngi4ebnwm.vercel.app/api/assistant \
  -H 'Content-Type: application/json' -d '{"message":"say the single word OK","profile":{}}'
# {"text":"OK","model":"gemini-3.1-flash-lite"}
```

**Why it matters.** No auth, no rate limit, no origin check, no length cap. Anyone can bill your Gemini key indefinitely, and a scripted loop with 60 KB payloads (see M5) multiplies it. Combined with `/api/health` advertising `aiConfigured:true` and the model name, the endpoint is trivially discoverable.

**Fix.** Require a session (C1), add per-IP rate limiting (H2), cap input length (M5), and set a billing alert on the Google Cloud project today as a stopgap.

**Priority:** P0 · **Est:** 2h

### H2 — No rate limiting in the production path

`backend/app/core/security.py` implements `enforce_rate_limit` — but the FastAPI service is not deployed and the frontend never calls it. Every live endpoint is unthrottled.

**Fix.** `@upstash/ratelimit` with Vercel KV, applied in `middleware.ts`:

```ts
const { success } = await ratelimit.limit(req.ip ?? 'anon');
if (!success) return NextResponse.json(
  { data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests.' }, meta: {} },
  { status: 429 });
```

Suggested: 30 req/min general, 10 req/min on `/api/assistant`.

**Priority:** P1 · **Est:** 3h

### H5 — Documentation asserts controls that do not exist

`SECURITY.md` describes JWT auth, RBAC, rate limiting, CAPTCHA, encryption at rest for PII, and audit logging. In the deployed system: **none of these are active.** There is no JWT issued or verified anywhere in the frontend, no RBAC, no rate limiter, no CAPTCHA, no encryption layer (the `extracted` OCR JSON is stored in plaintext), and no audit log table in the applied schema.

**Why it matters.** A security document that describes intent in the present tense is worse than no document — it stops reviewers looking, and a judge who probes one claim and finds it hollow will distrust the rest of the submission.

**Fix.** Split `SECURITY.md` into "Implemented" and "Designed for pilot" with explicit status per control. This costs two hours and converts a liability into a credibility asset.

**Priority:** P1 · **Est:** 2h

### Secrets and git hygiene — clean ✓

- `git ls-files | grep -iE "\.env|secret|credential|\.pem|\.key"` → only `.env.example`. No credential is committed.
- `node_modules`, `.next`, `venv` → 0 tracked files.
- Root `.gitignore` covers `.env` and `.env.*` at any depth, so `frontend/.env` (which now holds the Neon URL) is correctly ignored — verified.
- CI has a real secret-scanning gate with sensible patterns (`AIza…`, `sk-…`, PEM, `AKIA…`).

**M7 — CI secret scan gap.** The "Verify .env is not tracked" step only checks the repository root. `frontend/.env` now contains the live Neon credential and would not be caught.

```yaml
- name: Verify no .env is tracked
  run: |
    if git ls-files | grep -E '(^|/)\.env(\..*)?$' | grep -v '\.env\.example'; then
      echo "::error::A .env file is tracked — remove it and rotate the credentials"; exit 1
    fi
```

**Priority:** P1 · **Est:** 10m

**Credential handling note.** The Neon connection string was shared in plaintext chat and is stored in `frontend/.env` and Vercel (as Sensitive). It is not in git. Since it has now travelled through a chat transcript, rotate it in the Neon console before this project goes public — it costs two minutes and removes all doubt.

### Other security checks

| Control | Status |
|---|---|
| XSS | ✓ No `dangerouslySetInnerHTML` anywhere; React escaping intact |
| SQL injection | ✓ Prisma parameterises everything; no raw SQL |
| Secure headers | ⚠ `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` set in `next.config.mjs` — good. **No CSP**, no HSTS (Vercel supplies HSTS) |
| CORS | ✓ Same-origin only; no permissive CORS on Next routes |
| CSRF | ✗ Not applicable yet (no cookie auth) — **must be addressed when C1/C2 land**, since cookie auth without `sameSite`/token = CSRF |
| localStorage misuse | ✓ Only `{locale, theme}` — no PII. Explicitly commented. Correct. |
| Password storage | ✗ Plaintext string comparison (C3) |
| Generic auth errors | ✓ Correctly implemented and well-commented |
| Prompt injection | ⚠ A direct override attempt was refused by the model; there is **no code-level defence** — the profile is interpolated straight into the prompt, so a malicious value in a profile field would be model-trusted |

---

## PHASE 5 — Database audit

**Verified live** against Neon (`ep-rough-breeze-axt8b5ok-pooler`, us-east-2): 5 citizens, 11 documents, 5 applications + 15 events, 6 notifications.

**Strong points.** Correct pooled connection string for serverless; Prisma client singleton guards against dev hot-reload pool exhaustion; `onDelete: Cascade` on every child relation; composite indexes matching real query shapes (`[state, district]`, `[applicantId, status]`, `[status, district]`, `[ownerId, type]`, `[expiresAt]` for the renewal job); soft-delete columns present; `Decimal(8,2)` for landholding rather than float; JSON for OCR output so new document types need no migration; self-relation for household so a dependent can be promoted without a data move.

### M6 — Two Prisma schemas now exist

`database/prisma/schema.prisma` (original, 504 lines, aspirational — includes `Scheme`, `VerificationReport`, `Complaint`, `Admin`, `AuditLog`) and `frontend/prisma/schema.prisma` (new, applied, 6 models). The applied one had to live under `frontend/` because Vercel's root directory is `frontend/`.

**Fix.** Make `frontend/prisma/schema.prisma` canonical and replace `database/prisma/schema.prisma` with a pointer note, or keep the original as `docs/design/target-schema.prisma` clearly labelled as the pilot target. Do not leave two files that look equally authoritative.

**Priority:** P2 · **Est:** 20m

### Other database findings

- **No migration history.** `prisma db push` was used, not `prisma migrate`. Fine for a prototype, wrong for a pilot — there is no reproducible path from empty to current. Run `prisma migrate dev --name init` before the pilot. *(P2, 30m)*
- **No transactions on multi-step writes.** `POST /api/documents` loops upserts individually; a mid-loop failure leaves a partial import, which matters because the verification report's accuracy depends on the full document set. Wrap in `prisma.$transaction`. *(P2, 30m)*
- **No PII encryption at rest**, despite the schema comment calling `extracted` "the most sensitive column" and `SECURITY.md` claiming encryption. Aadhaar/PAN-derived fields sit in plaintext JSON. *(P1 for pilot, 4h)*
- **No row-level security.** Neon's `neondb_owner` role is used directly by the app — full DDL rights from the request path. Create a restricted application role with DML-only grants. *(P2, 1h)*

---

## PHASE 6 — AI system review

**Model:** `gemini-3.1-flash-lite` — sensible choice for cost and latency on this workload.

**Genuinely good.** The offline fallback is the standout: if the network call fails or returns no text, `lib/assistant.ts` answers locally and the citizen never sees an error. For a rural-connectivity target this is exactly right, and it is the thing to demo. Scheme cards and actions always come from the deterministic local engine even when prose comes from Gemini, so the *recommendations* can never hallucinate a scheme that does not exist — an excellent architectural instinct that you should say out loud to judges.

**Weaknesses.**

| Issue | Detail |
|---|---|
| Prompt injection | Profile values interpolated directly into the system instruction; no delimiting, no instruction to distrust them. A basic override attempt was refused by the model, but that is Google's guardrail, not yours. |
| No conversation memory | Each call sends only the current message. The PRD promises "multi-step state, memory" as the differentiator from a chatbot — the `Conversation`/`Message` tables were designed for this but are not in the applied schema or wired up. **A judge will ask about this.** |
| No RAG / vector DB | `ROADMAP.md` Phase 6 promises a RAG pipeline, embeddings and a vector store. None exists. Answers rely on the model's parametric knowledge of Indian schemes — a real hallucination risk on scheme specifics (amounts, deadlines, eligibility thresholds). |
| No timeout | No `AbortSignal` on the Gemini fetch and no `maxDuration` export. On Vercel the function will hard-fail at the platform limit instead of falling back gracefully. **Fix: `export const maxDuration = 15;` plus `AbortSignal.timeout(10_000)` — then the existing offline fallback catches it, which is a 30-minute change with outsized demo value.** |
| No cost controls | See H1. |
| Answer/card coherence | Prose comes from Gemini, cards from the local engine; they can disagree. Low frequency, but visible if it happens on stage. |

**Recommended demo hardening:** wire `maxDuration` + `AbortSignal` today. It converts your worst demo-failure mode (assistant hangs on venue wifi) into a feature you can narrate: *"watch — I'll kill the network and it keeps working."*

---

## PHASE 7 — UI/UX and accessibility

**This is the project's strongest area.** Verified on production at 1440×900, 1562×784 and 390×844, in both themes.

**Confirmed working:** consistent 4px spacing rhythm and type scale; glassmorphism applied restrainedly; dark mode complete and legible on every route tested (no unstyled or low-contrast panels); mobile layout collapses correctly to a hamburger with no horizontal scroll or overlap; skeleton shimmer on load; empty/error states present; `aria-current="page"` on active nav; `aria-label` on icon-only controls; `id="main"` landmark with a working "Skip to main content" link; `@media (prefers-reduced-motion: reduce)` honoured in `globals.css`; `<html lang>` updated dynamically on locale change; every `<img>` has `alt`.

That is a materially better accessibility baseline than most production Indian government portals, and it deserves to be said explicitly in the pitch.

**Gaps.**

- **Contrast not formally verified.** The `muted` token on `--surface` in dark mode looks borderline against WCAG AA 4.5:1. Run axe DevTools or Lighthouse a11y and fix anything under 4.5:1. *(P2, 1h)*
- **No visible focus ring audit.** Several controls use `outline-none` (e.g. `settings/page.tsx:51`) without a paired `focus-visible:` style. Keyboard users may lose the focus indicator entirely — a WCAG 2.4.7 failure. **Grep `outline-none` and pair every instance with `focus-visible:ring-2`.** *(P1, 1h)*
- **21 of 22 languages are labels only.** The footer advertises "English हिंदी বাংলা தமிழ் मराठी +18 more" but `lib/i18n.ts` contains only `en` and `hi` translation tables. Selecting Bengali or Tamil will not translate the interface. Since multilingual access is the *stated core value proposition*, a judge selecting Tamil on stage is a live risk. Either complete 2–3 more languages properly or relabel the selector to show which are available. *(P1, 4h — or 30m to relabel)*
- **No toast system.** `syncError` is now surfaced in the store but no component renders it; a failed save is silent to the user. *(P2, 1h)*

---

## PHASE 8 — Performance

From the production build:

```
First Load JS shared by all   102 kB
Largest routes:  /  314 kB · /assistant 310 kB · /family 306 kB · /schemes 302 kB
```

**L3 — ~300 kB First Load JS is heavy for the stated audience.** For a rural 3G user on a low-end Android — explicitly MITRA's target persona — 300 kB of JavaScript is roughly 3–5 seconds before interactivity, before any data loads.

Contributors and fixes:

- **M8 — `framer-motion` is in `package.json` but never imported.** `grep -rn "from 'framer-motion'" app components lib` → zero results. It is ~110 kB. Remove it. *(P1, 10m — best effort-to-benefit ratio in this section.)*
- `lucide-react` is imported in only one module; confirm tree-shaking is actually eliminating unused icons.
- Admin routes bundle `demoData.ts` (all districts, complaints, trends) into the client. Move to server components or an API route.
- All 18 schemes with full rules ship to the client on every route via `lib/schemes.ts`.
- No `next/dynamic` code-splitting on heavy, below-fold components.

**Not measured:** real Lighthouse/Web Vitals scores, image optimisation (no raster images found in `public/`), DB query latency under load. Run Lighthouse against production before finals. *(P2, 3h total)*

---

## PHASE 9 — Vercel deployment

**Working:** build succeeds in 31 s; TypeScript clean; all 8 API routes correctly marked `ƒ (Dynamic)`; 23 static pages prerendered; `postinstall: prisma generate` runs correctly on Vercel; `prisma generate` and `next build` both verified to succeed *without* `DATABASE_URL`, so CI will not break; env vars set as Sensitive; production alias resolves.

**Gaps.**

- **M9 — No `vercel.json`.** No explicit function regions, `maxDuration`, redirects or headers. Notably the Neon database is in **us-east-2** while the users are in India — every query crosses the Atlantic twice. Set function region to `bom1` (Mumbai) *and* move the Neon project to an Indian/Singapore region; currently this adds ~250 ms to every request. *(P1, 1h)*
- **No CSP header.** Add to `next.config.mjs` headers, allowing `generativelanguage.googleapis.com` in `connect-src`. *(P2, 1h)*
- **L1 — Stale comment**, `next.config.mjs:9`: "MITRA runs fully self-contained: no external API calls, no API keys." False since the Gemini integration. Part of C4. *(P2, 5m)*
- **L2** — `DEMO_CITIZEN_ID` is marked Sensitive in Vercel; it is not a secret. Harmless, but it obscures which variables actually matter. *(P3, 5m)*
- **Preview deployments inherit production `DATABASE_URL`?** Currently the variable is Production-scoped only, which is correct — preview builds will have no DB. Decide deliberately: either add a separate Neon branch for preview, or accept that previews show demo data.

---

## PHASE 10 — GitHub readiness

| Check | Status |
|---|---|
| `.gitignore` | ✓ Comprehensive |
| README | ⚠ Well-written but **factually wrong**: "No API keys. No database. No external services." |
| LICENSE | ✓ MIT, properly formatted |
| Documentation | ✓ 16 markdown docs — genuinely unusual depth for a hackathon |
| Secrets committed | ✓ None |
| `node_modules` / build artifacts | ✓ Not tracked |
| Commit history | ⚠ 5 commits, conventional-commit style ✓, but a 100-file "Initial commit" hides all development history |
| Repo cleanliness | ⚠ 9 `.gitkeep`-only directories (`admin/`, `ai/`, `assets/`, `deployment/`, `mobile/`, `scripts/`, `shared/`, `docs/diagrams/`) — scaffolding for work not started |

**Fixes.** Update the README run instructions to reflect the Gemini key and `DATABASE_URL` requirements *(P1, 20m)*. Either populate or remove the empty directories — a reviewer reads nine empty folders as abandoned scope *(P2, 15m)*. Add `CONTRIBUTING.md` and a `.env.example` update covering `DATABASE_URL` and `AI_API_KEY` *(P2, 30m)*.

---

## PHASE 11 — Dependencies

**H4 — 3 high-severity CVEs** (`npm audit --omit=dev`):

- **postcss ≤8.5.22** — XSS via unescaped `</style>`; arbitrary file read and path traversal via attacker-controlled `sourceMappingURL` (GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849, GHSA-fxqj-rqcc-2cmp). Reached transitively through `next`.
- **sharp <0.35.0** — inherited libvips CVE-2026-33327/33328/35590/35591.

Both are build-time/image-processing paths rather than request paths, so real-world exploitability here is low — but "3 high severities" on an `npm audit` in front of a security-minded judge is a bad look regardless.

**Fix.** `npm i next@latest` (audit suggests 16.3.0 — a major bump; test the App Router changes) or pin overrides:

```json
"overrides": { "postcss": "^8.5.23", "sharp": "^0.35.0" }
```

**Priority:** P1 · **Est:** 1h including regression testing

**Other dependency notes.** All licences permissive (MIT/Apache-2.0/ISC) — no copyleft risk for open-source release. `framer-motion` unused (M8). Backend `requirements.txt` is deliberately minimal and well-justified. Prisma 6.19.3 with 7.9.1 available — no urgency.

---

## PHASE 12 — Code quality

**Above hackathon norm, by a clear margin.**

The comments are the best thing in this codebase. They explain *why*, not *what* — "Rules are data, not code — new schemes are added without touching the engine"; "The error message is intentionally generic: revealing whether an account exists lets an attacker enumerate valid government user IDs"; "A transliteration variant — same person, different spelling. Should NOT alarm." That last one, in the seed data, shows domain thinking most teams never reach. Naming is consistent, the rule engine is properly data-driven, `types/index.ts` is a genuine single source of truth, and route handlers correctly delegate to services.

**Weaknesses:** the TS/Python duplication (M1) is the largest maintainability problem; `DEMO_CITIZEN_ID` is a global singleton standing in for a session and will need to be threaded through properly with C1; magic numbers (`totalSteps: 5`, `600`ms debounce, `0.72` fuzzy thresholds) should be named constants; no component-level tests — the 79 assertions cover engines only, nothing covers React state or the new API routes.

---

## PHASE 13 — SIH judge review

### Would this impress judges?

**Yes — the product would.** The document-verification engine is the differentiator: comparing eleven documents across 39 field pairs, distinguishing a benign transliteration variant ("Ravi" vs "Rabi") from a genuine blocking mismatch (Anjali's DOB 2008 vs 2009), and surfacing "1 issue will very likely cause a rejection" *before* submission. Backed by the rejection-cause data ("nearly three quarters of rejections are clerical, not eligibility-based"), that is a real insight about why welfare delivery fails in India, not a UI trick. Most teams build a scheme search box. You built the thing that prevents rejection.

The family-household model is the second differentiator — managing benefits for a 67-year-old father and a 17-year-old daughter from one account matches how Indian households actually interact with the state.

### Questions judges will ask — and your current exposure

1. **"Is the AI real, or hardcoded?"** — Strong answer. Show the local engine and Gemini, and demo the offline fallback by killing wifi. *(Fix `maxDuration` first so this cannot backfire.)*
2. **"Where does citizen data go?"** — **Currently a losing answer.** The UI says on-device; the network tab says Google. Fix C4 before finals. This is the question most likely to be asked and most likely to sink you.
3. **"Show me the Tamil interface."** — **Currently a losing answer.** 22 languages advertised, 2 implemented.
4. **"How do you prevent someone seeing another citizen's Aadhaar data?"** — **Currently a losing answer.** There is no auth (C1).
5. **"You claim multi-step memory — show me."** — Weak. No conversation persistence.
6. **"Is your eligibility logic auditable if a citizen is wrongly rejected?"** — Strong. `eligibilitySnapshot` and per-rule pass/fail explanations are exactly right; say this proactively.
7. **"What happens on 2G?"** — Mixed. Offline fallback is excellent; 300 kB bundle is not.

### How this becomes unforgettable

- Open on the **rejection-prevention** insight, not the scheme list. Lead with "73% of welfare rejections are clerical errors" and demo the DOB mismatch catch.
- **Kill the wifi on stage** and keep answering. Nobody else will do this.
- Show the **family dashboard** switching to the 67-year-old father and finding a pension he didn't know existed.
- Have the **admin analytics** ready as the "closing the policy feedback loop" beat — it answers "so what does government get out of it?"

### Scores

| Dimension | Score | Note |
|---|---|---|
| Innovation | 88 | Document-verification engine is a genuine insight |
| Technical Depth | 74 | Excellent engines; duplicated, partly unreachable architecture |
| UI/UX | 92 | Best-in-class for this competition |
| Accessibility | 78 | Strong foundations; focus rings and i18n gaps |
| Security | 22 | Four criticals live on a public URL |
| Scalability | 65 | Good schema and indexes; no auth, no rate limits, wrong region |
| Feasibility | 85 | Clearly pilotable with a district CSC network |
| Demo Quality | 86 | Polished and coherent; two live failure modes |
| Presentation Readiness | 70 | Docs contradict the build |
| **Overall Winning Potential** | **72** | Rises to ~88 once C1–C4 are fixed |

---

## Final scores

| Score | Value | Basis |
|---|---|---|
| **Production Readiness** | **38 / 100** | Unauthenticated writes and admin bypass on a public URL |
| **Security** | **22 / 100** | 4 Critical, 5 High; secrets hygiene and header basics are good |
| **Deployment** | **72 / 100** | Builds and deploys cleanly; wrong region, no `vercel.json`, no CSP |
| **Accessibility** | **78 / 100** | Real WCAG effort; focus visibility and i18n incomplete |
| **Performance** | **66 / 100** | ~300 kB First Load JS; unused 110 kB dep; cross-Atlantic DB |
| **Code Quality** | **82 / 100** | Excellent comments and structure; duplication and thin test coverage |
| **SIH Readiness** | **72 / 100** | Product is finals-grade; claims and auth are not |
| **Overall Project Score** | **61 / 100** | |

### The path to 95+

**Before public exposure (P0 — ~10 hours):** C1 session auth + ownership checks · C2 `middleware.ts` server-side admin gate · C3 server-side credential check · C4 honest privacy copy · H1 lock down the AI endpoint · rotate the Neon credential.

**Before finals (P1 — ~12 hours):** H2 rate limiting · H3 stop leaking upstream errors · H4 patch CVEs · H5 split `SECURITY.md` into implemented vs designed · M2 fix the roadmap status · M8 drop `framer-motion` · `maxDuration` + `AbortSignal` on the AI route · focus-visible ring pass · relabel or complete the language selector · move DB and functions to an Indian region.

**Before open-source release (P2 — ~10 hours):** M1 resolve the TS/Python duplication · M3 ESLint config · M6 single Prisma schema · migration history · README corrections · remove empty scaffolding directories · Lighthouse pass · component and API tests.

That sequence gets Production Readiness to ~92, Security to ~88, and Overall to ~93 within roughly four focused days.

---

## Second-pass findings

Re-reviewing after the first pass surfaced these additional items, per the instruction not to stop at one iteration:

1. **IDOR will survive the C1 fix** unless ownership is checked explicitly. `PATCH /api/applications/[id]` looks up by id alone; adding sessions without an `applicantId === session.sub` check leaves any authenticated citizen able to advance another's application. Call this out in the C1 work.
2. **CSRF becomes live the moment cookie auth lands.** Currently N/A. Set `sameSite: 'strict'` and add a double-submit token when implementing C1/C2, or the auth fix introduces a new vulnerability.
3. **Admin lockout is client state.** `attempts >= 5` in `admin/login/page.tsx` resets on refresh — the lockout is decorative. Must be enforced server-side alongside C3.
4. **`refresh()` on the `online` event can clobber unsaved edits.** `lib/store.tsx` re-fetches on reconnect and overwrites local state; a debounced profile edit in flight could be lost. Flush pending writes before refreshing.
5. **`/api/documents` accepts arbitrary JSON into `extracted`** with only `name`/`type` validated. An attacker (pre-C1) or a compromised client can write unbounded JSON blobs — storage-exhaustion and stored-data-integrity risk. Add a Zod schema and a size cap.
6. **`GET /api/bootstrap` returns every document in the database**, not just the session household (`where: { deletedAt: null }` has no owner filter). Correct for a single-household demo; a cross-tenant data leak the instant a second citizen exists. Fix with C1.
7. **No `robots.txt` / `noindex` on `/admin`.** The admin portal is crawlable and indexable. Add `noindex` and disallow `/admin` in `robots.txt` *(P2, 10m)*.
8. **`suppressHydrationWarning` on `<html>`** (`layout.tsx:24`) is legitimate for the theme script but will also mask genuine hydration bugs. Confirm it is scoped as narrowly as possible.
9. **Neon free tier autosuspends** after inactivity. The first request after idle incurs a multi-second cold start — during a live demo the app will appear to hang on load. **Warm the database immediately before presenting**, or add a keep-alive ping. This is a concrete demo-failure risk worth a calendar reminder.
