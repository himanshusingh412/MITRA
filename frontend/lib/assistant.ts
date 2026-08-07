import type { ChatMessage, CitizenProfile, LifeEvent, Locale, Scheme } from '@/types';
import { SCHEMES, SECTOR_LABELS } from './schemes';
import { recommendSchemes, evaluateScheme } from './eligibility';

/**
 * MITRA offline assistant engine.
 *
 * Runs entirely in-process: no API key, no network call, no external model. It combines
 * keyword//intent matching, life-event detection and the deterministic eligibility engine
 * to produce grounded answers. Because every reply is derived from the scheme dataset,
 * the assistant cannot hallucinate a scheme or a benefit amount that does not exist.
 */

type Intent =
  | 'greeting'
  | 'find-schemes'
  | 'check-eligibility'
  | 'documents'
  | 'track'
  | 'renew'
  | 'sector'
  | 'life-event'
  | 'scheme-detail'
  | 'help'
  | 'fallback';

interface IntentMatch {
  intent: Intent;
  sector?: string;
  lifeEvent?: LifeEvent;
  scheme?: Scheme;
}

/**
 * Life-event patterns.
 *
 * Prefixes are deliberately left open-ended (`pregnan` rather than `\bpregnan\b`) so
 * that inflected forms — pregnant, pregnancy, disabled, disability, retiring — all match
 * without enumerating every ending. Hinglish and common transliterated terms are
 * included because that is how people actually type.
 */
const LIFE_EVENT_PATTERNS: Array<{ event: LifeEvent; patterns: RegExp }> = [
  { event: 'job-loss', patterns: /\b(lost|losing|left)\s+(my\s+)?job|unemploy|laid.?off|jobless|no work|naukri|berozgar|retrench/i },
  { event: 'marriage', patterns: /\b(marri|wedding|shaadi|husband|wife|spouse)/i },
  { event: 'childbirth', patterns: /\b(pregnan|baby|newborn|new born|child ?birth|delivery|maternity|expecting|beti hui|daughter born|son born|became a (mother|father))/i },
  { event: 'started-studies', patterns: /\b(college|school|admission|student|study|studies|studying|scholarship|padhai|degree|class 1[012]|university)/i },
  { event: 'started-business', patterns: /\b(business|shop|startup|start.?up|self.?employ|enterprise|dukaan|udyam|artisan|craft)/i },
  { event: 'disability', patterns: /\b(disab|handicap|divyang|blind|deaf|wheelchair|paralys)/i },
  // "turned 60", "he is 67", "senior citizen" — age mentions in the 60-99 range are the
  // strongest everyday signal that someone is asking about an elderly family member.
  { event: 'senior-citizen', patterns: /\b(old.?age|senior|retire|retirement|pension|budhapa|elderly|buzurg)|\b(turn(ed|ing)?|is|aged)\s+(6[0-9]|[7-9][0-9])\b|\b(6[0-9]|[7-9][0-9])\s*(years?|saal)\s*old\b/i },
  { event: 'farming-season', patterns: /\b(farm|crop|kisan|agricult|sowing|harvest|kheti|cultivat)/i },
  { event: 'bereavement', patterns: /\b(widow|passed away|died|death|husband died|vidhwa|bereave)/i },
  { event: 'bought-home', patterns: /\b(house|home|awas|makaan|housing|pucca|kutcha)/i },
];

const SECTOR_PATTERNS: Array<{ sector: string; patterns: RegExp }> = [
  { sector: 'health', patterns: /\b(health|hospital|medical|illness|treatment|ayushman|bimari|swasthya)\b/i },
  { sector: 'education', patterns: /\b(education|scholarship|school|college|student|fees|padhai)\b/i },
  { sector: 'housing', patterns: /\b(housing|house|home|awas|makaan)\b/i },
  { sector: 'pension', patterns: /\b(pension|old age|retire|budhapa)\b/i },
  { sector: 'agriculture', patterns: /\b(farm|kisan|crop|agricult|kheti)\b/i },
  { sector: 'business', patterns: /\b(business|loan|mudra|shop|artisan|vishwakarma)\b/i },
  { sector: 'employment', patterns: /\b(job|employ|work|rozgar|labour|shram)\b/i },
  { sector: 'women-child', patterns: /\b(women|girl|child|daughter|mother|beti|mahila)\b/i },
  { sector: 'disability', patterns: /\b(disab|divyang|handicap)\b/i },
  { sector: 'financial', patterns: /\b(insurance|bima|savings|deposit|accident)\b/i },
];

