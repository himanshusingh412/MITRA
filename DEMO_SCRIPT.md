# Demo Script

**MITRA** · Bharat Pragati · SIH 2026 · Target runtime **6 minutes**

---

## Before you start

```bash
cd frontend && npm run dev     # http://localhost:3000
```

Have two browser tabs ready: the citizen app at `/`, and `/admin/login` in the second. Set the language switcher to English to begin.

---

## 0 · The opening line (20s)

> "India doesn't have a shortage of welfare schemes. It has a shortage of *access*. Around 71% of rejected applications are not rejected because the citizen didn't qualify — they're rejected because a name was spelled differently on two documents, or a certificate had expired. Those citizens were entitled. Nobody told them until it was too late.
>
> MITRA is the layer that fixes that."

Don't open with the tech stack. Open with the number.

---

## 1 · The home screen (40s)

Land on `/`.

Point out, without clicking:
- **The amber banner at the top** — MITRA has already found a problem with Ravi's documents before he's asked anything.
- **Recommended schemes**, each carrying an eligibility verdict, not just a link.
- **Language switcher** — top right.

> "This is Ravi Kumar, a farmer in Muzaffarpur. He hasn't searched for anything. MITRA already knows what he qualifies for and has already spotted that his income certificate expired 35 days ago."

---

## 2 · Life-event understanding (60s)

In the hero input, type exactly:

```
my daughter is starting college
```

Press send.

> "He described his life, not a scheme name. No dropdowns, no scheme codes."

When the reply lands, point out:
- MITRA detected the life event and **updated his profile**.
- It returned scholarship schemes, each with a verdict.
- Every scheme shown is from the real catalogue — the assistant cannot invent a scheme or a benefit amount.

**Then switch the language to हिंदी** and send:

```
मुझे कौन सी योजनाएँ मिल सकती हैं?
```

> "Same engine, same reasoning, the citizen's own language. This runs entirely on-device — no API key, no data leaving the app."

---

## 3 · Explained eligibility (60s)

Open **Post Matric Scholarship**, and switch the person selector to **Anjali Kumari**.

Scroll to *Your eligibility*.

> "This is what no existing platform does. Not a filtered list — the actual reasoning."

Point at the rule list:
- Green ticks: criteria she meets.
- The progress bar and the written explanation.

> "If she'd been refused, she'd know exactly which criterion to fix. And notice the third state — 'Likely eligible, verify'. Where a state might set the income limit differently, MITRA says so rather than guessing. A wrong 'yes' costs a citizen a day's wage and a bus fare."

---

## 4 · Document verification — the centrepiece (110s)

Go to **Documents → Verify documents**. Keep the person as **Ravi Kumar**.

> "MITRA has read every document and compared each one against every other one."

Walk the three findings:

1. **Income certificate expired** — blocker.
2. **Date of birth differs** between Aadhaar and the land record. Expand it: *day and month appear swapped*.
   > "It doesn't just say 'mismatch'. It identifies the *kind* of error and tells him which document to correct and where to go."
3. Show the **consistency score** and **"what MITRA will fill into your forms"** panel.
   > "When it auto-fills his application, it uses the value from his most authoritative document — Aadhaar — not what he typed. Because that's what the department will verify against."

**Now the part that shows judgement.** Switch the person selector to **Anjali Kumari**:

> "Her marksheet says she was born in 2008. Her Aadhaar says 2009. That's a genuine mismatch — flagged as a blocker before she submits, not discovered after the scholarship is refused."

Then switch back to **Ravi** and point at his PAN card in the documents-checked list:

> "And here's the harder half of the problem. His PAN says 'Rabi Kumar', his Aadhaar says 'Ravi Kumar'. MITRA does **not** flag that — because in Bengali-influenced transliteration, Rabi and Ravi are the same name. Same with 'Ram Dev' and 'Ramdev'.
>
> A checker that flags every spelling variant is useless — people stop reading the warnings. Getting this right is the whole feature."

*(If asked how: phonetic folding plus token-wise Jaro-Winkler. Six real bugs in this logic were caught by the test suite — the details are in `TESTING.md`.)*

---

## 5 · Family dashboard (30s)

Open **Family**.

> "Benefits are managed per household, not per person. One view: Ravi's PM-KISAN, Anjali's scholarship, his father's pension draft — with each person's document issues surfaced next to them. Every other platform makes you log in four times."

---

## 6 · Applications (25s)

Open **Applications**, expand **Ayushman Bharat**.

> "Full timeline. It's stuck on 'action needed' — because of the expired income certificate MITRA flagged on the home screen. The problem, the reason, and the fix are all connected."

---

## 7 · Government portal (60s)

Second tab → `/admin/login` → `officer` / `mitra2026`.

> "Completely separate login, separate session, separate signing secret. A citizen token is not merely unauthorised on this side — it's cryptographically unverifiable."

On the dashboard, scroll to **"Why applications fail"**:

> "This is the evidence base. Name mismatches 31%, expired certificates 22%, date-of-birth inconsistency 18%. That's 71% — and all three are exactly what the document checker prevents."

Open **AI Insights** and point at the drop-off funnel:

> "The steepest fall is between opening the checklist and finishing uploads — 23 points. It's document collection that loses people, not motivation. That's an actionable finding a district officer has never had before."

---

## 8 · Close (25s)

> "MITRA doesn't replace UMANG or DigiLocker — it's the reasoning layer above them. DigiLocker holds your documents; MITRA notices they disagree. UMANG takes applications; MITRA works out which ones you'll actually win.
>
> It runs with no API keys, 20 routes, 77 passing engine tests. And the highest-impact thing it does needs no policy change at all — just checking the paperwork before it's submitted, which today nobody does."

---

## Anticipated questions

**"Is the AI real, or hardcoded?"**
The eligibility reasoning is a deterministic rule engine — deliberately. An LLM deciding entitlement can't be explained to a citizen who's been refused, and can't be defended to an auditor. The rules are data, so a new scheme needs no code change. Language understanding is the AI-shaped part; the *verdict* is auditable. Where an LLM is added, it generates language, never entitlements.

**"How do you handle 1,000+ schemes and state variants?"**
Criteria are stored as JSON rule sets, so scale is a data problem. State variants need rule inheritance, which isn't built — it's named as a gap in `ARCHITECTURE.md` §8. The 18 schemes here are real and complete, chosen to span every rule operator the engine supports.

**"What if the eligibility result is wrong?"**
Three-level output with an explicit *verify* state, every screen framed as advisory, and every result showing its reasoning so a citizen or CSC operator can check the logic themselves. MITRA never claims to be authoritative.

**"What's actually built versus designed?"**
Built and verified: the full citizen app, the admin portal, both engines, 77 tests, a clean 20-route production build. Designed but not built: the FastAPI backend, Prisma persistence, real OCR and DigiLocker integration. The integration points are marked in the code. `TESTING.md` §5 and `SECURITY.md` §11 state the limits explicitly — nothing planned is presented as done.

**"Why no API key?"**
So it runs anywhere, instantly, with no cost and no data leaving the device — and so a judge can clone it and have it working in one command. It also means there's no key to leak.
