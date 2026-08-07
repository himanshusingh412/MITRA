# Tasks

Live task tracker across all 12 phases. Updated at every phase boundary. See [ROADMAP.md](ROADMAP.md) for phase definitions.

Legend: ✅ done · 🟡 in progress · ⬜ not started

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
