# File Structure

Full repository layout for MITRA. Folders are created as scaffolds in Phase 0 and populated in the phase that owns them (noted below). Nothing here is a placeholder page in the running app — empty folders at this stage hold only a `.gitkeep` until their phase lands.

```
MITRA/
├── README.md
├── PRD.md
├── ARCHITECTURE.md              # Phase 2
├── TECH_STACK.md
├── DATABASE.md                  # Phase 2 / 4
├── API.md                       # Phase 2 / 5
├── FEATURES.md
├── USER_FLOW.md                 # Phase 2
├── UI_GUIDELINES.md             # Phase 3
├── CODING_RULES.md
├── FILE_STRUCTURE.md
├── TASKS.md
├── PROMPTS.md                   # Phase 6
├── CHANGELOG.md
├── ROADMAP.md
├── ENVIRONMENT.md               # Phase 11
├── SECURITY.md                  # Phase 9
├── TESTING.md                   # Phase 10
├── DEPLOYMENT.md                # Phase 11
├── DEMO_SCRIPT.md               # Phase 12
├── PPT_CONTENT.md               # Phase 12
├── FAQ.md                       # Phase 12
├── LICENSE.md
│
├── docs/
│   ├── diagrams/                # ER diagram, HLD/LLD, sequence & data-flow diagrams (Phase 2)
│   └── research/                # problem analysis, competitor analysis, personas, journey maps (Phase 1)
│
├── assets/                      # logos, illustrations, icons used across docs/UI
│
├── frontend/                    # Phase 3 (design system) / Phase 7 (citizen app) / Phase 8 (admin)
│   ├── app/                     # Next.js App Router
│   │   ├── (citizen)/           # citizen-facing routes: dashboard, chat, schemes, applications, family, documents, notifications, settings
│   │   ├── (admin)/             # admin-facing routes, isolated layout + auth guard
│   │   ├── (auth)/              # login/onboarding routes
│   │   └── api/                 # Next.js route handlers (BFF layer, proxies to backend/ where relevant)
│   ├── components/
│   │   ├── ui/                  # design-system primitives (buttons, cards, inputs, modals)
│   │   ├── citizen/              # citizen-flow components (scheme card, checklist, chat bubble, tracker)
│   │   └── admin/                # admin-flow components (analytics widgets, tables, approval panel)
│   ├── lib/                     # client utilities, API client, auth helpers, i18n
│   ├── hooks/                   # shared React hooks
│   ├── styles/                  # Tailwind config, theme tokens, globals
│   ├── public/                  # static assets served by Next.js
│   └── types/                   # frontend-local TypeScript types
│
├── backend/                     # Phase 5 — FastAPI service
│   ├── app/
│   │   ├── api/                 # route modules (auth, profile, schemes, applications, documents, family, admin)
│   │   ├── core/                # config, security, dependencies, middleware
│   │   ├── models/              # ORM/Pydantic models
│   │   ├── services/            # business logic (eligibility, recommendation, reminders)
│   │   └── utils/
│   ├── tests/                   # Phase 10
│   └── main.py
│
├── database/                    # Phase 4
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── seed/                    # seed scripts + scheme dataset (Phase 1/4)
│
├── ai/                          # Phase 6
│   ├── pipeline/                # RAG pipeline, embeddings, retrieval
│   ├── prompts/                 # versioned prompt templates (paired with PROMPTS.md)
│   ├── engines/                 # eligibility engine, recommendation engine, document verification
│   ├── ocr/                     # OCR pre/post-processing
│   └── vector_store/            # vector DB client + index config
│
├── admin/                       # Phase 8 — admin-specific backend modules (analytics aggregation, approval workflow, reports)
│
├── shared/                      # types, constants, enums, and schema shared between frontend/backend/ai
│
├── mobile/                      # future React Native shell (post-MVP, not built in this hackathon cycle)
│
├── scripts/                     # dev/build/seed/lint utility scripts
│
├── .github/
│   └── workflows/               # CI/CD pipelines (Phase 11)
│
├── docker/                      # Dockerfiles, docker-compose (Phase 11)
│
└── deployment/                  # IaC, environment-specific configs, deployment scripts (Phase 11)
```

## Ownership by phase

| Path | Owning phase |
|---|---|
| `docs/research/` | Phase 1 |
| `docs/diagrams/`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `USER_FLOW.md` | Phase 2 |
| `UI_GUIDELINES.md`, `frontend/components/ui/`, `frontend/styles/` | Phase 3 |
| `database/prisma/`, `database/seed/` | Phase 4 |
| `backend/` | Phase 5 |
| `ai/`, `PROMPTS.md` | Phase 6 |
| `frontend/app/(citizen)/`, `frontend/app/(auth)/` | Phase 7 |
| `frontend/app/(admin)/`, `admin/` | Phase 8 |
| `SECURITY.md` (+ security middleware across `backend/`, `frontend/`) | Phase 9 |
| `backend/tests/`, `frontend/**/__tests__`, `TESTING.md` | Phase 10 |
| `docker/`, `deployment/`, `.github/workflows/`, `DEPLOYMENT.md`, `ENVIRONMENT.md` | Phase 11 |
| `DEMO_SCRIPT.md`, `PPT_CONTENT.md`, `FAQ.md` | Phase 12 |

## Naming conventions

- Folders: `kebab-case`. React components: `PascalCase.tsx`. Hooks: `useCamelCase.ts`. Python modules: `snake_case.py`. See [CODING_RULES.md](CODING_RULES.md) for full conventions.
