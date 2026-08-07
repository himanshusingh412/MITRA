# Roadmap

12-phase build plan for MITRA. One phase is completed, reviewed, and documented before the next begins (see [CODING_RULES.md](CODING_RULES.md) §"Golden rules"). Status is also tracked live in [TASKS.md](TASKS.md).

| Phase | Name | Deliverables | Status |
|---|---|---|---|
| 0 | Project Foundation | README, PRD, FEATURES, ROADMAP, FILE_STRUCTURE, TECH_STACK, CODING_RULES | 🟡 In progress |
| 1 | Research & Planning | `docs/research/*` — problem analysis, competitor analysis (UMANG/DigiLocker/MyGov/CSC), scheme research, personas, journey mapping, gap analysis | ⬜ Not started |
| 2 | System Design | ARCHITECTURE, DATABASE, API, USER_FLOW — HLD/LLD, ER diagram, API contracts, sequence & data-flow diagrams | ⬜ Not started |
| 3 | UI/UX Design | UI_GUIDELINES — design system, components, theme, accessibility, wireframes | ⬜ Not started |
| 4 | Database Design | Prisma schema, ER diagram, relations, indexes, security rules | ⬜ Not started |
| 5 | Backend Development | FastAPI, JWT + Google OAuth, REST APIs, RBAC, validation, error handling, logging | ⬜ Not started |
| 6 | AI Development | PROMPTS.md, RAG pipeline, vector DB, embeddings, recommendation/eligibility/OCR/form-filling/reminder/translation modules | ⬜ Not started |
| 7 | Frontend (Citizen) | Landing, dashboard, AI chat, schemes, applications, family, documents, notifications, settings — fully connected | ⬜ Not started |
| 8 | Admin Portal | Isolated login, analytics, users, applications, complaints, scheme CRUD, AI logs, reports | ⬜ Not started |
| 9 | Security | SECURITY.md + implementation — JWT, OAuth, RBAC, rate limiting, CAPTCHA, encryption, audit logs, CSRF/XSS/SQLi defenses | ⬜ Not started |
| 10 | Testing | TESTING.md + test suites — unit, integration, API, UI, accessibility, AI, performance, security | ⬜ Not started |
| 11 | Deployment | DEPLOYMENT.md, ENVIRONMENT.md — Docker, Firebase, Postgres, Redis, Vercel, GitHub Actions, GCP | ⬜ Not started |
| 12 | SIH Submission | PPT_CONTENT, DEMO_SCRIPT, FAQ, CHANGELOG finalized | ⬜ Not started |

## Sequencing

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
→ Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11 → Phase 12
```

Phases 2–4 (System Design, UI/UX, Database) inform Phases 5–8 (Backend, AI, Frontend, Admin) directly — no implementation begins until the corresponding design doc exists and is internally consistent with the docs before it.

## Definition of done, per phase

A phase is complete when:
1. All listed deliverables exist and contain no placeholder/TODO content.
2. New deliverables are consistent with every previously completed phase's docs (naming, data model, terminology).
3. `CHANGELOG.md` has a dated entry for the phase.
4. `TASKS.md` reflects the phase as complete and the next phase's tasks are enumerated.
5. `ROADMAP.md` status column is updated.

## Post-hackathon roadmap (beyond Phase 12)

- Pilot with a single district/CSC network; real UMANG/DigiLocker integration.
- Expand scheme catalogue from 15–20 demo schemes to full state + central catalogue.
- Native mobile app (`mobile/`) with offline-first sync.
- WhatsApp/SMS channel for feature-phone users.
- Continuous AI improvement loop from admin-reviewed corrections and citizen feedback.
