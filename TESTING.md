# Testing

**Phase 10 deliverable** · MITRA

---

## 1. What is actually tested today

`frontend/lib/__tests__/engines.test.ts` — **77 assertions, all passing.**

```bash
cd frontend && npx tsx lib/__tests__/engines.test.ts
```

Coverage is concentrated where a wrong answer harms a citizen: eligibility reasoning and document verification. UI chrome is not unit-tested; the engines are.

| Area | Assertions | What it protects |
|---|---|---|
| Fuzzy name matching | 15 | A citizen is not wrongly told their documents disagree |
| Date parsing & comparison | 11 | Format variation is not mistaken for a different birth date |
| Address comparison | 2 | PIN mismatch is caught; formatting differences are not |
| Cross-document verification | 12 | Real inconsistencies found, false ones suppressed |
| Eligibility engine | 9 | Verdicts are correct and always explained |
| Recommendation ranking | 5 | Ordering, filtering, held-benefit demotion |
| Document checklist | 3 | Conditional documents respect the profile |
| Assistant engine | 13 | Intent, life events, multilingual, determinism |
| Dataset integrity | 7 | Every scheme is complete and well-formed |

### Bugs the suite actually caught

These were found by tests, not inspection — which is the argument for having written them:

1. **`Lakshmi` vs `Laxmi` failed to match.** The `kh→k` rule ran before `ksh→x`, consuming the letters `ksh` needed. Fixed by ordering longest clusters first.
2. **`Rabi` vs `Ravi` flagged as a mismatch.** No b/v folding, despite that being one of the most common transliteration variants in eastern India. Fixed by folding `b/v/w` into one phoneme class.
3. **Rural citizen shown as "verify" for an urban-only scheme.** A near-miss heuristic was too lenient and applied to categorical failures. Now only numeric thresholds soften to *verify*; categorical failures stay *not eligible*, because sending someone to a CSC for a scheme they cannot get wastes a real trip.
4. **`"my wife is pregnant"` did not detect childbirth.** `\bpregnan\b` cannot match `pregnant`. Fixed by using open-ended prefixes for inflected forms.
5. **`"my father turned 60"` did not detect senior-citizen status.** Pattern only matched the literal `60 year`. Fixed with an age-mention pattern covering 60–99.
6. **Aadhaar numbers compared against PAN numbers**, producing a false blocker for every citizen. Identifier comparison is now scoped to documents that should carry the same number. This one alone was dropping the consistency score to 0%.

After fixes 4–6, the primary test citizen's report went from 10 issues (7 of them false) to 3 real ones. That ratio is the difference between a feature people use and one they learn to ignore.

## 2. Test strategy by layer

### Unit — engines (implemented)
Pure functions over data, so they need no mocks and run in milliseconds. Every eligibility verdict, every fuzzy comparison, every ranking decision.

**Determinism is explicitly asserted.** The same question must always produce the same answer — a citizen who asks twice and gets different advice has no reason to trust either.

### Integration — API (planned, Phase 5 backend)
Every endpoint gets a happy path and a failure path. Auth boundaries get an explicit test that a citizen token is rejected on admin routes, and vice versa.

### End-to-end — critical journeys (planned)
Playwright, covering the five journeys that must never break:

1. Sign in → profile → recommendations appear
2. Ask a life-event question → relevant schemes returned with verdicts
3. Open a scheme → see rule-by-rule reasoning → open checklist
4. Run document verification → see issues with corrections
5. Admin signs in separately → reviews and decides an application

### Accessibility (partially implemented, to be automated)
`axe-core` in CI, failing the build on violations. Manual checks already applied during build: keyboard-only navigation, visible focus rings, 44px tap targets, colour-independent status (every eligibility badge carries an icon and words, not just colour), 200% zoom without layout break, `prefers-reduced-motion` honoured.

### AI output evaluation
Because the assistant is deterministic and grounded in the catalogue, it is testable in a way an LLM is not:

- Every scheme referenced in a reply must exist in the catalogue (no hallucinated schemes).
- Every benefit figure must match the catalogue exactly.
- Each supported locale must return its own script.
- Identical input must return identical output.

If an LLM is later introduced for language generation, these assertions become the regression harness that keeps it from inventing entitlements.

### Performance (planned)
Budgets: LCP < 2.5s on simulated 4G, TTI < 3.5s, First Load JS under 320KB per route. Current build is 270–302KB per route, within budget.

### Security (planned)
Auth boundary tests, rate-limit tests, injection fuzzing, dependency scanning on every push, secret scanning in CI.

## 3. Edge cases catalogued

Handled and asserted:

- Citizen with no documents → report says so rather than reporting 100% consistent
- Year-only date of birth (older Aadhaar records) → matched, not flagged
- Day/month transposition → flagged as a distinct, softer case than a wrong date
- Masked identifiers (`XXXX XXXX 1234`) → compared on the visible tail
- Name with an initial (`R Kumar` vs `Ravi Kumar`) → matched
- Extra surname on one document → matched, noted
- Scheme with zero matching schemes for a filter → explicit empty state, never a blank screen
- Corrupt `localStorage` → caught, app still renders
- `localStorage` unavailable (private mode) → app runs, preferences do not persist
- Offline → cached content readable, banner shown

Known gaps, not yet handled:

- State-specific rule variants are not modelled, so a citizen in a state with different income ceilings may get a verdict that is right centrally and wrong locally. The *verify* level partially mitigates this; a rule-inheritance mechanism is the real fix.
- OCR confidence is stored but not yet used to weight verification decisions. A low-confidence extraction currently carries the same weight as a clean one.
- No test yet for very large document sets; pairwise comparison is O(n²).

## 4. Running everything

```bash
cd frontend
npx tsx lib/__tests__/engines.test.ts   # engine suite — 77 assertions
npx tsc --noEmit                        # type check
npx next build                          # production build, 20 routes
```

All three pass as of this commit.

## 5. Honest limitations

There is no formal coverage measurement, no CI pipeline running these automatically yet, and no E2E or accessibility automation — those are written up as strategy above, not claimed as done. The engine suite is real and passing; everything else in this document is a plan. Marking planned work as complete would defeat the purpose of a test document.
