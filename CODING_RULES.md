# Coding Rules

Engineering standards for the MITRA repository. These apply to human and AI contributors equally.

## Golden rules (process)

1. **One phase at a time.** Never generate the entire project in one pass. Complete, review, and document a phase before starting the next.
2. **Review before you extend.** Before starting a new phase, re-read all previously completed docs and code for consistency — naming, data model, terminology, and API shapes must not drift.
3. **Keep the trackers current.** Every phase updates `CHANGELOG.md`, `TASKS.md`, and `ROADMAP.md`.
4. **No placeholders.** No `TODO`, no "coming soon" screens, no dead buttons, no lorem ipsum. If a feature is out of scope, it is documented as future scope — not stubbed in the UI.
5. **Everything connects.** Every feature must be wired end to end: database → API → frontend → AI module where applicable. A screen that doesn't read real data isn't done.
6. **Hackathon-ready, startup-grade.** Ship something demoable at every phase boundary, without sacrificing structure that a real team would need.
7. **Every phase report ends with:** files created, files modified, next recommended phase, risks/assumptions.

## Architecture principles

- **SOLID.** Especially single-responsibility (one module, one job) and dependency-inversion (application code depends on interfaces, not vendor SDKs — see the AI provider abstraction in [TECH_STACK.md](TECH_STACK.md)).
- **DRY.** Shared types, constants, and validation schemas live in `shared/` and are imported, never copy-pasted across frontend/backend.
- **Clean layering.** `api → services → repositories → database`. Route handlers contain no business logic; services contain no HTTP concerns; repositories contain no domain rules.
- **Composition over configuration.** Reusable components with clear props, not one mega-component with fifteen boolean flags.
- **Stateless services.** No in-memory session state in API processes — sessions and caches live in Redis so the API layer scales horizontally.

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Folders | `kebab-case` | `scheme-engine/` |
| React components | `PascalCase.tsx` | `SchemeCard.tsx` |
| React hooks | `useCamelCase.ts` | `useEligibility.ts` |
| TS/JS utilities | `camelCase.ts` | `formatCurrency.ts` |
| Python modules | `snake_case.py` | `eligibility_engine.py` |
| Python classes | `PascalCase` | `EligibilityEngine` |
| Database tables | `snake_case`, plural | `family_members` |
| Env variables | `SCREAMING_SNAKE_CASE` | `AI_API_KEY` |
| API routes | `kebab-case`, plural nouns | `/api/v1/family-members` |
| Git branches | `phase-N/short-description` | `phase-5/auth-endpoints` |

## TypeScript rules

- `strict: true`. No `any` — use `unknown` and narrow, or define the type properly.
- No non-null assertions (`!`) except in provably-safe cases with a comment explaining why.
- Types for API responses are generated from or validated against the backend schema, never hand-maintained in two places.
- Prefer `type` for unions/shapes, `interface` for extensible object contracts.
- Every exported function has an explicit return type.

## Python rules

- Type hints on every function signature; `mypy`-clean.
- Pydantic models for every request and response body.
- No bare `except:` — catch specific exceptions, log with context, re-raise or convert to a typed API error.
- Business logic in `services/`, never in route handlers.
- `async def` for anything doing I/O.

## React / Next.js rules

- Server Components by default; `"use client"` only where interactivity genuinely requires it.
- Every list has stable keys; no array-index keys on reorderable lists.
- No `localStorage`/`sessionStorage` for sensitive data — auth tokens live in httpOnly cookies.
- Every async UI has three states implemented: loading (skeleton), error (actionable message), empty (helpful guidance). Not one of three.
- Components under ~200 lines; extract when they grow past that.
- No inline styles except for dynamic computed values.

## UI & accessibility rules

Full design system in [UI_GUIDELINES.md](UI_GUIDELINES.md) (Phase 3). Non-negotiables:

- WCAG 2.1 AA contrast minimum on both light and dark themes.
- Every interactive element is keyboard reachable with a visible focus ring.
- Tap targets ≥ 44×44px — this product serves elderly users on small screens.
- All images/icons have meaningful `alt`/`aria-label`, or are explicitly decorative.
- All animation respects `prefers-reduced-motion`.
- No information conveyed by color alone (eligibility status needs an icon/label, not just green/red).
- Text scales to 200% without breaking layout.
- All user-facing strings go through the i18n layer — no hardcoded English in components.

## API rules

- Versioned: `/api/v1/...`.
- Consistent envelope: `{ data, error, meta }`.
- HTTP status codes used correctly (400 validation, 401 unauthenticated, 403 unauthorized, 404 not found, 409 conflict, 422 semantic, 429 rate limited, 5xx server).
- Every endpoint documented in [API.md](API.md) with request, response, errors, and auth requirements — documented at the same time as it is written, not after.
- Errors are structured and localizable: a machine-readable `code` plus a translatable message key, never a raw stack trace or a bare English string.
- Authentication errors are deliberately generic (see [SECURITY.md](SECURITY.md)) — never reveal whether an account exists.

## Security rules

- **No secrets in the repository, ever.** All credentials come from environment variables. `.env` is gitignored; only `.env.example` with placeholder values is committed.
- A leaked credential is rotated immediately, not just removed from the file.
- All input validated server-side, regardless of client-side validation.
- Parameterized queries only — no string-built SQL.
- PII encrypted at rest; PII never written to logs.
- Audit-log every admin action and every state change on an application.
- Citizen and admin sessions are fully isolated: different cookies, different token audiences, no shared middleware that could leak scope.

## Testing rules

Full strategy in [TESTING.md](TESTING.md) (Phase 10).

- Business logic (eligibility engine, recommendation ranking, document rules) requires unit tests — this is where correctness actually matters to a citizen.
- Every API endpoint has at least one happy-path and one failure-path test.
- Critical user journeys have end-to-end coverage.
- Accessibility checks run in CI.

## Git & CI rules

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Commit messages state what changed and why, not "update files".
- CI must pass lint, type-check, and tests before merge.
- Review `git status` before staging; never commit `.env`, credentials, or generated artifacts.

## Documentation rules

- A feature isn't done until its documentation is updated in the same change.
- Docs are written in prose that a new team member could act on — not bullet fragments that assume context.
- Every doc states which phase owns it and what state it's in.
