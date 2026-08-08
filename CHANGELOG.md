# Changelog

All notable changes to MITRA, recorded by build phase. Format follows [Keep a Changelog](https://keepachangelog.com/) conventions, organized by phase rather than release version during the hackathon build.

---

## [Phase 11] — Citizen Authentication — 2026-08-08

### Added — authentication on the landing page (Feature 1)
- `/` is now both the landing page and the dashboard. Unauthenticated visitors get the
  split-screen sign-in experience; signed-in citizens go straight to their household.
  The decision is made **server-side from the signed cookie**, so the correct screen is in
  the first byte of HTML — no flicker, and dashboard markup is never sent to a stranger.
  Keeping one route also means every existing "Home" link stays correct and there is no
  dangling `/login` to index.
- Email + password sign-up and sign-in, forgot password, reset, remember me, secure logout.
- **Remember me** drives both the JWT expiry and the cookie `maxAge` from one flag (30 days
  vs 12 hours), so a long-lived cookie can never carry an already-expired token.
- `passwordHash`, `emailVerified`, `resetTokenHash`, `resetTokenExpiresAt`, `isAnonymous`
  added to `Citizen`; schema pushed to Neon.
- Sign-up provisions a real owned household via `mintSession({ email, passwordHash })`.
  Credentials live on the **head of household only** — a dependent is a person in the
  record, not an account, so giving them a login would be a privilege bug.

### Security properties — verified against production
- **Enumeration resistance.** Wrong password on a real account and a wrong password on an
  unknown address return the byte-identical `"Those sign-in details were not recognised."`
  Confirming someone holds an account on a welfare platform confirms they are claiming
  benefits, so that is a disclosure in itself.
- **Timing equalisation.** An unknown address still runs a full scrypt verification against
  a dummy hash, so response time does not distinguish the two cases.
- Forgot-password always answers *"If that address has an account, a reset link is on its
  way"* — verified identical for registered and unknown addresses.
- Reset tokens are stored **hashed** (SHA-256), single-use, one-hour expiry. A database
  leak does not hand over working reset links. Completing a reset deliberately does **not**
  sign the user in — whoever holds the link may not be the account holder.
- Password policy is length-only (10+). Composition rules push people toward `Password1!`
  and away from length, and are a real barrier on a feature-phone keypad.
- Rate limited per branch: login 10/min, signup 5/min, forgot 3/min. Verified live.

### Kept deliberately — guest access
"Explore without an account" remains, prominently. A welfare product that cannot be looked
at without registering excludes exactly the cautious, low-trust users it most needs to
reach — and it would make the SIH demo impossible to run in the thirty seconds a judge
gives you. Guests get the same isolated sandbox and can register later.

### Google OAuth
Route and UI are in place; the button is **disabled with a visible reason** rather than
hidden, so a reviewer can see the method exists and why it is unavailable. Needs
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Mail
`ConsoleMailProvider` active — reset links are written to the server log so the flow is
fully testable without SMTP. `SmtpMailProvider` throws with the specific missing config
rather than silently dropping mail.

---

## [Phase 10b] — DigiLocker, Reminders, Confidence — 2026-08-08

### Fixed
- **Confidence read backwards.** It was computed as `1 - similarity`, so a day-month
  transposition — a near-certain data-entry error — displayed as **28% confidence**, and a
  finding the engine was sure about looked like a guess. Confidence now means *how certain
  MITRA is this is a real problem*, scored in three bands: a recognised structural pattern
  (transposition, year-only record) is a diagnosis at 92%, an outright mismatch is
  confident by definition, and only the genuinely ambiguous middle tracks string distance.

### Added — DigiLocker (Feature 7)
- `lib/integrations/digilocker.ts` — full provider interface with `MockDigiLockerProvider`
  (active) and `HttpDigiLockerProvider` (the production shape). Doctype mapping,
  scope model, issued-document → vault-document conversion.
- `/documents/digilocker` — connection flow with all four real states: consent → authorise
  → fetch → connected, plus sync and disconnect. The consent screen lists each scope
  individually and shows Aadhaar KYC as explicitly *not* requested.
- Documents arrive `verified: true, source: 'digilocker'`, so the verification engine
  treats them as authoritative. Verified live: importing raised the vault from 6 to 9
  documents and the comparison from 39 to 100 field pairs.
- `HttpDigiLockerProvider` throws with the specific missing credential rather than falling
  back to mock data — a partially-real client that silently returns fixtures is the kind of
  thing that demos well and fails in a pilot.

### Added — SMS / WhatsApp reminders (Feature 5)
- `lib/integrations/reminders.ts` — provider interface, six DLT/Meta-shaped templates in
  English and Hindi, and `planReminders()` carrying the actual product judgement: expiry is
  flagged once at 30 days and once at 7, a missing document only when an application is
  genuinely blocked on it, and nothing is ever sent after its deadline.
- `ConsoleReminderProvider` active; `TwilioReminderProvider` throws with the specific
  onboarding requirement (DLT sender ID for SMS, approved template for WhatsApp).

### Feasibility note
WhatsApp Business requires a Meta-approved template per proactive message and a verified
business; Indian SMS requires a DLT-registered sender ID with TRAI-approved templates.
Both are multi-week onboarding, not self-serve API keys. The transport is therefore the
only part not built — the message design and scheduling logic are real and testable.

---

## [Phase 10a] — Judge Feedback & Service Routes — 2026-08-08

### Fixed — reported by SIH judges
- **Issue categories were wrong.** Expiry and missing-document findings had no category of
  their own, so they borrowed `field: 'idNumber'` to satisfy the type — which is why an
  expired income certificate was labelled **"ID number"** in the UI. Introduced `IssueKind`
  (`cross-document` / `profile` / `expiry` / `missing`) with its own `category` label, and
  made `field` optional so it is only set when a real field comparison produced the issue.
- **Cross-document intelligence now leads the report.** Sorting was severity-first, which
  buried six-document reconciliation underneath a lapsed date. Kind is now the primary sort
  key and severity orders within it: an expiry check is a lookup, reconciling documents
  against each other is the inference, and the reading order should say so. Every card still
  carries its severity badge, so urgency is unchanged — only the narrative order moved.
- Cross-document findings are visually distinguished (brand-toned badge) and now display
  their confidence inline.

### Fixed — broken navigation
- **All eight "Popular Services" tiles were dead links.** Home and the Services page both
  pointed at `/services/<id>`; no such route existed, so every tile returned a 404. Added
  `app/services/[id]/page.tsx` with real content per service — what you can do, what to
  bring, fee, processing time, where to go, and the schemes that depend on that document.
  Prerendered at build time via `generateStaticParams`, so the eight pages cost no client JS.
- Service cards are now links in their entirety rather than a small button inside a large
  card, and the Services page footer no longer claims every service opens the assistant.

### Added — AI Verification Report
- Downloadable, printable report (`lib/verificationReport.ts`) covering overall verification
  score, readiness status, per-document OCR confidence with reasoning, findings grouped with
  cross-document intelligence first, suggested fixes, affected documents, and the values
  MITRA will auto-fill with their sources and agreement levels.
- Built as self-contained HTML opened in a print window rather than a generated PDF. That
  avoids adding ~300 kB of PDF tooling to a bundle served to low-end Android over 3G, works
  offline, and "Save as PDF" is already in every browser's print dialog. Falls back to a
  file download when a popup blocker intervenes.
- Carries a deterministic reference code so a printed copy can be traced back.

### Testing
- Engine suite 79 → **81 assertions**. The old `blockers sort before warnings` assertion was
  replaced, deliberately, by three that encode the new contract: cross-document is read
  before expiry, blockers still lead *within* a kind, and expiry issues are categorised as
  expiry rather than as an OCR field.

---

## [Phase 9b] — Security Remediation — 2026-08-08

Closes every Critical and High finding in [AUDIT.md](AUDIT.md). Each item below was
reproduced against the live deployment before the fix and re-tested after it.

### Added — persistence (Phase 4/5 brought forward)
- Neon serverless Postgres provisioned; Prisma schema applied and seeded.
- `GET /api/bootstrap` hydrates the whole app in one round trip; `PATCH /api/profile`,
  `POST|GET /api/applications`, `PATCH /api/applications/[id]`, `POST|GET /api/documents`,
  `PATCH|GET /api/notifications` persist every mutation.
- `lib/store.tsx` rewired from in-memory demo state to optimistic writes against the
  database, with a debounced profile flush and a one-shot retry on session expiry.
- Previously nothing survived a page refresh; now every change does.

### Fixed — Critical
- **C1 — unauthenticated read and write on every API.** Anyone on the internet could read
  the citizen's full profile and documents, and modify them, with a single `curl`. Added
  signed httpOnly session cookies (`lib/db/session.ts`), a per-visitor sandbox cloned from
  the template household so no record is shared between visitors, household scoping on
  every query, and explicit ownership assertions on `[id]` routes to close IDOR.
- **C2 — admin authorisation was client-side only.** `/admin` was reachable by writing a
  forged object into `sessionStorage`. Added `proxy.ts`, which verifies a signed admin JWT
  on the server before any admin route renders. The client check is now presentation only.
- **C3 — admin credentials hardcoded in the shipped bundle.** `officer` / `mitra2026` was
  present in the deployed JavaScript and printed in the page HTML. Replaced with
  server-side verification against a scrypt hash held in an environment variable, a
  constant-time compare, and a server-counted lockout.
- **C4 — the UI made a false privacy promise.** The assistant screen said data never left
  the device while sending the citizen's name, exact income and caste category to Google.
  The route now transmits a minimised, non-identifying context — age band, state,
  rural/urban, occupation, income band, family size, disability flag — and never the name,
  exact income, caste, district or any document content. UI copy, `SECURITY.md`,
  `README.md` and `next.config.mjs` corrected to state exactly what is sent.

### Fixed — High
- **H1 — open AI proxy.** `/api/assistant` was callable anonymously and unmetered against
  the project's Gemini key. Now requires a session, enforces a 10 req/min budget, caps
  input at 2,000 characters and delimits untrusted context against prompt injection.
- **H2 — no rate limiting.** Per-route in-process limiter on every endpoint, plus a
  same-origin check on all mutations. Its per-instance ceiling is documented honestly in
  `SECURITY.md` rather than overstated.
- **H3 — upstream error text leaked to clients.** Gemini error bodies were returned
  verbatim. All errors now pass through one handler; details are logged, never returned.
- **H4 — 3 high-severity dependency CVEs.** Upgraded Next 15.2 → 16.3, postcss → 8.5.23,
  pinned sharp ≥ 0.35. `npm audit` reports **0 vulnerabilities**.
- **H5 — documentation asserted controls that did not exist.** `SECURITY.md` now marks
  every control Implemented / Partial / Designed, and adds §1a stating precisely what
  leaves the device.

### Fixed — Medium
- `npm run lint` hung on an interactive prompt; added flat ESLint config, cleared all 12
  lint errors, and wired lint plus `npm audit` into CI as merge gates.
- CI secret scan only checked the repository root and would have missed `frontend/.env`.
- Admin trend chart rendered as an empty axis — percentage bar heights had no definite
  parent height.
- Removed unused `framer-motion` (~110 kB).
- Added `vercel.json` pinning functions to `bom1` (Mumbai), CSP and `X-Robots-Tag`
  headers, `robots.ts` disallowing `/admin` and `/api`, and a `maxDuration` plus a 12 s
  upstream timeout so a slow model falls back to the on-device engine instead of hanging.

### Security notes
- Citizen and admin planes use separate cookies, separate signing keys and separate JWT
  audiences, so a citizen token is unverifiable on an admin route rather than merely
  unauthorised. Verified by replay test.
- Session cookies are `httpOnly` + `sameSite=strict`; combined with the origin check this
  is the CSRF defence introduced alongside cookie auth.
- `ADMIN_PASSWORD_HASH` is colon-delimited because dotenv expands `$name` and silently
  corrupts a conventional `scrypt$…` hash into an unusable value.

### Verification
- 79/79 engine assertions pass · TypeScript clean · ESLint 0 errors · `npm audit` 0
  vulnerabilities · production build succeeds.
- Every audit exploit re-run against production now returns 401/307 instead of succeeding.

---

## [Phase 0] — Project Foundation — 2026-08-07

### Added
- Repository folder structure: `docs/` (with `diagrams/`, `research/`), `assets/`, `frontend/`, `backend/`, `database/`, `ai/`, `admin/`, `shared/`, `mobile/`, `scripts/`, `docker/`, `deployment/`, `.github/workflows/`.
- `README.md` — project overview, core citizen journey, repository layout, documentation map, current status.
- `PRD.md` — vision, problem statement, product and hackathon goals, non-goals, five user personas (four citizen + one administrator), 15 functional requirement groups, non-functional requirements table, success metrics, MVP scope, future scope, assumptions and risks.
- `FEATURES.md` — feature catalogue across 14 modules with per-feature MVP/Future status.
- `ROADMAP.md` — 12-phase build plan, sequencing, per-phase definition of done, post-hackathon roadmap.
- `FILE_STRUCTURE.md` — annotated repository layout with phase ownership mapping and naming conventions.
- `TECH_STACK.md` — technology selections for frontend, backend, database, AI, maps, and infrastructure, each with explicit rationale tied to the problem's constraints.
- `CODING_RULES.md` — golden process rules, architecture principles, naming conventions, and TypeScript/Python/React/API/security/testing/git/documentation standards.
- `TASKS.md` — live task tracker enumerating work for all 12 phases.
- `CHANGELOG.md` — this file.
- `LICENSE.md` — MIT license.
- `.env.example` — environment variable template with placeholder values only.
- `.gitignore` — excludes secrets, dependencies, build artifacts, and local environment files.

### Decisions
- AI provider access is abstracted behind a provider-agnostic service interface; the application never calls a vendor SDK directly, allowing model swaps and a deterministic rule-based fallback when no API key is configured.
- Citizen and admin authentication are architecturally isolated (separate login flows, cookies, and token audiences) rather than role-gated within a shared session.
- Scheme eligibility rules are stored as structured data (JSONB) rather than hardcoded logic, so adding schemes does not require code changes.

### Security notes
- No credentials are committed. `.env` is gitignored; only `.env.example` with placeholders is tracked.
- An API key was shared over an insecure channel during this phase and must be rotated before any deployment.

---

## Upcoming

- **Phase 1 — Research & Planning:** competitor analysis of UMANG/DigiLocker/MyGov/CSC/NSP, scheme dataset compilation, journey mapping, gap analysis.
