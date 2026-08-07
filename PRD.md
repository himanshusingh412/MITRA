# Product Requirements Document (PRD)

**Product:** MITRA
**Track:** Bharat Pragati — Digital Citizen Assistant for Multilingual Access to Government Services and Schemes
**Version:** 0.1 (Phase 0 draft)
**Owner:** MITRA team, SIH 2026

---

## 1. Vision

Every Indian citizen should be able to describe their life situation in their own language and voice, and immediately know: which government schemes they qualify for, what documents they need, how to apply, and what happens next. MITRA is the single AI companion that carries a citizen through that entire journey — replacing dozens of disconnected portals, forms, and helpline calls with one guided, personalized, always-available experience.

We are not building a scheme search engine or an FAQ chatbot. We are building the layer that sits between a citizen's real-life moment (a birth, a job loss, a disability, turning 60) and the government machinery that exists to help them — and making that layer understand context, remember the citizen, and act on their behalf.

## 2. Problem Statement

India has 1,000+ active welfare schemes spread across central ministries, state departments, and portals like UMANG, MyGov, NSP (National Scholarship Portal), CSC, e-Shram, and PMAY. The schemes largely work — the discovery and access layer does not:

- Citizens don't know which schemes apply to them; discovery is word-of-mouth or accidental.
- Eligibility rules are written in bureaucratic language across scattered PDFs and websites.
- Application forms demand documents citizens don't know they need, in formats they don't know how to produce.
- Illiterate, elderly, and rural citizens are excluded by design — most portals assume English/Hindi literacy and desktop access.
- There is no single place to track "what have I applied for, what's pending, what's expiring."
- Families managing benefits for parents, children, and dependents have no consolidated view.

The result: eligible citizens miss benefits not because policy failed them, but because the last-mile discovery-to-delivery experience failed them.

## 3. Goals

### 3.1 Product goals
1. Let a citizen go from "I don't know what I'm eligible for" to "here are my 3 most relevant schemes, explained simply" in under 2 minutes.
2. Make the experience genuinely multilingual and voice-first, not English-first-with-translation-bolted-on.
3. Turn eligibility rules and document requirements into a conversational, step-by-step guided flow instead of a wall of text.
4. Give citizens a persistent, trackable record of applications, documents, and deadlines across their whole family.
5. Give government administrators visibility into demand, drop-off points, and common citizen queries — a feedback loop policy currently lacks.

### 3.2 Hackathon goals (SIH 2026)
1. Demonstrate an end-to-end working prototype covering the full core journey, not isolated screens.
2. Show genuine AI reasoning (eligibility explanation, recommendation, document checks) rather than static content.
3. Present a UI/UX quality bar that reads as "ready for government pilot," not "hackathon demo."
4. Clearly differentiate from a chatbot: multi-step state, memory, proactive reminders, family context.

## 4. Non-goals (out of scope for this build)

- Direct integration with live government backend systems (UMANG/DigiLocker/NSP APIs) — the prototype simulates these with representative data and a clearly marked integration layer.
- Actual disbursal of funds or legally binding submission of applications to government systems.
- Full production-grade identity verification (Aadhaar e-KYC) — simulated in the prototype with a clear "pilot integration point" callout.
- Native mobile apps for MVP (web-first, responsive; `mobile/` is scaffolded for future React Native work).

## 5. User personas

### Persona 1 — Rukmini Devi, 58, farmer's widow, rural Bihar
Class 5 education, speaks Bhojpuri/Hindi, owns a basic smartphone used mainly for calls and WhatsApp. Eligible for widow pension and possibly PM-Kisan continuation but has never applied — doesn't know these exist, can't read the forms, and the nearest CSC is 8 km away. **Needs:** voice-first, local-language interaction; extremely simple flows; document checklist she can act on with help from a family member or CSC operator.

### Persona 2 — Arjun Mehta, 24, recently unemployed IT graduate, Pune
Laid off, urban, comfortable with apps in English, actively searching government support (unemployment schemes, skilling programs) but finds official portals confusing and inconsistent. **Needs:** fast, accurate scheme matching; skips hand-holding on basic UI but wants depth on eligibility edge cases; application tracking across multiple schemes at once.

### Persona 3 — Meena Kumari, 31, mother managing a household in Lucknow
Balancing her children's scholarship applications, her mother-in-law's senior citizen pension, and her own maternity benefit claim. Needs one dashboard for the whole family, not four separate logins and four separate paper trails. **Needs:** family dashboard, shared reminders, ability to act on behalf of dependents.

