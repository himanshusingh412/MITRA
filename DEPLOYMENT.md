# Deployment

**Phase 11 deliverable** · MITRA

---

## 1. Run it locally

The prototype needs no API keys, no database and no external service. This is deliberate — a judge or reviewer can run it in under a minute.

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Verification commands:

```bash
npx tsc --noEmit                       # type check — clean
npx tsx lib/__tests__/engines.test.ts  # 77 assertions — all pass
```

### Demo credentials

| Portal | Route | Credentials |
|---|---|---|
| Citizen | `/` | No sign-in required in the prototype |
| Government | `/admin/login` | `officer` / `mitra2026` |

## 2. Build output

20 routes, 19 of them statically prerendered:

```
Route (app)                         Size      First Load JS
┌ ○ /                               2.58 kB   302 kB
├ ○ /admin                          1.89 kB   281 kB
├ ○ /admin/applications             1.89 kB   281 kB
├ ○ /admin/complaints               1.36 kB   274 kB
├ ○ /admin/insights                 2.67 kB   275 kB
├ ○ /admin/login                    1.59 kB   270 kB
├ ○ /admin/schemes                  1.57 kB   277 kB
├ ○ /applications                   1.85 kB   289 kB
├ ○ /assistant                      2.55 kB   297 kB
├ ○ /documents                      2.16 kB   287 kB
├ ○ /documents/verify               3.41 kB   288 kB
├ ○ /family                         3.13 kB   295 kB
├ ○ /help                           2.92 kB   283 kB
├ ○ /notifications                  1.69 kB   282 kB
├ ○ /schemes                        3.9 kB    291 kB
├ ƒ /schemes/[id]                   3.93 kB   291 kB
├ ○ /services                       1.31 kB   281 kB
└ ○ /settings                       2.63 kB   283 kB
+ First Load JS shared by all       106 kB
```

Every route is within the 320KB budget. Static prerendering matters here: these pages must load on a low-end phone over rural 4G.

### Note on sandboxed or network filesystems

If the source sits on a filesystem that disallows `unlink` (some container mounts, network shares), `next build` compiles and generates all pages successfully but fails at the final cleanup step with `EPERM: operation not permitted, unlink '.next/export/404.html'`. This is an environment restriction, not a code fault. Work around it by pointing the build elsewhere:

```bash
NEXT_DIST_DIR=/tmp/mitra-build npx next build
```

`next.config.mjs` reads `NEXT_DIST_DIR` for exactly this reason.

## 3. Docker

`docker/Dockerfile` builds a hardened production image:

- Multi-stage: dependencies → build → runtime, so build tooling never ships.
- Runs as a non-root user (`nextjs`, uid 1001).
- Next.js standalone output, so the runtime image carries only what it needs.
- Health check on `/`.

```bash
docker build -f docker/Dockerfile -t mitra:latest .
docker run -p 3000:3000 mitra:latest
```

Full stack including Postgres and Redis:

```bash
docker compose -f docker/docker-compose.yml up
```

## 4. Vercel (frontend)

The prototype deploys as-is with no configuration:

```bash
npx vercel --prod
```

No environment variables are required, because nothing external is called. Preview deployments are generated per pull request.

## 5. Production topology

```
                    ┌──────────────┐
   Citizens ───────►│ Vercel Edge  │  Next.js, CDN, per-PR previews
                    └──────┬───────┘
                           │ TLS 1.3
                    ┌──────▼───────────────────────┐
                    │ GCP — asia-south1 (Mumbai)   │
                    │  Cloud Run: FastAPI          │
                    │  Cloud SQL: PostgreSQL       │
                    │  Memorystore: Redis          │
                    │  Secret Manager              │
                    └──────────────────────────────┘
```

**Region is not a preference.** Citizen data must stay in Indian regions for a government pilot, which constrains provider and region choice before anything else is decided.

## 6. CI/CD

`.github/workflows/ci.yml` runs on every push and pull request:

1. Install dependencies (`npm ci`)
2. Type check — `tsc --noEmit`
3. Engine test suite — 77 assertions
4. Production build
5. Secret scan — fails the build on any credential pattern

Deployment to production requires all five to pass plus a manual approval, because this is government-facing.

## 7. Environments

| Environment | Purpose | Data |
|---|---|---|
| Local | Development | Seed data, no external services |
| Preview | Per-PR review | Seed data |
| Staging | Pre-release verification | Synthetic citizens only — never production data |
| Production | Pilot | Real citizen data, Indian region, full audit logging |

Production data is never copied into a lower environment. If a bug needs production data to reproduce, it is reproduced with a synthetic case built to match, not with a real citizen's records.

## 8. Rollout plan

1. **Single district pilot** with the CSC network — MITRA advises, existing portals still take submissions.
2. **Measure** application completion rate and rejection rate against the district's baseline. The pre-application document check should move the rejection rate first; it targets 71% of current causes.
3. **Integrate** DigiLocker for document fetch, then UMANG for submission, once the advisory layer is validated.
4. **Expand** state by state, adding state rule variants ahead of each launch.

## 9. Monitoring

Uptime and latency per route; error rate with alerting; Core Web Vitals from real users, segmented by device class — the median device in the target user base is not the median device of the team building it.

Product metrics: recommendation-to-application conversion, document-check completion, and rejection rate versus the pre-MITRA baseline. That last one is the number the pilot succeeds or fails on.

Logs carry entity IDs only. No PII reaches any log aggregator at any level.

## 10. Rollback

Vercel keeps immutable deployments — rollback is instant via the dashboard or `vercel rollback`. Backend rolls back by redeploying the previous Cloud Run revision. Database migrations are forward-only with an explicit down script reviewed before any migration is applied to production.
