# Tasks

Live task tracker across all 12 phases. Updated at every phase boundary. See [ROADMAP.md](ROADMAP.md) for phase definitions.

Legend: ✅ done · 🟡 in progress · ⬜ not started

> **Status note (2026-08-08).** Earlier revisions of this tracker marked Phases 1–12 as
> not started while the repository already contained their deliverables. The table below
> now reflects what is actually built and deployed. Phases are no longer strictly
> sequential: security and persistence work was pulled forward to close the findings in
> [AUDIT.md](AUDIT.md).

## Phase status

| Phase | Name | Status |
|---|---|---|
| 0 | Project Foundation | ✅ Complete |
| 1 | Research & Planning | 🟡 Partial — `gap-analysis.md` only; 8 documents outstanding |
| 2 | System Design | 🟡 Partial — ARCHITECTURE, API written; DATABASE, USER_FLOW, diagrams outstanding |
| 3 | UI/UX Design | ✅ Complete — design system, components and accessibility implemented |
| 4 | Database Design | ✅ Complete — Prisma schema applied to Neon, seeded, indexed |
| 5 | Backend Development | 🟡 Partial — Next.js API routes with auth/RBAC live; FastAPI service not deployed |
| 6 | AI Development | 🟡 Partial — assistant, eligibility, OCR verification, translation live; RAG, vector store and conversation memory outstanding |
| 7 | Frontend (Citizen) | ✅ Complete — all screens built and database-connected |
| 8 | Admin Portal | 🟡 Partial — UI complete and access-controlled; still reads demo data, not the database |
| 9 | Security | ✅ Complete — see Phase 9b below; 0 Critical, 0 High outstanding |
| 10 | Testing | 🟡 Partial — 79 engine assertions in CI; no component, API or E2E tests |
| 11 | Deployment | ✅ Complete — Vercel + Neon live, CI gates on typecheck/lint/test/audit/build |
| 12 | SIH Submission | 🟡 Partial — DEMO_SCRIPT written; PPT_CONTENT and FAQ outstanding |

---

## Phase 10a — Judge Feedback & Service Routes ✅

- ✅ Issue categories fixed — expiry no longer mislabelled "ID number" (`IssueKind` + `category`)
- ✅ Cross-document intelligence now ordered ahead of expiry detection
- ✅ Cross-document findings visually distinguished, confidence shown inline
- ✅ All 8 "Popular Services" dead links fixed — `/services/[id]` built and prerendered
- ✅ Downloadable AI Verification Report with score, OCR confidence, explanations, readiness
- ✅ Engine suite extended 79 → 81 assertions locking in the new ordering contract

## Phase 11 — Citizen Authentication ✅

- ✅ Auth on the landing page — server-side gate at `/`, split-screen layout, no flicker
- ✅ Email + password sign-up / sign-in, forgot password, reset, remember me, secure logout
- ✅ Enumeration resistance + timing equalisation — verified identical responses in production
- ✅ Hashed single-use reset tokens, 1-hour expiry, reset does not auto-sign-in
- ✅ Per-branch rate limiting (login 10/min, signup 5/min, forgot 3/min) — verified live
- ✅ Guest path preserved so the SIH demo still opens in one click
- ⚠️ Google OAuth — route + UI built, button disabled with visible reason. **Needs
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.**
- ⚠️ Email delivery — console provider active. **Needs SMTP or Resend/SendGrid/SES key.**

### Still outstanding

- ⬜ **Multilingual (Feature 2)** — `lib/i18n.ts` has `en`/`hi` with partial key coverage;
  20 further languages appear in the switcher with no translations.
  **Demo risk: do not switch to Tamil/Bengali/Marathi on stage.**
- ⬜ **Voice conversational AI (Feature 3)** — `useVoice.ts` does STT/TTS in en/hi already;
  interruption (barge-in), conversation memory and the voice toggle are not built