### Persona 4 — Ramesh Yadav, 45, small business owner, Nagpur
Runs a small shop, wants to know about MSME/business support schemes and loan subsidy schemes, moderately literate, uses a laptop occasionally. **Needs:** business-category scheme filtering, clear ROI/benefit explanation, document checklist tied to business registration.

### Persona 5 — Admin persona: Priya Sharma, District Welfare Officer
Needs to see application volumes, common rejection reasons, complaint trends, and scheme performance by block/district — currently she gets none of this in real time. **Needs:** an admin dashboard with analytics, an approval workflow, and a queries/complaints inbox, kept fully separate from citizen accounts.

## 6. Functional requirements

### FR-1 Authentication
- FR-1.1 Citizens authenticate via Google OAuth (with room for Aadhaar-linked login as a future pilot integration).
- FR-1.2 Admins authenticate via a completely separate login flow and session — no shared cookies, tokens, or UI shell with citizen accounts.
- FR-1.3 Role-based access control (citizen, family member/dependent-managed, CSC operator assisted-mode, admin, super-admin).

### FR-2 AI Citizen Profile
- FR-2.1 On first login, the system builds a structured citizen profile: location, age, gender, occupation, income band, family composition, category (SC/ST/OBC/General/EWS/minority), existing benefits.
- FR-2.2 Profile is conversational — citizen can build it by chatting/speaking naturally, not just filling a form.
- FR-2.3 Profile updates over time as life events are detected or declared.

### FR-3 Life event detection
- FR-3.1 System detects or accepts declared life events (marriage, childbirth, job loss, becoming a student, starting a business, disability onset, turning senior-citizen age) from conversation.
- FR-3.2 Each detected event triggers re-evaluation of scheme eligibility and proactive recommendations.

### FR-4 Eligibility engine
- FR-4.1 Given a citizen profile, the system evaluates eligibility against a structured rules dataset for each scheme (age, income, location, occupation, category, existing benefit conflicts).
- FR-4.2 Eligibility results include a confidence/match level (Eligible / Likely Eligible — verify / Not Eligible) and the specific rule(s) driving the result.

### FR-5 Scheme recommendation
- FR-5.1 Ranked, personalized list of schemes per citizen, filterable by category (education, health, pension, agriculture, business, housing, disability).
- FR-5.2 Recommendations re-rank as profile/life events change.

### FR-6 AI explanation
- FR-6.1 Every scheme has a plain-language, multilingual explanation: what it is, who it's for, what you get, how long it takes.
- FR-6.2 "Explain like I'm new to this" mode that avoids bureaucratic terminology entirely.

### FR-7 Document advisor
- FR-7.1 Per-scheme required document checklist generated from the citizen's profile (only shows what's actually needed for them).
- FR-7.2 Flags missing documents, likely-expired certificates (e.g., income certificate validity), and mismatched uploads.
- FR-7.3 OCR-based extraction to pre-verify uploaded documents against expected fields.

### FR-8 Application assistant
- FR-8.1 Step-by-step guided application flow per scheme.
- FR-8.2 Voice-driven form filling — citizen speaks answers, system fills structured fields.
- FR-8.3 Auto-fill from citizen profile and previously uploaded documents.
- FR-8.4 Visible progress indicator (steps completed / remaining).

### FR-9 Application tracking
- FR-9.1 Status tracking per application (Draft, Submitted, Under Review, Additional Info Needed, Approved, Rejected, Disbursed).
- FR-9.2 Timeline/history view per application.

### FR-10 Reminder engine
- FR-10.1 Deadline reminders (application windows, renewal dates, scholarship cycles, pension re-verification, certificate expiry).
- FR-10.2 Configurable channels (in-app, email; SMS/WhatsApp as future scope).

### FR-11 Family dashboard
- FR-11.1 A citizen can add family members (parents, spouse, children) and view/manage schemes and applications on their behalf where permitted.
- FR-11.2 Consolidated family-level view of active applications, upcoming deadlines, and recommended schemes per member.

### FR-12 CSC / office locator
- FR-12.1 Map-based locator for nearby Common Service Centres and relevant government offices, with directions.

### FR-13 Offline mode
- FR-13.1 Previously loaded scheme details and checklists are cached and readable offline.
- FR-13.2 Clear UI indication of offline vs. live state.

### FR-14 AI conversation
- FR-14.1 Text and voice input/output, multilingual (minimum: Hindi, English + 3 additional Indian languages for MVP demo).
- FR-14.2 Image input for document photos with OCR extraction.
- FR-14.3 Conversation memory — the assistant recalls prior context within and across sessions.