function detectIntent(text: string): IntentMatch {
  const t = text.trim();

  if (/^(hi|hello|hey|namaste|namaskar|pranam)\b/i.test(t) || t.length < 3) {
    return { intent: 'greeting' };
  }
  if (/\b(track|status|where is my|kahan hai|application status)\b/i.test(t)) {
    return { intent: 'track' };
  }
  if (/\b(document|paper|kagaz|certificate|what do i need|kya chahiye)\b/i.test(t)) {
    return { intent: 'documents' };
  }
  if (/\b(renew|expir|validity|update my)\b/i.test(t)) {
    return { intent: 'renew' };
  }
  if (/\b(eligible|eligibility|qualify|patrata|can i apply|am i)\b/i.test(t)) {
    return { intent: 'check-eligibility' };
  }
  if (/\b(help|how does|what can you|guide|samajh)\b/i.test(t)) {
    return { intent: 'help' };
  }

  const namedScheme = SCHEMES.find(
    (s) =>
      new RegExp(`\\b${s.shortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t) ||
      new RegExp(`\\b${s.id.replace(/-/g, '[ -]?')}\\b`, 'i').test(t),
  );
  if (namedScheme) return { intent: 'scheme-detail', scheme: namedScheme };

  const life = LIFE_EVENT_PATTERNS.find((p) => p.patterns.test(t));
  if (life) return { intent: 'life-event', lifeEvent: life.event };

  const sector = SECTOR_PATTERNS.find((p) => p.patterns.test(t));
  if (sector) return { intent: 'sector', sector: sector.sector };

  if (/\b(scheme|yojana|benefit|apply|scheme for me|what can i get)\b/i.test(t)) {
    return { intent: 'find-schemes' };
  }
  return { intent: 'fallback' };
}

/** Detects life events mentioned in a message so the profile can be updated proactively. */
export function detectLifeEvents(text: string): LifeEvent[] {
  return LIFE_EVENT_PATTERNS.filter((p) => p.patterns.test(text)).map((p) => p.event);
}

/**
 * Life-event phrases are interpolated into a sentence, so they must be translated too.
 * Leaving them in English produced Hindi sentences with an English clause in the middle
 * — exactly the "translated UI, English content" failure this product exists to avoid.
 */
const LIFE_EVENT_COPY: Record<Locale, Record<LifeEvent, string>> = {
  en: {
    'job-loss': 'losing your job',
    marriage: 'getting married',
    childbirth: 'a new child in the family',
    'started-studies': 'starting your studies',
    'started-business': 'starting a business',
    disability: 'a disability in the family',
    'senior-citizen': 'reaching senior-citizen age',
    'farming-season': 'your farming work',
    'bought-home': 'housing',
    bereavement: 'the loss in your family',
  },
  hi: {
    'job-loss': 'नौकरी छूटने',
    marriage: 'विवाह',
    childbirth: 'परिवार में नए बच्चे',
    'started-studies': 'पढ़ाई शुरू करने',
    'started-business': 'व्यवसाय शुरू करने',
    disability: 'परिवार में दिव्यांगता',
    'senior-citizen': 'वरिष्ठ नागरिक आयु',
    'farming-season': 'खेती के काम',
    'bought-home': 'आवास',
    bereavement: 'परिवार में हुई क्षति',
  },
  bn: {
    'job-loss': 'চাকরি হারানোর',
    marriage: 'বিবাহের',
    childbirth: 'পরিবারে নতুন সন্তানের',
    'started-studies': 'পড়াশোনা শুরু করার',
    'started-business': 'ব্যবসা শুরু করার',
    disability: 'পরিবারে প্রতিবন্ধকতার',
    'senior-citizen': 'প্রবীণ নাগরিক বয়সের',
    'farming-season': 'কৃষিকাজের',
    'bought-home': 'বাসস্থানের',
    bereavement: 'পরিবারে শোকের',
  },
  ta: {
    'job-loss': 'வேலை இழந்தது',
    marriage: 'திருமணம்',
    childbirth: 'குடும்பத்தில் புதிய குழந்தை',
    'started-studies': 'படிப்பைத் தொடங்கியது',
    'started-business': 'தொழில் தொடங்கியது',
    disability: 'குடும்பத்தில் இயலாமை',
    'senior-citizen': 'மூத்த குடிமகன் வயது',
    'farming-season': 'விவசாய வேலை',
    'bought-home': 'வீட்டுவசதி',
    bereavement: 'குடும்பத்தில் இழப்பு',
  },
  mr: {
    'job-loss': 'नोकरी गमावण्याचा',
    marriage: 'विवाहाचा',
    childbirth: 'कुटुंबातील नवीन बाळाचा',
    'started-studies': 'शिक्षण सुरू करण्याचा',
    'started-business': 'व्यवसाय सुरू करण्याचा',
    disability: 'कुटुंबातील दिव्यांगत्वाचा',
    'senior-citizen': 'ज्येष्ठ नागरिक वयाचा',
    'farming-season': 'शेतीच्या कामाचा',
    'bought-home': 'घराचा',
    bereavement: 'कुटुंबातील दुःखाचा',
  },
};

function lifeEventCopy(event: LifeEvent, locale: Locale): string {
  return LIFE_EVENT_COPY[locale]?.[event] ?? LIFE_EVENT_COPY.en[event] ?? 'that';
}

const T: Record<Locale, Record<string, string>> = {
  en: {
    greeting: 'Namaste {name}. Tell me what is happening in your life right now — a new job, a child starting college, a parent turning 60 — and I will find the schemes that fit you.',
    foundFor: 'Because you mentioned {event}, these are the schemes worth looking at first:',
    topMatches: 'Based on your profile, here are your strongest matches right now:',
    noMatch: 'I could not find a confident match for that. Try describing your situation in plain words — for example, "my daughter is starting college" or "I want to open a shop".',
    docsIntro: 'Here is what you will need. I only list documents that apply to your own profile:',
    trackIntro: 'You can see every application, its stage and what it is waiting on, in one place.',
    renewIntro: 'These are the documents and benefits that need renewing before they lapse.',
    helpText: 'I can do four things for you: find schemes that match your life situation, check whether you are eligible and explain why, tell you exactly which documents you need, and track applications you have already sent.',
    eligibleFor: 'You look eligible for {n} of these. Open any card to see the exact reasoning.',
  },
  hi: {
    greeting: 'नमस्ते {name}। अभी आपके जीवन में जो चल रहा है वह बताइए — नई नौकरी, बच्चे का कॉलेज, माता-पिता का 60 वर्ष का होना — मैं आपके लिए सही योजनाएँ ढूँढ दूँगा।',
    foundFor: 'आपने {event} का ज़िक्र किया, इसलिए पहले ये योजनाएँ देखिए:',
    topMatches: 'आपकी प्रोफ़ाइल के आधार पर, ये आपके लिए सबसे उपयुक्त योजनाएँ हैं:',
    noMatch: 'मुझे इसका सही मिलान नहीं मिला। अपनी स्थिति सरल शब्दों में बताइए — जैसे "मेरी बेटी कॉलेज जा रही है" या "मुझे दुकान खोलनी है"।',
    docsIntro: 'आपको ये दस्तावेज़ चाहिए होंगे। मैं केवल वही दिखाता हूँ जो आपकी प्रोफ़ाइल पर लागू होते हैं:',
    trackIntro: 'आपके सभी आवेदन, उनकी स्थिति और वे किस चीज़ की प्रतीक्षा में हैं — सब एक जगह।',
    renewIntro: 'इन दस्तावेज़ों और लाभों का नवीनीकरण समय रहते करना है।',
    helpText: 'मैं चार काम कर सकता हूँ: आपकी स्थिति के अनुसार योजनाएँ ढूँढना, पात्रता जाँचना और कारण समझाना, आवश्यक दस्तावेज़ बताना, और आपके आवेदनों को ट्रैक करना।',
    eligibleFor: 'इनमें से {n} के लिए आप पात्र लगते हैं। कारण देखने के लिए कोई भी कार्ड खोलिए।',
  },
  bn: {
    greeting: 'নমস্কার {name}। আপনার জীবনে এখন কী ঘটছে বলুন — নতুন চাকরি, সন্তানের কলেজ, বাবা-মায়ের ৬০ বছর — আমি উপযুক্ত প্রকল্প খুঁজে দেব।',
    foundFor: 'আপনি {event} উল্লেখ করেছেন, তাই প্রথমে এই প্রকল্পগুলি দেখুন:',
    topMatches: 'আপনার প্রোফাইল অনুযায়ী, এইগুলি আপনার জন্য সবচেয়ে উপযুক্ত:',
    noMatch: 'সঠিক মিল পাইনি। সহজ ভাষায় আপনার পরিস্থিতি বলুন।',
    docsIntro: 'আপনার এই নথিগুলি লাগবে:',
    trackIntro: 'আপনার সব আবেদন এবং তাদের অবস্থা এক জায়গায়।',
    renewIntro: 'এই নথিগুলি শীঘ্রই নবীকরণ করতে হবে।',
    helpText: 'আমি প্রকল্প খুঁজে দিতে, যোগ্যতা যাচাই করতে, নথির তালিকা দিতে এবং আবেদন ট্র্যাক করতে পারি।',
    eligibleFor: 'এর মধ্যে {n}টির জন্য আপনি যোগ্য বলে মনে হচ্ছে।',
  },
  ta: {
    greeting: 'வணக்கம் {name}. உங்கள் வாழ்க்கையில் இப்போது என்ன நடக்கிறது என்று சொல்லுங்கள் — நான் பொருத்தமான திட்டங்களைக் கண்டுபிடிப்பேன்.',
    foundFor: 'நீங்கள் {event} பற்றி குறிப்பிட்டதால், முதலில் இந்தத் திட்டங்களைப் பாருங்கள்:',
    topMatches: 'உங்கள் சுயவிவரத்தின் அடிப்படையில், இவை மிகவும் பொருத்தமானவை:',
    noMatch: 'சரியான பொருத்தம் கிடைக்கவில்லை. உங்கள் நிலைமையை எளிய வார்த்தைகளில் சொல்லுங்கள்.',
    docsIntro: 'உங்களுக்கு இந்த ஆவணங்கள் தேவைப்படும்:',
    trackIntro: 'உங்கள் அனைத்து விண்ணப்பங்களும் ஒரே இடத்தில்.',
    renewIntro: 'இந்த ஆவணங்களை விரைவில் புதுப்பிக்க வேண்டும்.',
    helpText: 'திட்டங்களைக் கண்டறிதல், தகுதி சரிபார்ப்பு, ஆவணப் பட்டியல், விண்ணப்பக் கண்காணிப்பு — இவற்றை நான் செய்வேன்.',
    eligibleFor: 'இவற்றில் {n} திட்டங்களுக்கு நீங்கள் தகுதியுடையவர் எனத் தெரிகிறது.',
  },
  mr: {
    greeting: 'नमस्कार {name}. तुमच्या आयुष्यात आत्ता काय चालले आहे ते सांगा — मी योग्य योजना शोधून देईन.',
    foundFor: 'तुम्ही {event} चा उल्लेख केला, म्हणून आधी या योजना पहा:',
    topMatches: 'तुमच्या प्रोफाइलनुसार, या तुमच्यासाठी सर्वात योग्य आहेत:',
    noMatch: 'नेमके जुळणारे सापडले नाही. तुमची परिस्थिती सोप्या शब्दांत सांगा.',
    docsIntro: 'तुम्हाला ही कागदपत्रे लागतील:',
    trackIntro: 'तुमचे सर्व अर्ज आणि त्यांची स्थिती एकाच ठिकाणी.',
    renewIntro: 'या कागदपत्रांचे नूतनीकरण लवकर करावे लागेल.',
    helpText: 'योजना शोधणे, पात्रता तपासणे, कागदपत्रांची यादी देणे आणि अर्ज ट्रॅक करणे — हे मी करू शकतो.',
    eligibleFor: 'यापैकी {n} योजनांसाठी तुम्ही पात्र दिसता.',
  },
};

function t(locale: Locale, key: string, vars: Record<string, string | number> = {}): string {
  const template = T[locale]?.[key] ?? T.en[key] ?? key;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template,
  );
}

export interface AssistantReply {
  text: string;
  schemeRefs: string[];
  actions: { label: string; href: string }[];
  detectedEvents: LifeEvent[];
}

/** Produces a grounded reply. Deterministic: the same input always yields the same output. */
export function ask(
  input: string,
  profile: CitizenProfile,
  locale: Locale = 'en',
): AssistantReply {
  const match = detectIntent(input);
  const detectedEvents = detectLifeEvents(input);
  const enriched: CitizenProfile = detectedEvents.length
    ? { ...profile, lifeEvents: Array.from(new Set([...profile.lifeEvents, ...detectedEvents])) }
    : profile;

  const top = (n: number, sector?: string) =>
    recommendSchemes(enriched, { limit: n, sector }).map((r) => r.scheme.id);

  switch (match.intent) {
    case 'greeting':
      return {
        text: t(locale, 'greeting', { name: profile.name.split(' ')[0] }),
        schemeRefs: top(3),
        actions: [{ label: 'See all schemes', href: '/schemes' }],
        detectedEvents,
      };

    case 'help':
      return {
        text: t(locale, 'helpText'),
        schemeRefs: [],
        actions: [
          { label: 'Find schemes', href: '/schemes' },
          { label: 'My applications', href: '/applications' },
        ],
        detectedEvents,
      };

    case 'life-event': {
      const refs = top(4);
      const eligibleCount = refs.filter(
        (id) => evaluateScheme(enriched, SCHEMES.find((s) => s.id === id)!).level === 'eligible',
      ).length;
      return {
        text: `${t(locale, 'foundFor', {
          event: lifeEventCopy(match.lifeEvent!, locale),
        })}\n\n${t(locale, 'eligibleFor', { n: eligibleCount })}`,
        schemeRefs: refs,
        actions: [{ label: 'See all matches', href: '/schemes' }],
        detectedEvents,
      };
    }

    case 'sector': {
      const refs = top(4, match.sector);
      if (refs.length === 0) {
        return { text: t(locale, 'noMatch'), schemeRefs: [], actions: [], detectedEvents };
      }
      return {
        text: `${SECTOR_LABELS[match.sector!] ?? 'These'} schemes that match your profile:`,
        schemeRefs: refs,
        actions: [{ label: 'Browse this category', href: `/schemes?sector=${match.sector}` }],
        detectedEvents,
      };
    }

    case 'scheme-detail': {
      const s = match.scheme!;
      const res = evaluateScheme(enriched, s);
      const verdict =
        res.level === 'eligible'
          ? 'You appear to be eligible.'
          : res.level === 'verify'
            ? 'You may be eligible — a few points need confirming.'
            : 'Based on your profile you do not currently meet the criteria.';
      return {
        text: `${s.summary}\n\n**What you get:** ${s.benefitHeadline} — ${s.benefitDetail}\n\n**Your status:** ${verdict} ${res.reason}`,
        schemeRefs: [s.id],
        actions: [
          { label: `Open ${s.shortName}`, href: `/schemes/${s.id}` },
          { label: 'Document checklist', href: `/schemes/${s.id}#documents` },
        ],
        detectedEvents,
      };
    }

    case 'check-eligibility': {
      const rows = recommendSchemes(enriched, { limit: 5 });
      const eligible = rows.filter((r) => r.result.level === 'eligible');
      return {
        text: `${t(locale, 'topMatches')}\n\n${t(locale, 'eligibleFor', { n: eligible.length })}`,
        schemeRefs: rows.map((r) => r.scheme.id),
        actions: [{ label: 'See full reasoning', href: '/schemes' }],
        detectedEvents,
      };
    }

    case 'documents': {
      const refs = top(3);
      return {
        text: t(locale, 'docsIntro'),
        schemeRefs: refs,
        actions: [
          { label: 'Open my documents', href: '/documents' },
          { label: 'See checklists', href: '/schemes' },
        ],
        detectedEvents,
      };
    }

    case 'track':
      return {
        text: t(locale, 'trackIntro'),
        schemeRefs: [],
        actions: [{ label: 'Track my applications', href: '/applications' }],
        detectedEvents,
      };

    case 'renew':
      return {
        text: t(locale, 'renewIntro'),
        schemeRefs: [],
        actions: [
          { label: 'Documents needing renewal', href: '/documents' },
          { label: 'Reminders', href: '/notifications' },
        ],
        detectedEvents,
      };

    case 'find-schemes': {
      const rows = recommendSchemes(enriched, { limit: 4 });
      return {
        text: t(locale, 'topMatches'),
        schemeRefs: rows.map((r) => r.scheme.id),
        actions: [{ label: 'See all schemes', href: '/schemes' }],
        detectedEvents,
      };
    }

    default:
      return {
        text: t(locale, 'noMatch'),
        schemeRefs: top(3),
        actions: [{ label: 'Browse all schemes', href: '/schemes' }],
        detectedEvents,
      };
  }
}