- ⬜ **Dedicated AI Assistant page (Feature 4)** — recent conversations, quick actions,
  document upload shortcut, footer suppression, empty-state illustration
- ⬜ **Reminder UI (Feature 5)** — the service layer, templates and scheduling logic exist
  (`lib/integrations/reminders.ts`); no settings screen to opt in or enter a number
- ⬜ Docs not yet updated: ROADMAP.md, FEATURES.md, API.md, DATABASE.md, PRD.md
- ⬜ `prisma migrate` history — still using `db push`

---

## Phase 10b — DigiLocker, Reminders, Confidence ✅

- ✅ **Confidence semantics fixed** — structural findings (transposition, year-only) score
  92% instead of 28%; three-band model replaces `1 - similarity`
- ✅ **DigiLocker (Feature 7)** — provider interface, mock + production shapes, consent
  screen with per-scope disclosure, connect / sync / disconnect, verified-source precedence
- ✅ **SMS / WhatsApp reminders (Feature 5)** — provider interface, six bilingual
  DLT/Meta-shaped templates, scheduling logic with restraint rules, console provider active

### Still outstanding — needs credentials or a dedicated slice

- ⬜ **Authentication (Feature 1)** — Google OAuth needs client credentials; email/password
  needs a mail provider for verification and reset. Sessions, RBAC, separate citizen/admin
  planes, scrypt hashing and generic auth errors already exist from Phase 9b — this is the
  identity provider on top, plus a Citizen schema migration for credentials.
- ⬜ **Dedicated AI Assistant workspace (Features 4 + 9)** — recent conversations, document
  upload shortcut, quick actions, footer suppression while chatting. Largest pure-UI slice.
- ⬜ **Full multilingual coverage (Feature 2)** — `lib/i18n.ts` has `en` and `hi` with
  partial keys; 20 further languages are advertised in the selector with no translations.
  **Demo risk: do not switch to Tamil/Bengali/Marathi on stage.**
- ⬜ **Voice interruption + conversation memory (Feature 3)** — `useVoice.ts` already does
  STT/TTS in en/hi; barge-in and persisted history are not built
- ⬜ **Live transport for reminders** — DLT registration (SMS) / Meta business verification
  (WhatsApp), both multi-week onboarding
- ⬜ **Live DigiLocker** — MeitY partner application registration
- ⬜ Docs not yet updated: ROADMAP.md, API.md, DATABASE.md, FEATURES.md, PRD.md

---

## Phase 9b — Security Remediation ✅

Closes every Critical and High finding in [AUDIT.md](AUDIT.md).

- ✅ **C1** Session auth on every API route — signed httpOnly cookie, per-visitor sandbox isolation, household scoping, ownership assertions (IDOR closed)
- ✅ **C2** Server-side admin authorisation via `proxy.ts`; forged `sessionStorage` no longer grants access
- ✅ **C3** Admin credential removed from the client bundle; scrypt hash verified server-side with a server-counted lockout
- ✅ **C4** PII minimised before reaching Gemini; UI copy, SECURITY.md, README.md and next.config.mjs corrected
- ✅ **H1** `/api/assistant` requires a session, rate-limited, input-capped, prompt-injection delimited
- ✅ **H2** Rate limiting and same-origin checks on every route
- ✅ **H3** Upstream and driver errors logged server-side, never returned
- ✅ **H4** Next 16.3 / postcss 8.5.23 / sharp 0.35 — `npm audit` reports 0 vulnerabilities
- ✅ **H5** SECURITY.md split into Implemented / Partial / Designed, plus §1a on data egress
- ✅ Persistence: Neon Postgres provisioned, seeded and wired to the UI — state now survives refresh
- ✅ ESLint flat config; lint and `npm audit` added as CI merge gates
- ✅ `vercel.json` (bom1 region), CSP header, `robots.ts`, AI timeout + `maxDuration`
- ✅ Admin trend chart bar-height bug fixed
- ✅ Removed unused `framer-motion` dependency

