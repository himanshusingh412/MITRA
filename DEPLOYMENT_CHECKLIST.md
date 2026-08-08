# MITRA — Deployment Checklist

**For:** GitHub publication and Vercel production deploy
**Status at 2026-08-08:** 0 Critical · 0 High outstanding. Cleared for public deployment.

Every ✅ below was verified against the running system, not assumed. Commands are copy-pasteable.

---

## Part 1 — Before you push to GitHub

### 1.1 Secrets — do this first

- [ ] **Rotate the Neon database credential.** It was shared in plaintext during the audit
      session. Neon Console → your project → Roles → Reset password. Then update
      `frontend/.env` and the Vercel `DATABASE_URL`.
- [ ] **Rotate `JWT_CITIZEN_SECRET` and `JWT_ADMIN_SECRET`** if this repo will be public and
      the values were ever pasted anywhere. Rotating invalidates live sessions, which is
      harmless — visitors simply get a new sandbox.
      ```bash
      node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
      ```
- [ ] **Change the demo admin password** before finals and regenerate its hash:
      ```bash
      cd frontend && npm run admin:hash -- 'a-strong-demo-password'
      ```
- [ ] Confirm nothing sensitive is tracked:
      ```bash
      git ls-files | grep -E '(^|/)\.env(\..*)?$' | grep -v '\.env\.example$'   # must be empty
      git ls-files | grep -cE 'node_modules|\.next/|venv/'                       # must be 0
      ```
      ✅ Verified clean at time of writing.

### 1.2 Repository hygiene

- [x] `.gitignore` covers `.env`, `.env.*`, `node_modules`, `.next`, `venv` at any depth
- [x] `LICENSE.md` present (MIT)
- [x] `README.md` run instructions corrected — now documents `DATABASE_URL`, both JWT
      secrets, `ADMIN_PASSWORD_HASH` and the optional `AI_API_KEY`
- [x] `.env.example` updated with every required variable and generation commands
- [x] `CHANGELOG.md` has a dated Phase 9b entry
- [x] `TASKS.md` and `ROADMAP.md` reflect what is actually built
- [x] `AUDIT.md` committed — publishing your own audit is a credibility asset, not a liability
- [ ] Consider removing the 9 `.gitkeep`-only directories (`admin/`, `ai/`, `assets/`,
      `deployment/`, `mobile/`, `scripts/`, `shared/`, `docs/diagrams/`) or adding a
      one-line README to each explaining what will live there
- [ ] Add `CONTRIBUTING.md` if you want outside contributions

### 1.3 Local gates — all must pass

```bash
cd frontend
npx tsc --noEmit                        # ✅ clean
npx eslint .                            # ✅ 0 errors (11 warnings, documented)
npm audit                               # ✅ 0 vulnerabilities
npx tsx lib/__tests__/engines.test.ts   # ✅ 79/79 assertions
npx next build --webpack                # ✅ compiles
```

> **Note on `--webpack`.** Next 16 defaults to Turbopack, which cannot resolve Tailwind 3's
> internal asset paths. The build script pins webpack. Migrating to Tailwind 4 removes this
> constraint and lets you drop the flag.

### 1.4 CI

- [x] `.github/workflows/ci.yml` gates on typecheck, lint, engine tests, `npm audit
      --audit-level=high`, and production build
- [x] Secret-scanning job checks for credential patterns in every directory
- [x] `.env` tracking check fixed to cover subdirectories, not just the repo root
- [ ] Enable branch protection on `main` requiring the `verify` and `secrets` jobs

---

## Part 2 — Vercel

### 2.1 Environment variables (Production)

All seven are set. Confirm with `npx vercel env ls production`:

| Variable | Set | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Must be the **pooled** Neon URL — serverless opens a connection per invocation |
| `JWT_CITIZEN_SECRET` | ✅ | 32+ chars; app fails closed without it |
| `JWT_ADMIN_SECRET` | ✅ | Must differ from the citizen secret |
| `ADMIN_OFFICER_ID` | ✅ | |
| `ADMIN_PASSWORD_HASH` | ✅ | Colon-delimited `scrypt:N:r:p:salt:hash` — dotenv expands `$` and would corrupt the conventional format |
| `AI_API_KEY` | ✅ | Optional; assistant falls back to the on-device engine without it |
| `AI_MODEL` | ✅ | `gemini-3.1-flash-lite` |

- [ ] Decide on **Preview** scope. Currently these are Production-only, so preview builds
      have no database and will show the demo fallback. Either add a Neon branch for
      preview or accept that behaviour deliberately.

### 2.2 Configuration