### FR-15 Admin portal
- FR-15.1 Analytics dashboard (applications by scheme/region/status, user growth, drop-off funnel).
- FR-15.2 Application review and approval workflow.
- FR-15.3 Scheme management (create/update/retire scheme entries and eligibility rules).
- FR-15.4 Complaints and citizen queries inbox.
- FR-15.5 AI insights (common failure points, frequently asked questions, emerging life-event trends).

## 7. Non-functional requirements

| Category | Requirement |
|---|---|
| Performance | AI chat response P95 < 3s (mocked/local reasoning in prototype); page load P95 < 2s on 4G |
| Accessibility | WCAG 2.1 AA minimum; screen-reader support; scalable text; high-contrast mode; large tap targets (≥44px) for elderly users |
| Localization | UI + AI responses in Hindi, English + 3 regional languages at MVP; architecture supports adding languages without code changes |
| Availability | Prototype target 99% uptime during demo/judging window; production target 99.9% |
| Security | See [SECURITY.md](SECURITY.md) — OAuth, JWT, RBAC, encrypted data at rest, audit logging, generic auth errors |
| Scalability | Stateless API layer, horizontally scalable; DB read replicas path documented for production |
| Data privacy | Citizen PII encrypted at rest; no PII in logs; admin and citizen data planes fully isolated |
| Usability | Every core flow completable by a low-literacy user via voice alone |
| Offline resilience | Core scheme content available offline after first load |

## 8. Success metrics

### Hackathon/demo metrics
- End-to-end journey (login → recommendation → document check → application submitted) completable live in under 5 minutes.
- Zero broken links, dummy buttons, or placeholder screens across the demo path.
- Judges can ask "how does eligibility reasoning work" and get a concrete, inspectable answer (not a black box).

### Product metrics (post-pilot targets, for narrative/roadmap purposes)
- % of profiled citizens who receive at least one high-confidence scheme match.
- Time from account creation to first application submitted.
- Application completion rate (started vs. submitted).
- Reduction in "I didn't know this scheme existed" — measured via onboarding survey in pilot.
- Admin-reported reduction in query/complaint resolution time.

## 9. MVP scope (this hackathon build)

In scope:
- Citizen: Google login, AI profile builder, life-event-driven recommendations, eligibility engine over 15–20 real schemes, AI explanations, document checklist advisor, guided application flow with progress tracking, application tracking dashboard, reminder engine (in-app), family dashboard, CSC locator (static/representative data), offline caching of scheme content, multilingual text UI + voice input/output demo.
- Admin: separate login, analytics dashboard, applications list + approval workflow, scheme management (CRUD on the demo dataset), complaints/queries inbox, AI insights panel.
- AI: rule-based + LLM-hybrid eligibility and recommendation engine, RAG-style explanation over scheme documents, OCR-based document field extraction, conversation memory within session.

Explicitly deferred to future scope (Section 10):
- Live government system integrations, real Aadhaar e-KYC, SMS/WhatsApp channels, native mobile app, real-money disbursal tracking, multi-state full scheme catalogue (1,000+ schemes).

## 10. Future scope

- Full integration with UMANG, DigiLocker, NSP, e-Shram, and state portals for live application submission and status sync.
- Aadhaar-based e-KYC and DigiLocker document auto-fetch.
- WhatsApp and SMS-based assistant for feature-phone accessibility.
- Native Android/iOS apps (`mobile/` scaffold) with offline-first sync.
- Full 1,000+ scheme national catalogue with state-specific rule variants.
- Predictive proactive outreach ("you're about to age out of this scheme's income bracket").
- CSC operator co-pilot mode for assisted applications.
- Grievance redressal SLA tracking and automated escalation.

## 11. Assumptions & risks

- **Assumption:** A curated dataset of 15–20 real, well-documented schemes is sufficient to demonstrate the eligibility/recommendation engine's generalizability to the full catalogue.
- **Assumption:** Judges will evaluate against a working prototype with realistic mocked backends where live government APIs are unavailable, not a fully production-integrated system.
- **Risk:** Multilingual voice quality depends on underlying STT/TTS providers; prototype will clearly label which languages are demo-quality vs. production-target.
- **Risk:** Eligibility rules in the real world have exceptions and state-specific variants beyond what a hackathon dataset can capture; UI must avoid presenting eligibility results as legally authoritative ("Likely Eligible — verify at CSC" framing throughout, not a guarantee).