### Outstanding from the audit (Medium/Low — none blocking)

- ⬜ **M1** Resolve the ~2,950 lines of duplicated TS/Python engine logic — deploy FastAPI or retire it
- ⬜ Move the Neon project from `us-east-2` to an Indian/Singapore region (functions already pinned to `bom1`)
- ⬜ Replace the in-process rate limiter with Vercel KV for a distributed quota
- ⬜ Application-level encryption for the `extracted` OCR column
- ⬜ Audit logging (`audit_logs` model designed, not implemented)
- ⬜ Citizen Google OAuth — replaces anonymous sandbox sessions
- ⬜ Admin MFA and CAPTCHA
- ⬜ `prisma migrate` history (currently `db push`)
- ⬜ Complete or relabel the 20 advertised-but-untranslated languages
- ⬜ Clear the 11 React Compiler lint warnings (currently warnings, not errors)
- ⬜ `focus-visible` ring audit on controls using `outline-none`
- ⬜ Component, API and E2E test coverage
- ⬜ Reduce ~300 kB First Load JS for the rural-3G target

---

## Phase 0 — Project Foundation ✅

- ✅ Create repository folder structure (frontend, backend, database, ai, admin, shared, mobile, docs, scripts, docker, deployment, .github)
- ✅ `README.md` — project overview, journey, documentation map
- ✅ `PRD.md` — vision, problem, goals, personas, functional + non-functional requirements, success metrics, MVP scope, future scope, assumptions & risks
- ✅ `FEATURES.md` — full feature catalogue with MVP/Future status per feature
- ✅ `ROADMAP.md` — 12-phase plan, sequencing, definition of done
- ✅ `FILE_STRUCTURE.md` — full repo layout with phase ownership
- ✅ `TECH_STACK.md` — technology choices with rationale
- ✅ `CODING_RULES.md` — process, architecture, language, UI/a11y, API, security, testing, git, docs standards
- ✅ `TASKS.md`, `CHANGELOG.md`, `LICENSE.md`, `.env.example`, `.gitignore`

---

## Phase 1 — Research & Planning ⬜

- ⬜ `docs/research/problem-analysis.md` — quantified problem, scheme fragmentation, access gap
- ⬜ `docs/research/competitor-analysis.md` — UMANG, DigiLocker, MyGov, CSC, NSP, PM-Kisan portal, Ayushman Bharat portal; strengths, gaps
- ⬜ `docs/research/government-schemes.md` — 15–20 shortlisted schemes with eligibility rules, documents, benefits
- ⬜ `docs/research/datasets.md` — available open data sources and how they feed the system
- ⬜ `docs/research/target-users.md` + `docs/research/pain-points.md`
- ⬜ `docs/research/personas.md` — expanded from PRD §5
- ⬜ `docs/research/journey-mapping.md` — current-state vs. MITRA-state journeys
- ⬜ `docs/research/gap-analysis.md` — what existing platforms don't do and why MITRA is differentiated
- ⬜ `docs/research/references.md`

---

## Phase 2 — System Design ⬜

- ⬜ `ARCHITECTURE.md` — HLD, LLD, component responsibilities, AI pipeline placement
- ⬜ `DATABASE.md` — conceptual data model, entity definitions
- ⬜ `API.md` — REST contracts for all endpoints
- ⬜ `USER_FLOW.md` — screen-by-screen flows for citizen and admin
- ⬜ `docs/diagrams/` — ER diagram, sequence diagrams, data-flow diagram

---

## Phase 3 — UI/UX Design ⬜

- ⬜ `UI_GUIDELINES.md` — design tokens, color system (light + dark), typography, spacing, elevation/glassmorphism rules, motion guidelines
- ⬜ Component library specification (buttons, cards, inputs, chat bubbles, scheme cards, checklists, trackers, data tables)
- ⬜ Accessibility specification (contrast matrix, focus states, reduced motion, screen-reader patterns)
- ⬜ Wireframes for all core screens

