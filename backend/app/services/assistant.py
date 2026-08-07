"""Offline conversational assistant.

Port of frontend/lib/assistant.ts. Combines intent matching, life-event detection and
the deterministic eligibility engine to produce grounded answers.

Because every reply is derived from the scheme catalogue, the assistant cannot invent
a scheme or a benefit amount. That property is what makes it safe to put in front of a
citizen making a decision about money they need.
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Any

from app.core.config import settings
from app.services.catalogue import all_schemes, get_scheme, sector_labels
from app.services.eligibility import evaluate_scheme, recommend_schemes


def call_gemini_ai(prompt: str, context: str = "", locale: str = "en") -> str | None:
    """Calls Gemini API using settings.AI_API_KEY and settings.AI_MODEL."""
    if not settings.AI_API_KEY:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.AI_MODEL}:generateContent?key={settings.AI_API_KEY}"

    system_instruction = (
        f"You are MITRA, an empathetic, highly accurate AI assistant for Indian government schemes and citizen services.\n"
        f"Target language/locale: {locale}.\n"
        f"Context on user's profile and matching schemes:\n{context}\n"
        f"Respond concisely, clearly, and directly in the user's language without hallucinating unverified government rules."
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{system_instruction}\n\nUser Question: {prompt}"}],
            }
        ],
        "generationConfig": {
            "temperature": settings.AI_TEMPERATURE,
            "maxOutputTokens": settings.AI_MAX_OUTPUT_TOKENS,
        },
    }

    headers = {"Content-Type": "application/json"}
    data = json.dumps(payload).encode("utf-8")

    try:
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            res_json = json.loads(resp.read().decode("utf-8"))
            candidates = res_json.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
    except Exception as e:
        print(f"Gemini API call warning: {e}")
        return None
    return None

# Prefixes are deliberately open-ended (`pregnan` not `\bpregnan\b`) so inflected forms
# match without enumerating every ending. Hinglish and transliterated terms are included
# because that is how people actually type.
_LIFE_EVENT_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("job-loss", re.compile(r"\b(lost|losing|left)\s+(my\s+)?job|unemploy|laid.?off|jobless|no work|naukri|berozgar|retrench", re.I)),
    ("marriage", re.compile(r"\b(marri|wedding|shaadi|husband|wife|spouse)", re.I)),
    ("childbirth", re.compile(r"\b(pregnan|baby|newborn|new born|child ?birth|delivery|maternity|expecting|beti hui|daughter born|son born|became a (mother|father))", re.I)),
    ("started-studies", re.compile(r"\b(college|school|admission|student|study|studies|studying|scholarship|padhai|degree|class 1[012]|university)", re.I)),
    ("started-business", re.compile(r"\b(business|shop|startup|start.?up|self.?employ|enterprise|dukaan|udyam|artisan|craft)", re.I)),
    ("disability", re.compile(r"\b(disab|handicap|divyang|blind|deaf|wheelchair|paralys)", re.I)),
    ("senior-citizen", re.compile(r"\b(old.?age|senior|retire|retirement|pension|budhapa|elderly|buzurg)|\b(turn(ed|ing)?|is|aged)\s+(6[0-9]|[7-9][0-9])\b|\b(6[0-9]|[7-9][0-9])\s*(years?|saal)\s*old\b", re.I)),
    ("farming-season", re.compile(r"\b(farm|crop|kisan|agricult|sowing|harvest|kheti|cultivat)", re.I)),
    ("bereavement", re.compile(r"\b(widow|passed away|died|death|husband died|vidhwa|bereave)", re.I)),
    ("bought-home", re.compile(r"\b(house|home|awas|makaan|housing|pucca|kutcha)", re.I)),
]

_SECTOR_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("health", re.compile(r"\b(health|hospital|medical|illness|treatment|ayushman|bimari|swasthya)", re.I)),
    ("education", re.compile(r"\b(education|scholarship|school|college|student|fees|padhai)", re.I)),
    ("housing", re.compile(r"\b(housing|house|home|awas|makaan)", re.I)),
    ("pension", re.compile(r"\b(pension|old age|retire|budhapa)", re.I)),
    ("agriculture", re.compile(r"\b(farm|kisan|crop|agricult|kheti)", re.I)),
    ("business", re.compile(r"\b(business|loan|mudra|shop|artisan|vishwakarma)", re.I)),
    ("employment", re.compile(r"\b(job|employ|work|rozgar|labour|shram)", re.I)),
    ("women-child", re.compile(r"\b(women|girl|child|daughter|mother|beti|mahila)", re.I)),
    ("disability", re.compile(r"\b(disab|divyang|handicap)", re.I)),
    ("financial", re.compile(r"\b(insurance|bima|savings|deposit|accident)", re.I)),
]

# Life-event phrases are interpolated into a sentence, so they must be translated too.
# Leaving them English produced Hindi sentences with an English clause in the middle —
# exactly the "translated UI, English content" failure this product exists to avoid.
_LIFE_EVENT_COPY: dict[str, dict[str, str]] = {
    "en": {
        "job-loss": "losing your job",
        "marriage": "getting married",
        "childbirth": "a new child in the family",
        "started-studies": "starting your studies",
        "started-business": "starting a business",
        "disability": "a disability in the family",
        "senior-citizen": "reaching senior-citizen age",
        "farming-season": "your farming work",
        "bought-home": "housing",
        "bereavement": "the loss in your family",
    },
    "hi": {
        "job-loss": "नौकरी छूटने",
        "marriage": "विवाह",
        "childbirth": "परिवार में नए बच्चे",
        "started-studies": "पढ़ाई शुरू करने",
        "started-business": "व्यवसाय शुरू करने",
        "disability": "परिवार में दिव्यांगता",
        "senior-citizen": "वरिष्ठ नागरिक आयु",
        "farming-season": "खेती के काम",
        "bought-home": "आवास",
        "bereavement": "परिवार में हुई क्षति",
    },
    "bn": {
        "job-loss": "চাকরি হারানোর",
        "marriage": "বিবাহের",
        "childbirth": "পরিবারে নতুন সন্তানের",
        "started-studies": "পড়াশোনা শুরু করার",
        "started-business": "ব্যবসা শুরু করার",
        "disability": "পরিবারে প্রতিবন্ধকতার",
        "senior-citizen": "প্রবীণ নাগরিক বয়সের",
        "farming-season": "কৃষিকাজের",
        "bought-home": "বাসস্থানের",
        "bereavement": "পরিবারে শোকের",
    },
    "ta": {
        "job-loss": "வேலை இழந்தது",
        "marriage": "திருமணம்",
        "childbirth": "குடும்பத்தில் புதிய குழந்தை",
        "started-studies": "படிப்பைத் தொடங்கியது",
        "started-business": "தொழில் தொடங்கியது",
        "disability": "குடும்பத்தில் இயலாமை",
        "senior-citizen": "மூத்த குடிமகன் வயது",
        "farming-season": "விவசாய வேலை",
        "bought-home": "வீட்டுவசதி",
        "bereavement": "குடும்பத்தில் இழப்பு",
    },
    "mr": {
        "job-loss": "नोकरी गमावण्याचा",
        "marriage": "विवाहाचा",
        "childbirth": "कुटुंबातील नवीन बाळाचा",
        "started-studies": "शिक्षण सुरू करण्याचा",
        "started-business": "व्यवसाय सुरू करण्याचा",
        "disability": "कुटुंबातील दिव्यांगत्वाचा",
        "senior-citizen": "ज्येष्ठ नागरिक वयाचा",
        "farming-season": "शेतीच्या कामाचा",
        "bought-home": "घराचा",
        "bereavement": "कुटुंबातील दुःखाचा",
    },
}


def _life_event_copy(event: str, locale: str) -> str:
    table = _LIFE_EVENT_COPY.get(locale) or _LIFE_EVENT_COPY["en"]
    return table.get(event) or _LIFE_EVENT_COPY["en"].get(event, "that")

_T: dict[str, dict[str, str]] = {
    "en": {
        "greeting": "Namaste {name}. Tell me what is happening in your life right now — a new job, a child starting college, a parent turning 60 — and I will find the schemes that fit you.",
        "foundFor": "Because you mentioned {event}, these are the schemes worth looking at first:",
        "topMatches": "Based on your profile, here are your strongest matches right now:",
        "noMatch": 'I could not find a confident match for that. Try describing your situation in plain words — for example, "my daughter is starting college" or "I want to open a shop".',
        "docsIntro": "Here is what you will need. I only list documents that apply to your own profile:",
        "trackIntro": "You can see every application, its stage and what it is waiting on, in one place.",
        "renewIntro": "These are the documents and benefits that need renewing before they lapse.",
        "helpText": "I can do four things for you: find schemes that match your life situation, check whether you are eligible and explain why, tell you exactly which documents you need, and track applications you have already sent.",
        "eligibleFor": "You look eligible for {n} of these. Open any card to see the exact reasoning.",
    },
    "hi": {
        "greeting": "नमस्ते {name}। अभी आपके जीवन में जो चल रहा है वह बताइए — नई नौकरी, बच्चे का कॉलेज, माता-पिता का 60 वर्ष का होना — मैं आपके लिए सही योजनाएँ ढूँढ दूँगा।",
        "foundFor": "आपने {event} का ज़िक्र किया, इसलिए पहले ये योजनाएँ देखिए:",
        "topMatches": "आपकी प्रोफ़ाइल के आधार पर, ये आपके लिए सबसे उपयुक्त योजनाएँ हैं:",
        "noMatch": "मुझे इसका सही मिलान नहीं मिला। अपनी स्थिति सरल शब्दों में बताइए।",
        "docsIntro": "आपको ये दस्तावेज़ चाहिए होंगे:",
        "trackIntro": "आपके सभी आवेदन और उनकी स्थिति एक जगह।",
        "renewIntro": "इन दस्तावेज़ों का नवीनीकरण समय रहते करना है।",
        "helpText": "मैं योजनाएँ ढूँढ सकता हूँ, पात्रता जाँच सकता हूँ, दस्तावेज़ बता सकता हूँ, और आवेदन ट्रैक कर सकता हूँ।",
        "eligibleFor": "इनमें से {n} के लिए आप पात्र लगते हैं।",
    },
    "bn": {
        "greeting": "নমস্কার {name}। আপনার জীবনে এখন কী ঘটছে বলুন — আমি উপযুক্ত প্রকল্প খুঁজে দেব।",
        "foundFor": "আপনি {event} উল্লেখ করেছেন, তাই প্রথমে এই প্রকল্পগুলি দেখুন:",
        "topMatches": "আপনার প্রোফাইল অনুযায়ী, এইগুলি সবচেয়ে উপযুক্ত:",
        "noMatch": "সঠিক মিল পাইনি। সহজ ভাষায় আপনার পরিস্থিতি বলুন।",
        "docsIntro": "আপনার এই নথিগুলি লাগবে:",
        "trackIntro": "আপনার সব আবেদন এক জায়গায়।",
        "renewIntro": "এই নথিগুলি শীঘ্রই নবীকরণ করতে হবে।",
        "helpText": "আমি প্রকল্প খুঁজে দিতে, যোগ্যতা যাচাই করতে এবং আবেদন ট্র্যাক করতে পারি।",
        "eligibleFor": "এর মধ্যে {n}টির জন্য আপনি যোগ্য।",
    },
    "ta": {
        "greeting": "வணக்கம் {name}. உங்கள் வாழ்க்கையில் இப்போது என்ன நடக்கிறது என்று சொல்லுங்கள்.",
        "foundFor": "நீங்கள் {event} பற்றி குறிப்பிட்டதால், முதலில் இந்தத் திட்டங்களைப் பாருங்கள்:",
        "topMatches": "உங்கள் சுயவிவரத்தின் அடிப்படையில், இவை மிகவும் பொருத்தமானவை:",
        "noMatch": "சரியான பொருத்தம் கிடைக்கவில்லை.",
        "docsIntro": "உங்களுக்கு இந்த ஆவணங்கள் தேவைப்படும்:",
        "trackIntro": "உங்கள் அனைத்து விண்ணப்பங்களும் ஒரே இடத்தில்.",
        "renewIntro": "இந்த ஆவணங்களைப் புதுப்பிக்க வேண்டும்.",
        "helpText": "திட்டங்களைக் கண்டறிதல், தகுதி சரிபார்ப்பு, விண்ணப்பக் கண்காணிப்பு.",
        "eligibleFor": "இவற்றில் {n} திட்டங்களுக்கு நீங்கள் தகுதியுடையவர்.",
    },
    "mr": {
        "greeting": "नमस्कार {name}. तुमच्या आयुष्यात आत्ता काय चालले आहे ते सांगा.",
        "foundFor": "तुम्ही {event} चा उल्लेख केला, म्हणून आधी या योजना पहा:",
        "topMatches": "तुमच्या प्रोफाइलनुसार, या सर्वात योग्य आहेत:",
        "noMatch": "नेमके जुळणारे सापडले नाही.",
        "docsIntro": "तुम्हाला ही कागदपत्रे लागतील:",
        "trackIntro": "तुमचे सर्व अर्ज एकाच ठिकाणी.",
        "renewIntro": "या कागदपत्रांचे नूतनीकरण करावे लागेल.",
        "helpText": "योजना शोधणे, पात्रता तपासणे आणि अर्ज ट्रॅक करणे.",
        "eligibleFor": "यापैकी {n} योजनांसाठी तुम्ही पात्र आहात.",
    },
}


def _t(locale: str, key: str, **vars: Any) -> str:
    template = _T.get(locale, {}).get(key) or _T["en"].get(key, key)
    for k, v in vars.items():
        template = template.replace("{" + k + "}", str(v))
    return template


def detect_life_events(text: str) -> list[str]:
    return [event for event, pattern in _LIFE_EVENT_PATTERNS if pattern.search(text)]


def _detect_intent(text: str) -> dict[str, Any]:
    t = text.strip()

    if re.match(r"^(hi|hello|hey|namaste|namaskar|pranam)\b", t, re.I) or len(t) < 3:
        return {"intent": "greeting"}
    if re.search(r"\b(track|status|where is my|kahan hai|application status)\b", t, re.I):
        return {"intent": "track"}
    if re.search(r"\b(document|paper|kagaz|certificate|what do i need|kya chahiye)\b", t, re.I):
        return {"intent": "documents"}
    if re.search(r"\b(renew|expir|validity|update my)\b", t, re.I):
        return {"intent": "renew"}
    if re.search(r"\b(eligible|eligibility|qualify|patrata|can i apply|am i)\b", t, re.I):
        return {"intent": "check-eligibility"}
    if re.search(r"\b(help|how does|what can you|guide|samajh)\b", t, re.I):
        return {"intent": "help"}

    for scheme in all_schemes():
        short = re.escape(scheme["shortName"])
        loose = scheme["id"].replace("-", "[ -]?")
        if re.search(rf"\b{short}\b", t, re.I) or re.search(rf"\b{loose}\b", t, re.I):
            return {"intent": "scheme-detail", "scheme": scheme}

    for event, pattern in _LIFE_EVENT_PATTERNS:
        if pattern.search(t):
            return {"intent": "life-event", "lifeEvent": event}

    for sector, pattern in _SECTOR_PATTERNS:
        if pattern.search(t):
            return {"intent": "sector", "sector": sector}

    if re.search(r"\b(scheme|yojana|benefit|apply|what can i get)\b", t, re.I):
        return {"intent": "find-schemes"}

    return {"intent": "fallback"}


def ask(message: str, profile: dict[str, Any], locale: str = "en") -> dict[str, Any]:
    """Deterministic: the same input always yields the same output.

    A citizen who asks twice and gets different advice has no reason to trust either
    answer, so this is a property worth preserving rather than an implementation detail.
    """
    match = _detect_intent(message)
    detected = detect_life_events(message)

    enriched = dict(profile)
    if detected:
        existing = list(profile.get("lifeEvents") or profile.get("life_events") or [])
        enriched["lifeEvents"] = sorted(set(existing + detected))

    def top(n: int, sector: str | None = None) -> list[str]:
        return [r["scheme"]["id"] for r in recommend_schemes(enriched, limit=n, sector=sector)]

    intent = match["intent"]

    if intent == "greeting":
        first = str(profile.get("name", "")).split(" ")[0]
        return _reply(_t(locale, "greeting", name=first), top(3),
                      [("See all schemes", "/schemes")], detected)

    if intent == "help":
        return _reply(_t(locale, "helpText"), [],
                      [("Find schemes", "/schemes"), ("My applications", "/applications")], detected)

    if intent == "life-event":
        refs = top(4)
        eligible = sum(
            1 for sid in refs
            if evaluate_scheme(enriched, get_scheme(sid))["level"] == "eligible"
        )
        text = (
            _t(locale, "foundFor", event=_life_event_copy(match["lifeEvent"], locale))
            + "\n\n"
            + _t(locale, "eligibleFor", n=eligible)
        )
        return _reply(text, refs, [("See all matches", "/schemes")], detected)

    if intent == "sector":
        refs = top(4, match["sector"])
        if not refs:
            return _reply(_t(locale, "noMatch"), [], [], detected)
        label = sector_labels().get(match["sector"], "These")
        return _reply(f"{label} schemes that match your profile:", refs,
                      [("Browse this category", f"/schemes?sector={match['sector']}")], detected)

    if intent == "scheme-detail":
        s = match["scheme"]
        res = evaluate_scheme(enriched, s)
        verdict = {
            "eligible": "You appear to be eligible.",
            "verify": "You may be eligible — a few points need confirming.",
            "not-eligible": "Based on your profile you do not currently meet the criteria.",
        }[res["level"]]
        text = (
            f"{s['summary']}\n\n**What you get:** {s['benefitHeadline']} — {s['benefitDetail']}"
            f"\n\n**Your status:** {verdict} {res['reason']}"
        )
        return _reply(text, [s["id"]], [
            (f"Open {s['shortName']}", f"/schemes/{s['id']}"),
            ("Document checklist", f"/schemes/{s['id']}#documents"),
        ], detected)

    if intent == "check-eligibility":
        rows = recommend_schemes(enriched, limit=5)
        eligible = sum(1 for r in rows if r["result"]["level"] == "eligible")
        text = _t(locale, "topMatches") + "\n\n" + _t(locale, "eligibleFor", n=eligible)
        return _reply(text, [r["scheme"]["id"] for r in rows],
                      [("See full reasoning", "/schemes")], detected)

    if intent == "documents":
        return _reply(_t(locale, "docsIntro"), top(3),
                      [("Open my documents", "/documents"), ("See checklists", "/schemes")], detected)

    if intent == "track":
        return _reply(_t(locale, "trackIntro"), [],
                      [("Track my applications", "/applications")], detected)

    if intent == "renew":
        return _reply(_t(locale, "renewIntro"), [],
                      [("Documents needing renewal", "/documents"), ("Reminders", "/notifications")], detected)

    if intent == "find-schemes":
        rows = recommend_schemes(enriched, limit=4)
        return _reply(_t(locale, "topMatches"), [r["scheme"]["id"] for r in rows],
                      [("See all schemes", "/schemes")], detected)

    if settings.AI_API_KEY:
        refs = top(3)
        context_info = f"Recommended matching scheme IDs: {refs}. Citizen profile: {enriched}"
        ai_reply = call_gemini_ai(message, context=context_info, locale=locale)
        if ai_reply:
            return _reply(ai_reply, refs, [("Browse all schemes", "/schemes")], detected)

    return _reply(_t(locale, "noMatch"), top(3),
                  [("Browse all schemes", "/schemes")], detected)


def _reply(
    text: str,
    scheme_refs: list[str],
    actions: list[tuple[str, str]],
    detected: list[str],
) -> dict[str, Any]:
    return {
        "text": text,
        "schemeRefs": scheme_refs,
        "actions": [{"label": lbl, "href": href} for lbl, href in actions],
        "detectedEvents": detected,
    }
