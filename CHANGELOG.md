# Changelog

All notable changes to MITRA, recorded by build phase. Format follows [Keep a Changelog](https://keepachangelog.com/) conventions, organized by phase rather than release version during the hackathon build.

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