---

## Phase 4 — Database Design ⬜

- ⬜ `database/prisma/schema.prisma` — Users, FamilyMembers, Schemes, Applications, Documents, Notifications, AIConversations, Admins, Feedback, Complaints, AuditLogs
- ⬜ Relations, indexes, constraints
- ⬜ Row-level security / access rules
- ⬜ Seed data: scheme dataset + demo citizens
- ⬜ ER diagram in `docs/diagrams/`

---

## Phase 5 — Backend Development ⬜

- ⬜ FastAPI project setup, config, middleware
- ⬜ Google OAuth + JWT authentication, isolated admin auth
- ⬜ RBAC dependency layer
- ⬜ Endpoints: profile, schemes, eligibility, applications, documents, family, notifications, admin
- ⬜ Validation, structured error handling, logging
- ⬜ Update `API.md` to match implementation

---

## Phase 6 — AI Development ⬜

- ⬜ `PROMPTS.md` — versioned prompt library
- ⬜ RAG pipeline + embeddings + vector store setup
- ⬜ Eligibility engine (rules + LLM hybrid)
- ⬜ Recommendation engine
- ⬜ Life-event detection
- ⬜ OCR + document verification
- ⬜ AI form filling
- ⬜ Translation layer
- ⬜ Reminder engine
- ⬜ Conversation memory
- ⬜ Provider-agnostic AI service interface with deterministic fallback

---

## Phase 7 — Frontend (Citizen) ⬜

- ⬜ Landing page
- ⬜ Auth + onboarding flow
- ⬜ AI profile builder
- ⬜ Dashboard
- ⬜ AI chat (text, voice, image)
- ⬜ My Schemes + scheme detail + eligibility explanation
- ⬜ Document checklist + vault
- ⬜ Application assistant + tracking
- ⬜ Family dashboard
- ⬜ Notifications
- ⬜ CSC locator
- ⬜ Settings (language, accessibility, theme)
- ⬜ Offline mode

---

## Phase 8 — Admin Portal ⬜

- ⬜ Isolated admin login + session
- ⬜ Analytics dashboard
- ⬜ Applications management + approval workflow
- ⬜ User management
- ⬜ Complaints/queries inbox
- ⬜ Scheme CRUD
- ⬜ Reports
- ⬜ AI insights + logs
- ⬜ Notifications broadcast

---

## Phase 9 — Security ⬜

- ⬜ `SECURITY.md`
- ⬜ Rate limiting, CAPTCHA, secure headers
- ⬜ Encryption at rest for PII
- ⬜ Audit logging
- ⬜ CSRF/XSS/SQLi protections
- ⬜ Generic auth error handling
- ⬜ Secrets management review

---

## Phase 10 — Testing ⬜

- ⬜ `TESTING.md`
- ⬜ Unit tests (eligibility, recommendation, document rules)
- ⬜ Integration + API tests
- ⬜ UI/E2E tests for critical journeys
- ⬜ Accessibility tests in CI
- ⬜ AI output evaluation
- ⬜ Performance + security testing
- ⬜ Edge case catalogue

---

## Phase 11 — Deployment ⬜

- ⬜ `DEPLOYMENT.md`, `ENVIRONMENT.md`
- ⬜ Dockerfiles + docker-compose
- ⬜ GitHub Actions CI/CD
- ⬜ Vercel (frontend), GCP (backend/AI), managed Postgres + Redis
- ⬜ Environment configuration matrix

---

## Phase 12 — SIH Submission ⬜

- ⬜ `PPT_CONTENT.md` — slide-by-slide content
- ⬜ `DEMO_SCRIPT.md` — demo flow with timings
- ⬜ `FAQ.md` — anticipated judge questions and answers
- ⬜ `CHANGELOG.md` finalization
- ⬜ Elevator pitch, architecture explanation, AI explanation, business model, scalability, future scope
