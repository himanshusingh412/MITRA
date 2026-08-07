# Features

Full feature catalogue for MITRA, grouped by module. Status legend: **MVP** = built in this hackathon prototype · **Future** = documented roadmap, not built now.

## 1. Authentication

| Feature | Status |
|---|---|
| Google OAuth login (citizen) | MVP |
| Separate admin login (credentials-based, isolated session) | MVP |
| JWT session management, secure httpOnly cookies | MVP |
| Role-based access control (citizen / dependent-managed / CSC-assisted / admin / super-admin) | MVP |
| Aadhaar-linked e-KYC login | Future |
| Multi-factor authentication for admin | Future |

## 2. Citizen dashboard

| Feature | Status |
|---|---|
| AI Assistant home (chat entry point) | MVP |
| My Schemes (recommended + saved) | MVP |
| Applications (active, drafts, history) | MVP |
| Family Dashboard | MVP |
| Notifications centre | MVP |
| Saved Documents vault | MVP |
| Settings (language, accessibility, notification preferences) | MVP |

## 3. AI conversation

| Feature | Status |
|---|---|
| Text chat | MVP |
| Voice input (speech-to-text) | MVP (demo-quality) |
| Voice output (text-to-speech) | MVP (demo-quality) |
| Image upload for document photos | MVP |
| OCR extraction from images | MVP |
| Multilingual UI + responses (Hindi, English + 3 regional languages) | MVP |
| Conversation memory (session + returning-user context) | MVP |
| Full production-grade STT/TTS for all 22 scheduled languages | Future |
| WhatsApp/SMS channel | Future |

## 4. Life event detection

| Feature | Status |
|---|---|
| Declared life events (user states directly: "I lost my job") | MVP |
| Conversational inference of life events from chat context | MVP |
| Supported event types: marriage, childbirth/new parent, job loss, becoming a student, starting a business, disability onset, turning senior citizen (60+) | MVP |
| Automatic re-ranking of recommendations on new life event | MVP |
| Predictive/proactive life-event anticipation (e.g. approaching age thresholds) | Future |

## 5. AI scheme engine

| Feature | Status |
|---|---|
| Eligibility evaluation using location, income, occupation, age, gender, family, state, category, existing benefits | MVP |
| Ranked personalized scheme recommendations | MVP |
| Category filters (education, health, pension, agriculture, business, housing, disability, women & child) | MVP |
| Match confidence levels (Eligible / Likely Eligible – verify / Not Eligible) with rule-level explanation | MVP |
| Full 1,000+ scheme national + state catalogue | Future |
| State-specific rule variant engine | Future |

## 6. AI document advisor

| Feature | Status |
|---|---|
| Personalized required-document checklist per scheme | MVP |
| Missing document detection | MVP |
| Expired/soon-to-expire certificate flagging (e.g. income certificate validity window) | MVP |
| Wrong-upload / mismatched document detection via OCR field comparison | MVP |
| DigiLocker auto-fetch of verified documents | Future |

## 7. Application assistant

| Feature | Status |
|---|---|
| Step-by-step guided application flow | MVP |
| Auto-fill from citizen profile and prior uploads | MVP |
| Voice-driven form filling | MVP (demo-quality) |
| Progress tracking (steps done / remaining, save-and-resume) | MVP |
| Direct submission into live government portals | Future |

## 8. Reminder engine

| Feature | Status |
|---|---|
| Deadline reminders (application windows) | MVP |
| Renewal reminders (pension re-verification, certificate expiry) | MVP |
| Scholarship-cycle reminders | MVP |
| In-app + email notification channels | MVP |
| SMS/WhatsApp reminders | Future |

## 9. Family dashboard

| Feature | Status |
|---|---|
| Add/manage family members (parents, spouse, children) | MVP |
| Per-member scheme recommendations and application tracking | MVP |
| Consolidated family deadline calendar | MVP |
| Delegated "act on behalf of" permission model | MVP (simplified) / Future (full consent & audit flow) |

## 10. CSC locator

| Feature | Status |
|---|---|
| Map view of nearby CSCs and government offices (representative data) | MVP |
| Directions / distance | MVP |
| Live CSC operational status and queue estimates | Future |

## 11. Offline mode

| Feature | Status |
|---|---|
| Cache viewed scheme details and checklists for offline reading | MVP |
| Offline/online state indicator | MVP |
| Full offline application drafting with background sync | Future |

## 12. Admin portal

| Feature | Status |
|---|---|
| Isolated admin login and session | MVP |
| Analytics dashboard (applications, users, schemes, funnel drop-off) | MVP |
| Applications management + approval workflow | MVP |
| User management | MVP |
| Complaints / citizen queries inbox | MVP |
| Scheme management (CRUD on demo dataset) | MVP |
| Reports (exportable summaries) | MVP |
| AI insights (common questions, drop-off causes, emerging trends) | MVP |
| Notifications to citizens (broadcast/targeted) | MVP |
| Multi-department / multi-state RBAC hierarchy | Future |

## 13. AI infrastructure

| Feature | Status |
|---|---|
| RAG over scheme documents for grounded explanations | MVP |
| Vector database for semantic scheme search | MVP |
| Eligibility reasoning engine (rules + LLM hybrid) | MVP |
| Recommendation engine | MVP |
| Document verification (OCR-based field matching) | MVP |
| AI form-filling assistant | MVP |
| Reminder engine (rule-based scheduling) | MVP |
| Translation layer | MVP |
| Conversation memory store | MVP |
| Continuous fine-tuning from admin-reviewed corrections | Future |

## 14. Security & compliance

See [SECURITY.md](SECURITY.md) for full detail. MVP includes: OAuth, JWT, rate limiting, CAPTCHA on sensitive actions, RBAC, audit logs, encrypted database fields for PII, generic authentication error messages, environment-based secrets.
