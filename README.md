# MITRA

**Multilingual Intelligent Technology for Responsive Assistance**

*Your Voice. Your Language. Your Government.*

Smart India Hackathon 2026 · Track: **Bharat Pragati** · Problem Statement: *Digital Citizen Assistant for Multilingual Access to Government Services and Schemes*

---

## Run it

No API keys. No database. No external services.

**Frontend**
```bash
cd frontend && npm install && npm run dev     # http://localhost:3000
```

**Backend** (optional — the frontend runs standalone)
```bash
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000          # docs at /docs
```

- Landing page: `/about`
- Government portal: `/admin/login` — `officer` / `mitra2026`
- Voice: press the microphone on the home screen (Chrome or Edge)

## What it is

India does not have a shortage of welfare schemes. It has a shortage of **access**.

Around **71% of rejected applications fail for clerical reasons** — a name spelled differently on two documents, an expired certificate, a transposed date of birth. Those citizens qualified. Nobody told them until after the rejection.

MITRA is the reasoning layer that closes that gap: it understands a citizen's life situation in their own language, works out what they actually qualify for and explains why, then checks their documents against each other *before* they apply.

It is not a chatbot over a scheme directory. It is the layer that makes the existing system work for the people it was built for.

## What makes it different

**1. Explained eligibility, not a filtered list.**
Every verdict shows the rule-by-rule reasoning behind it. A citizen who is refused knows exactly which criterion to fix. There are three outcomes, not two — an explicit *"likely eligible, verify"* state, because a confident wrong answer costs a citizen a day's wage and a bus fare.

**2. Pre-application document verification.**
MITRA compares every document against every other one and flags the mismatches that cause most rejections — with the specific correction to make and where to make it. The hard part is *not* over-flagging: "Rabi" and "Ravi", "Ram Dev" and "Ramdev" are the same names, and a checker that warns about everything gets ignored. See `lib/fuzzy.ts`.

**3. Life events as the input.**
"My daughter is starting college" — not a dropdown of scheme categories. Detected events update the profile and re-rank every recommendation.

**4. Household, not individual.**
Benefits are managed per family. One dashboard for a farmer's PM-KISAN, his daughter's scholarship and his father's pension.

**5. Deterministic reasoning.**
Eligibility comes from an auditable rule engine, not a language model. An LLM deciding entitlement cannot be explained to a refused citizen or defended to an auditor. Language is the AI-shaped problem; the *verdict* is rules. This boundary is deliberate — see `ARCHITECTURE.md` §5.

## Status — built vs. designed

Presenting design intent as working software would be the wrong thing to do, so:

**Built, running and verified**
- Citizen app: landing page, dashboard, assistant, scheme discovery with reasoning, document vault, verification, applications, family dashboard, notifications, CSC locator, settings
- Government portal: isolated login, analytics, application approval workflow with audit trail, scheme management, complaints, AI insights
- **FastAPI backend** — eligibility, recommendation, document verification and assistant endpoints, JWT with separated citizen/admin signing, RBAC, rate limiting, generated OpenAPI docs
- **Real voice** — speech recognition and synthesis via the Web Speech API, in five Indian language locales, with no key and no audio leaving the device
- Eligibility engine, recommendation ranking, life-event detection, cross-document fuzzy verification, offline multilingual assistant
- 18 real central government schemes with machine-evaluable criteria
- 5 languages · light/dark · WCAG 2.1 AA · offline mode
- **79 TypeScript assertions + 77 Python tests passing · clean type check · 21-route production build**

**Designed, documented, not built**
- Prisma persistence (schema complete in `database/prisma/schema.prisma`); citizen state currently lives in the frontend
- Citizen OAuth, application CRUD and upload endpoints
- Real OCR, DigiLocker, Whisper — integration seams are marked in the code
- State-specific rule variants

`TESTING.md` §5, `SECURITY.md` §11 and `API.md` state the limits explicitly.

## Verify it yourself

```bash
cd frontend
npx tsx lib/__tests__/engines.test.ts   # 77 assertions
npx tsc --noEmit                        # type check
npx next build                          # 20 routes
```

The test suite is worth reading — it caught six real bugs, including a transliteration rule ordering error that stopped *Lakshmi* matching *Laxmi*, and an identifier comparison that flagged every citizen's PAN against their Aadhaar. `TESTING.md` §1 lists them.

## Repository

```
MITRA/
├── frontend/              # Next.js 15 app — citizen + admin
│   ├── app/               # 20 routes
│   ├── components/        # design system, shells, scheme cards
│   ├── lib/               # ← the reasoning core
│   │   ├── schemes.ts             # 18 schemes, criteria as data
│   │   ├── eligibility.ts         # rule engine + ranking
│   │   ├── documentVerification.ts# cross-document checking
│   │   ├── fuzzy.ts               # name/date/address matching
│   │   ├── assistant.ts           # offline multilingual assistant
│   │   └── __tests__/             # 77 assertions
│   └── types/
├── database/prisma/       # target schema
├── docs/research/         # competitor & gap analysis
├── docker/ · .github/     # deployment & CI
└── *.md                   # PRD, architecture, security, testing, demo
```

## Documentation

| Doc | What it covers |
|---|---|
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | 6-minute walkthrough + anticipated judge questions |
| [PRD.md](PRD.md) | Vision, personas, requirements, success metrics |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Reasoning core, request flow, failure behaviour, known limits |
| [docs/research/gap-analysis.md](docs/research/gap-analysis.md) | UMANG, DigiLocker, MyScheme, CSC — where each stops |
| [SECURITY.md](SECURITY.md) | Threat model, plane isolation, what is *not* claimed |
| [TESTING.md](TESTING.md) | Strategy, the bugs tests caught, honest gaps |
| [UI_GUIDELINES.md](UI_GUIDELINES.md) | Design system, accessibility rules |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Local, Docker, Vercel, GCP, rollout plan |
| [FEATURES.md](FEATURES.md) · [ROADMAP.md](ROADMAP.md) · [TASKS.md](TASKS.md) | Scope and phase tracking |

## Positioning

MITRA does not replace UMANG, DigiLocker or the CSC network — it sits above them. DigiLocker holds your documents; MITRA notices they disagree. UMANG accepts applications; MITRA works out which ones you will actually win.

The highest-impact thing it does requires no policy change at all: checking the paperwork before submission, which today nobody does.

---

MITRA is an independent prototype built for Smart India Hackathon 2026. It is **not** an official Government of India product. Eligibility results are advisory — citizens should confirm at a Common Service Centre or on the official portal. See [LICENSE.md](LICENSE.md).