export function newMessage(role: ChatMessage['role'], text: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    text,
    at: new Date().toISOString(),
    ...extra,
  };
}

/** Suggested prompts shown as chips — these mirror the four things the engine handles best. */
export const QUICK_PROMPTS: Record<Locale, { label: string; prompt: string; icon: string }[]> = {
  en: [
    { label: 'Track Application', prompt: 'Track my application status', icon: 'Clock' },
    { label: 'Find Schemes', prompt: 'What schemes am I eligible for?', icon: 'Search' },
    { label: 'Renew Documents', prompt: 'Which documents need renewal?', icon: 'FileText' },
    { label: 'Check Eligibility', prompt: 'Check my eligibility', icon: 'CheckSquare' },
  ],
  hi: [
    { label: 'आवेदन ट्रैक करें', prompt: 'मेरे आवेदन की स्थिति बताइए', icon: 'Clock' },
    { label: 'योजनाएँ खोजें', prompt: 'मैं किन योजनाओं के लिए पात्र हूँ?', icon: 'Search' },
    { label: 'दस्तावेज़ नवीनीकरण', prompt: 'किन दस्तावेज़ों का नवीनीकरण करना है?', icon: 'FileText' },
    { label: 'पात्रता जाँचें', prompt: 'मेरी पात्रता जाँचिए', icon: 'CheckSquare' },
  ],
  bn: [
    { label: 'আবেদন ট্র্যাক', prompt: 'আমার আবেদনের অবস্থা দেখান', icon: 'Clock' },
    { label: 'প্রকল্প খুঁজুন', prompt: 'আমি কোন প্রকল্পের যোগ্য?', icon: 'Search' },
    { label: 'নথি নবীকরণ', prompt: 'কোন নথি নবীকরণ করতে হবে?', icon: 'FileText' },
    { label: 'যোগ্যতা যাচাই', prompt: 'আমার যোগ্যতা যাচাই করুন', icon: 'CheckSquare' },
  ],
  ta: [
    { label: 'விண்ணப்பம் கண்காணி', prompt: 'என் விண்ணப்ப நிலையைக் காட்டு', icon: 'Clock' },
    { label: 'திட்டங்களைத் தேடு', prompt: 'நான் எந்தத் திட்டங்களுக்குத் தகுதியானவன்?', icon: 'Search' },
    { label: 'ஆவணப் புதுப்பிப்பு', prompt: 'எந்த ஆவணங்களைப் புதுப்பிக்க வேண்டும்?', icon: 'FileText' },
    { label: 'தகுதி சரிபார்', prompt: 'என் தகுதியைச் சரிபார்', icon: 'CheckSquare' },
  ],
  mr: [
    { label: 'अर्ज ट्रॅक करा', prompt: 'माझ्या अर्जाची स्थिती दाखवा', icon: 'Clock' },
    { label: 'योजना शोधा', prompt: 'मी कोणत्या योजनांसाठी पात्र आहे?', icon: 'Search' },
    { label: 'कागदपत्र नूतनीकरण', prompt: 'कोणत्या कागदपत्रांचे नूतनीकरण करायचे?', icon: 'FileText' },
    { label: 'पात्रता तपासा', prompt: 'माझी पात्रता तपासा', icon: 'CheckSquare' },
  ],
};