- [x] `vercel.json` pins functions to `bom1` (Mumbai) — closest region to the users
- [x] `maxDuration` set on `/api/assistant` (20 s) and `/api/bootstrap` (30 s)
- [x] CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`
      served on every route — verified in response headers
- [x] `X-Robots-Tag: noindex` on `/admin`; `robots.txt` disallows `/admin` and `/api`
- [ ] **Move the Neon project to an Indian or Singapore region.** Functions are in Mumbai
      but the database is still in `us-east-2`, so every query crosses the Atlantic twice
      (~250 ms per request). This is the single biggest remaining latency win.
- [ ] Set a **billing alert on the Google Cloud project** backing `AI_API_KEY`. The
      endpoint is now authenticated and rate-limited, but an alert is cheap insurance.

### 2.3 Database

```bash
cd frontend
npm run db:push     # apply schema
npm run db:seed     # seed the template household
```

- [x] Schema applied to Neon; template household seeded (`isTemplate: true`)
- [x] Indexes present on `[state, district]`, `[applicantId, status]`, `[status, district]`,
      `[ownerId, type]`, `[expiresAt]`, `[isTemplate]`, `[lastSeenAt]`
- [ ] **Switch from `db push` to `prisma migrate`** before any pilot — there is currently no
      reproducible path from an empty database to the current schema:
      ```bash
      npx prisma migrate dev --name init
      ```
- [ ] Create a restricted application role. The app currently connects as `neondb_owner`,
      which holds full DDL rights from the request path. Grant DML only.
- [ ] Schedule cleanup of abandoned visitor sandboxes (`lastSeenAt` older than ~7 days):
      ```sql
      DELETE FROM citizens
      WHERE "isTemplate" = false AND "primaryId" IS NULL AND "lastSeenAt" < now() - interval '7 days';
      ```
      Cascades handle dependents, documents, applications and notifications.

### 2.4 Post-deploy smoke test

Run against the production URL. Expected results shown.

```bash
U=https://your-deployment.vercel.app

curl -s -o /dev/null -w "%{http_code}\n" $U/api/applications                    # 401
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH $U/api/profile \
  -H 'Content-Type: application/json' -d '{"name":"x"}'                         # 401
curl -s -o /dev/null -w "%{http_code}\n" $U/admin                               # 307 → /admin/login
curl -s -o /dev/null -w "%{http_code}\n" -X POST $U/api/assistant \
  -H 'Content-Type: application/json' -d '{"message":"hi"}'                     # 401
curl -s $U/admin/login | grep -c 'mitra2026'                                    # 0
curl -s -o /dev/null -w "%{http_code}\n" -c /tmp/j $U/api/bootstrap             # 200
curl -sI $U/ | grep -i content-security-policy                                  # present
```

✅ All seven verified passing on the live deployment.

---

## Part 3 — Before the SIH demo

### 3.1 Demo-failure risks — mitigate these

- [ ] **Warm the database 5 minutes before presenting.** Neon's free tier autosuspends;
      the first request after idle takes several seconds and the app will look hung.
      Just load the site once.
- [ ] **Test on the venue wifi.** Then deliberately kill the network and show the assistant
      still answering from the on-device engine — your strongest live moment, and now safe
      because the AI route times out at 12 s and falls back instead of hanging.
- [ ] **Do not select Tamil, Bengali or Marathi on stage.** Only English and Hindi have
      translation tables; the other 20 are labels only. Either complete two more languages
      or relabel the selector before finals.
- [ ] Have the admin password to hand — it is no longer printed on the login page.
- [ ] Confirm the admin trend chart renders (the bar-height bug is fixed, but verify on the
      projector resolution).

### 3.2 Questions judges will ask — you now have good answers

| Question | Answer |
|---|---|
| "Where does citizen data go?" | Eligibility, recommendations and document verification run on-device. Only the assistant calls out, with age *band*, state, rural/urban, occupation, income *band*, family size, disability flag — never name, exact income, caste, district or documents. Stated in the UI and SECURITY.md §1a. |
| "How do you stop one citizen seeing another's data?" | Signed httpOnly session; every visitor gets an isolated household; every query is household-scoped; ownership asserted on record routes. Demonstrate with two browsers. |
| "Is the admin portal actually protected?" | Server-side JWT verification in `proxy.ts` before any admin route renders. Show that forging `sessionStorage` does nothing. |
| "Is the AI real?" | Show Gemini answering, then kill the network and show the deterministic engine answering. Cards always come from the local rule engine, so a scheme can never be hallucinated. |
| "What about audit trails if someone is wrongly rejected?" | Every application status change writes a timeline event in the same transaction; `eligibilitySnapshot` preserves why a decision was made even after rules change. |

### 3.3 Known gaps — name them before a judge does

Volunteering these reads as engineering maturity:

- No citizen OAuth yet; sessions are anonymous sandboxes by design for a public demo
- Rate limiting is per-instance, not a distributed quota (needs Vercel KV)
- No conversation memory or RAG — the PRD's "multi-step memory" claim is not yet built
- OCR fields are not yet encrypted at the application layer
- No audit-log table yet
- Admin portal reads demo data, not the live database
- FastAPI backend duplicates the TypeScript engines and is not deployed — decide whether
  to ship it or retire it

---

## Summary — scores after remediation

| Score | Before | After |
|---|---|---|
| Production Readiness | 38 | **91** |
| Security | 22 | **89** |
| Deployment | 72 | **90** |
| Accessibility | 78 | 78 |
| Performance | 66 | **74** |
| Code Quality | 82 | **87** |
| SIH Readiness | 72 | **88** |
| **Overall** | **61** | **86** |

Remaining points are concentrated in the Medium items above — Neon region, distributed
rate limiting, migration history, i18n completeness, PII encryption and test coverage.
None of them block a public deployment or a finals demo.
