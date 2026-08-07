# Security

**Phase 9 deliverable** · MITRA

MITRA handles some of the most sensitive data a citizen has: identity documents, income, caste category, disability status and family composition. A leak here is not an inconvenience — it is a safety issue for the people least able to absorb it. This document states what the prototype does today and what a deployment must do.

---

## 1. Prototype security posture — stated honestly

| Control | Prototype | Deployment target |
|---|---|---|
| External data transmission | **None.** All reasoning is local; no API keys, no outbound calls | TLS 1.3 to GCP India region |
| Data at rest | In browser memory only; cleared on refresh | Postgres, AES-256, PII columns application-encrypted |
| Persisted client state | Language and theme only | Session token in httpOnly cookie |
| Authentication | Demo credential check on the admin route | Google OAuth (citizen) + departmental IdP with MFA (admin) |
| Audit logging | In-session, visible in the admin queue | Append-only `audit_logs`, immutable |

The prototype's strongest security property is that **it has no attack surface for data exfiltration** — there is no backend to breach and no key to steal. That property disappears the moment it is deployed, which is why the rest of this document exists.

## 2. Authentication

### Citizen
Google OAuth 2.0 with PKCE. MITRA never handles a citizen password. The OAuth subject (`googleSub`) is the account key, unique-constrained so accounts cannot be duplicated.

### Administrator
A completely separate flow — separate route, separate login page, separate session storage, separate token audience. This is architectural, not a role check on a shared session.

```
Citizen token:  aud = "mitra:citizen",  signed with JWT_CITIZEN_SECRET
Admin token:    aud = "mitra:admin",    signed with JWT_ADMIN_SECRET
```

Different secrets mean a citizen token is not merely *unauthorised* on an admin route — it is **unverifiable**. Token confusion between planes is impossible by construction.

Admin accounts additionally require MFA, and lock after 5 failed attempts (`failedLogins`, `lockedUntil` on the `Admin` model).

### Generic authentication errors

Every failed sign-in returns the identical message — "Those sign-in details were not recognised" — regardless of whether the account exists, the password was wrong, or the account is disabled. Distinguishing these lets an attacker enumerate valid government officer IDs. Response timing is equalised for the same reason.

## 3. Session management

- Access token: 15 minutes. Refresh token: 7 days, rotated on use.
- Tokens in `httpOnly`, `Secure`, `SameSite=Strict` cookies — never in `localStorage`, which is readable by any injected script.
- Sessions are server-invalidatable via a Redis deny-list.
- The prototype deliberately stores only non-sensitive preferences in `localStorage`; there is no token to steal.

## 4. Authorisation (RBAC)

| Role | Scope |
|---|---|
| `citizen` | Own record, and family members with recorded consent |
| `csc_operator` | Assisted mode for a citizen present and consenting; session-scoped, fully audited |
| `block_officer` | Applications within their block |
| `district_officer` | Applications, complaints and analytics within their district |
| `state_admin` | State-wide, plus scheme management |
| `super_admin` | Platform administration; cannot read individual citizen documents |

Two rules that matter:

- **Authorisation is enforced server-side on every request**, never inferred from the UI. A hidden button is not a permission.
- **Acting on behalf of an adult family member requires recorded consent** (`FamilyMember.canActOnBehalf` + `consentAt`). Household access is not assumed from relationship.

## 5. Data protection

### Encryption
- In transit: TLS 1.3, HSTS with preload.
- At rest: AES-256 at the database layer, plus application-level encryption on the highest-sensitivity columns — `Document.extracted` (OCR-extracted identity fields), phone, and income.
- Keys in a managed KMS, rotated quarterly, never in the repository or environment files.

### PII in logs — never
Names, Aadhaar numbers, addresses, dates of birth and OCR output are never written to application logs at any level. Log lines reference entity IDs. Audit-log `changes` are redacted before write. This is a hard rule, not a guideline, because logs are routinely shipped to third-party aggregators.

### Data minimisation and retention
MITRA stores only fields that a scheme rule actually reads. Documents are retained while an application is active plus 12 months, then purged. Citizens can delete their account; deletion is a soft delete followed by a hard purge within 30 days, retaining only the anonymised aggregate counts that the audit trail requires.

### Data residency
All citizen data stays in Indian cloud regions. This is a hard requirement for any government pilot, and it constrains provider choice.

## 6. Input handling

- **Every input validated server-side** with Pydantic schemas, regardless of client validation. Client validation is a usability feature, not a security control.
- **SQL injection**: Prisma parameterises all queries. No string-built SQL anywhere.
- **XSS**: React escapes by default; `dangerouslySetInnerHTML` is not used in this codebase. The assistant renders `**bold**` through an explicit parser rather than by injecting HTML — deliberately, since assistant output is the one place user-influenced text reaches the renderer.
- **File uploads**: content-type sniffed rather than trusted, size-capped, stored outside the web root with generated names, and scanned before OCR.

## 7. Rate limiting and abuse

| Endpoint | Limit |
|---|---|
| Citizen login | 10 / hour / IP |
| Admin login | 5 / hour / IP, then account lock |
| Document upload | 20 / hour / account |
| Assistant | 60 / minute / account |
| General API | 100 / minute / account |

CAPTCHA on sign-in after 3 failures and on document upload. Redis-backed sliding window, so limits hold across horizontally scaled instances.

## 8. Security headers

Set in `next.config.mjs` today: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` that denies camera and grants geolocation and microphone only to same-origin (needed for the CSC locator and voice input).

Deployment adds CSP with nonces, HSTS with preload, and CSRF double-submit tokens on all state-changing requests.

## 9. Secrets

- No secret is ever committed. `.env` is gitignored; only `.env.example` with placeholders is tracked.
- **A credential shared over any insecure channel — chat, email, a screenshot, an issue — is considered burned and must be rotated.** Removing it from a file does not un-leak it.
- Production secrets live in Secret Manager, injected at runtime, never baked into images.
- CI scans every push for credential patterns and fails the build on a hit.

## 10. Threat model

| Threat | Mitigation |
|---|---|
| Officer ID enumeration | Generic auth errors, equalised timing, rate limits |
| Citizen token replayed on admin routes | Separate signing secrets and audiences — cryptographically impossible |
| Mass document exfiltration by a compromised admin account | RBAC scoping, MFA, per-access audit logging, anomaly alerting on bulk reads |
| Malicious upload triggering OCR exploit | Type sniffing, size caps, sandboxed OCR, malware scan |
| Insider browsing citizen records | Every read logged with actor and IP; audit table append-only |
| Session hijack via XSS | httpOnly cookies, CSP, no `innerHTML` |
| Coerced access to a dependent's data | Explicit consent record required, timestamped |

## 11. What is deliberately not claimed

The prototype has not undergone penetration testing, a formal threat-modelling review, or third-party audit. The controls in sections 2–10 describe the deployment design; only the prototype column in section 1 describes what has actually been built and verified. Presenting design intent as implemented security would be the wrong thing to do in a document like this.

Before any pilot handling real citizen data: independent security review, penetration test, DPDP Act compliance assessment, and a signed data-processing agreement with each cloud provider.
