# Tech Stack

Technology choices for MITRA and the reasoning behind each. Version pins land in Phase 5/7 when `package.json` and `requirements.txt` are created; this document records the decisions.

## Frontend

| Technology | Role | Why |
|---|---|---|
| **Next.js (App Router)** | Web application framework | Server components reduce payload on low-bandwidth connections — critical for rural users. Built-in routing, API route handlers for a BFF layer, first-class Vercel deployment, and strong SEO for the public landing/scheme pages. |
| **React** | UI library | Ecosystem maturity, component reuse across citizen and admin portals. |
| **TypeScript** | Type safety | Eligibility rules and scheme data are structurally complex; types prevent an entire class of silent bugs in the rules engine and API contracts. Shared types live in `shared/`. |
| **TailwindCSS** | Styling | Utility-first keeps the design system consistent and the CSS bundle small. Theme tokens (colors, spacing, typography) centralize the glassmorphism + government palette in one config. |
| **Framer Motion / Motion.dev** | Animation | Declarative, interruptible animations with reduced-motion support built in — accessibility-friendly micro-interactions rather than decorative-only motion. |
| **next-intl (or equivalent i18n layer)** | Localization | Multilingual is a core requirement, not an add-on; message catalogs allow adding languages without touching component code. |
| **next-pwa / service worker** | Offline mode | Caches scheme content and checklists for offline reading (FR-13). |

## Backend

| Technology | Role | Why |
|---|---|---|
| **FastAPI (Python)** | Primary API service | Python is where the AI/ML ecosystem lives (LangChain, OCR, embeddings), so keeping the AI engines and the API in one runtime avoids a cross-language boundary. FastAPI gives async performance, Pydantic validation, and auto-generated OpenAPI docs that keep `API.md` honest. |
| **Node.js** | Next.js runtime + BFF route handlers | Session handling, OAuth callback, and lightweight aggregation sit close to the frontend; heavy AI work proxies to FastAPI. |
| **Pydantic** | Request/response validation | Every API boundary validated; validation errors are structured and localizable. |

## Database & caching

| Technology | Role | Why |
|---|---|---|
| **PostgreSQL** | Primary datastore | Relational integrity matters here: citizens ↔ family members ↔ applications ↔ documents ↔ schemes are all foreign-key relationships. JSONB columns handle variable scheme eligibility-rule shapes without schema churn. |
| **Prisma** | ORM / schema management | Single declarative schema file as the source of truth, type-safe client, and versioned migrations. Generates TypeScript types consumed by the frontend via `shared/`. |
| **Redis** | Cache, sessions, rate limiting | Caches expensive eligibility computations and scheme lookups; backs rate limiting and reminder-job scheduling. |

## AI layer

| Technology | Role | Why |
|---|---|---|
| **Gemini** | LLM for reasoning, explanation, conversation | Strong multilingual performance across Indian languages, native multimodal input (document photos) which suits the OCR/document-advisor flow, and competitive cost per token for a service intended to run at population scale. Configured via `AI_API_KEY` / `AI_MODEL` env vars. |
| **LangChain** | Orchestration | Standardizes the RAG chain, tool calling, and conversation memory so prompt/engine changes stay isolated from application code. |
| **FAISS / ChromaDB** | Vector store | FAISS for fast local/embedded similarity search during development; ChromaDB as the persistent, filterable store for scheme embeddings. Metadata filtering (state, category) matters as much as vector similarity here. |
| **Google Vision / Tesseract** | OCR | Vision API for accuracy on real documents; Tesseract as the offline/no-cost fallback so the OCR path is never a hard external dependency during a demo. |
| **Whisper / Google STT** | Speech-to-text | Whisper handles accented and code-mixed Indian speech notably better than most alternatives; Google STT as a streaming-latency option. |
| **Google TTS** | Text-to-speech | Broad Indian-language voice coverage for the voice-first requirement. |

**Design principle:** all AI providers sit behind a provider-agnostic service interface in `ai/`. The application never calls a vendor SDK directly, so swapping models (or falling back to deterministic rule-based logic when a key is absent) is a config change, not a refactor.

## Maps

| Technology | Role | Why |
|---|---|---|
| **Google Maps** | CSC and government office locator | Best coverage and place data for Indian CSCs; directions API supports the "get me there" step of the locator flow. |

## Deployment & infrastructure

| Technology | Role | Why |
|---|---|---|
| **Docker** | Containerization | Reproducible environments; the FastAPI + Postgres + Redis stack runs identically on a laptop and in the cloud — important when a judge asks to run it. |
| **Vercel** | Frontend hosting | Zero-config Next.js deploys, edge CDN, preview deployments per PR. |
| **GCP** | Backend, AI services, managed Postgres | Keeps the app adjacent to Gemini/Vision/STT services; government pilots typically require a defined data-residency region, which GCP's India regions provide. |
| **Firebase** | Auth helpers, push notifications, hosting fallback | Fast path for notification delivery and a secondary hosting option. |
| **GitHub Actions** | CI/CD | Lint, type-check, test, and deploy on every push; gates the "no placeholder content" rule with automated checks. |

## Rationale summary

The stack optimizes for three constraints specific to this problem:

1. **Low-bandwidth, low-end-device users** — server components, aggressive caching, offline mode, minimal client JS.
2. **AI-heavy, multilingual reasoning** — Python backend co-located with the AI ecosystem, provider-agnostic abstraction, vector search with metadata filtering.
3. **Government pilot readiness** — containerized, data-residency-capable, auditable, with type-safe contracts and generated API documentation.
