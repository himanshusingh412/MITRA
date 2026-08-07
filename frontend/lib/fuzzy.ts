/**
 * Fuzzy matching primitives for Indian identity documents.
 *
 * Indian government documents routinely disagree in ways that are not actually errors:
 * the same person is "RAVI KUMAR" on Aadhaar, "Ravi Kumar Singh" on a marksheet and
 * "Sri Ravikumar" on a land record. Naive string equality flags all of these as
 * mismatches and produces alert fatigue, so the citizen stops reading the warnings.
 *
 * These functions separate *harmless variation* (transliteration, honorifics, token
 * order, date format) from *real inconsistency* (a genuinely different date of birth,
 * a different person's name) so MITRA only raises alerts that are worth acting on.
 */

// ─── String distance ─────────────────────────────────────────────────────────

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Jaro-Winkler similarity (0..1). Preferred over raw Levenshtein for personal names
 * because it rewards a matching prefix, which is where Indian name variants agree most.
 */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatches = new Array<boolean>(a.length).fill(false);
  const bMatches = new Array<boolean>(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

// ─── Name normalisation ──────────────────────────────────────────────────────

const HONORIFICS = /\b(shri|sri|smt|smti|kum|km|mr|mrs|ms|dr|late|s\/o|d\/o|w\/o|c\/o)\b\.?/gi;

/**
 * Transliteration equivalence folding. Devanagari-to-Latin transliteration is not
 * standardised, so the same name legitimately appears with different spellings across
 * departments. Folding these classes lets us compare the phonetic core of the name.
 */
const TRANSLITERATION_RULES: Array<[RegExp, string]> = [
  // Longest clusters first — 'ksh' must fold before 'kh' and 'sh' consume its letters,
  // otherwise Lakshmi and Laxmi never converge.
  [/ksh/g, 'x'],
  [/ks/g, 'x'],
  [/jn/g, 'gy'],
  // Aspirated consonants: Indian transliteration drops the 'h' inconsistently.
  [/ph/g, 'f'],
  [/kh/g, 'k'],
  [/gh/g, 'g'],
  [/th/g, 't'],
  [/dh/g, 'd'],
  [/bh/g, 'b'],
  [/ch/g, 'c'],
  [/sh/g, 's'],
  // Vowel-length variation carries no meaning once romanised.
  [/aa/g, 'a'],
  [/ee/g, 'i'],
  [/ie/g, 'i'],
  [/oo/g, 'u'],
  [/ou/g, 'u'],
  // b/v/w are a single phoneme class across much of eastern and northern India:
  // the same person is Rabi in Bengali-influenced records and Ravi elsewhere.
  [/[vwb]/g, 'v'],
  [/z/g, 'j'],
  [/q/g, 'k'],
  [/y$/g, 'i'],
  [/([a-z])\1+/g, '$1'], // collapse doubled letters
];

export function normaliseName(raw: string): string {
  return raw
    .replace(HONORIFICS, ' ')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function phoneticKey(raw: string): string {
  let s = normaliseName(raw).replace(/\s+/g, '');
  for (const [pattern, replacement] of TRANSLITERATION_RULES) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

export interface NameComparison {
  score: number;
  verdict: 'match' | 'likely-match' | 'mismatch';
  note: string;
}

/**
 * Compares two names token-wise so word order and extra surnames do not cause
 * false alarms. "Ravi Kumar" vs "Kumar Ravi" is a match; "Ravi Kumar" vs
 * "Ravi Kumar Singh" is a likely match (one document carries the surname);
 * "Ravi Kumar" vs "Sunita Devi" is a genuine mismatch.
 */
export function compareNames(a: string, b: string): NameComparison {
  const na = normaliseName(a);
  const nb = normaliseName(b);

  if (!na || !nb) {
    return { score: 0, verdict: 'mismatch', note: 'One of the documents has no readable name.' };
  }
  if (na === nb) {
    return { score: 1, verdict: 'match', note: 'Names are identical.' };
  }

  // Word-boundary variation only: "Ram Dev" vs "Ramdev", "Jai Prakash" vs "Jaiprakash".
  // Whether a compound given name is written as one word or two is a typing convention,
  // not a difference in identity, so this is settled before token-wise comparison.
  if (phoneticKey(na) === phoneticKey(nb)) {
    return {
      score: 1,
      verdict: 'match',
      note: 'Same name — the words are only spaced or spelled differently.',
    };
  }

  const ta = na.split(' ').filter(Boolean);
  const tb = nb.split(' ').filter(Boolean);

  // Match each token of the shorter name to its best counterpart in the longer one.
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const used = new Set<number>();
  let total = 0;

  for (const token of short) {
    let best = 0;
    let bestIdx = -1;
    long.forEach((other, idx) => {
      if (used.has(idx)) return;
      // A single-letter token is an initial: treat a first-letter match as agreement.
      const sim =
        token.length === 1 || other.length === 1
          ? token[0] === other[0]
            ? 0.95
            : 0
          : Math.max(jaroWinkler(token, other), jaroWinkler(phoneticKey(token), phoneticKey(other)));
      if (sim > best) {
        best = sim;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0) used.add(bestIdx);
    total += best;
  }

  const tokenScore = total / short.length;
  const extraTokens = long.length - short.length;
  // Each unmatched extra token costs a little, but never enough on its own to fail.
  const score = Math.max(0, tokenScore - extraTokens * 0.06);

  if (score >= 0.92) {
    return {
      score,
      verdict: 'match',
      note:
        extraTokens > 0
          ? 'Same name — one document includes an extra surname or initial.'
          : 'Same name, only spelling or case differs.',
    };
  }
  if (score >= 0.78) {
    return {
      score,
      verdict: 'likely-match',
      note: 'Names look like the same person but the spelling differs enough to be worth checking.',
    };
  }
  return { score, verdict: 'mismatch', note: 'These names do not appear to belong to the same person.' };
}

// ─── Date normalisation ──────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Parses the date formats that actually appear on Indian documents:
 * DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD.MM.YY, "12 Jan 1998", and the
 * year-only "01/01/1970" placeholder that older Aadhaar records use.
 */
export function parseIndianDate(raw: string): { iso: string; yearOnly: boolean } | null {
  const s = raw.trim();
  if (!s) return null;

  // Year only, e.g. "1998"
  if (/^\d{4}$/.test(s)) {
    return { iso: `${s}-01-01`, yearOnly: true };
  }

  // 12 Jan 1998 / 12-January-1998
  const named = s.match(/^(\d{1,2})[\s\-/]*([a-z]{3,})[\s\-/]*(\d{2,4})$/i);
  if (named) {
    const mm = MONTHS[named[2].slice(0, 3).toLowerCase()];
    if (mm) {
      const yyyy = expandYear(named[3]);
      return { iso: `${yyyy}-${pad(mm)}-${pad(Number(named[1]))}`, yearOnly: false };
    }
  }

  const parts = s.split(/[/\-.\s]+/).filter(Boolean);
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    // ISO first: YYYY-MM-DD
    if (parts[0].length === 4) {
      return { iso: `${parts[0]}-${pad(Number(parts[1]))}-${pad(Number(parts[2]))}`, yearOnly: false };
    }
    // Otherwise DD-MM-YYYY (Indian convention; US MM/DD is not used on these documents)
    return {
      iso: `${expandYear(parts[2])}-${pad(Number(parts[1]))}-${pad(Number(parts[0]))}`,
      yearOnly: false,
    };
  }
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');

function expandYear(y: string): string {
  if (y.length === 4) return y;
  const n = Number(y);
  // Two-digit years on identity documents are birth years, so they are in the past.
  return String(n > 30 ? 1900 + n : 2000 + n);
}

export interface DateComparison {
  score: number;
  verdict: 'match' | 'likely-match' | 'mismatch';
  note: string;
}

export function compareDates(a: string, b: string): DateComparison {
  const pa = parseIndianDate(a);
  const pb = parseIndianDate(b);

  if (!pa || !pb) {
    return { score: 0, verdict: 'mismatch', note: 'One of the dates could not be read clearly.' };
  }
  if (pa.iso === pb.iso) {
    return { score: 1, verdict: 'match', note: 'Dates of birth match exactly.' };
  }

  const [ya, ma, da] = pa.iso.split('-').map(Number);
  const [yb, mb, db] = pb.iso.split('-').map(Number);

  // A year-only record cannot disagree about day and month.
  if ((pa.yearOnly || pb.yearOnly) && ya === yb) {
    return {
      score: 0.9,
      verdict: 'likely-match',
      note: 'Years match; one document records only the year of birth.',
    };
  }
  // Day and month swapped — a data-entry error, not a different person.
  if (ya === yb && ma === db && da === mb) {
    return {
      score: 0.72,
      verdict: 'likely-match',
      note: 'Day and month appear swapped between the two documents.',
    };
  }
  if (ya === yb && ma === mb) {
    return { score: 0.6, verdict: 'mismatch', note: `Same month and year, but the day differs (${da} vs ${db}).` };
  }
  if (ya === yb) {
    return { score: 0.4, verdict: 'mismatch', note: 'Same birth year but a different day and month.' };
  }
  return {
    score: 0,
    verdict: 'mismatch',
    note: `Birth years differ by ${Math.abs(ya - yb)} year${Math.abs(ya - yb) > 1 ? 's' : ''}.`,
  };
}

// ─── Address normalisation ───────────────────────────────────────────────────

const ADDRESS_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\b(rd|rd\.)\b/gi, 'road'],
  [/\b(st|st\.)\b/gi, 'street'],
  [/\b(nr|nr\.)\b/gi, 'near'],
  [/\b(opp|opp\.)\b/gi, 'opposite'],
  [/\b(vill|vill\.|vlg)\b/gi, 'village'],
  [/\b(dist|dist\.|distt)\b/gi, 'district'],
  [/\b(teh|teh\.|tehsil|tal|taluka)\b/gi, 'tehsil'],
  [/\b(po|p\.o\.)\b/gi, 'post office'],
  [/\b(ps|p\.s\.)\b/gi, 'police station'],
  [/\b(hno|h\.no\.|house no|hse no)\b/gi, 'house number'],
  [/\b(apt|apt\.)\b/gi, 'apartment'],
  [/\b(bldg|bldg\.)\b/gi, 'building'],
  [/\b(ngr)\b/gi, 'nagar'],
  [/\b(col|colony)\b/gi, 'colony'],
];

export function extractPincode(raw: string): string | null {
  const m = raw.match(/\b([1-9]\d{5})\b/);
  return m ? m[1] : null;
}

export function normaliseAddress(raw: string): string {
  let s = raw.toLowerCase();
  for (const [pattern, replacement] of ADDRESS_ABBREVIATIONS) {
    s = s.replace(pattern, replacement);
  }
  return s
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface AddressComparison {
  score: number;
  verdict: 'match' | 'likely-match' | 'mismatch';
  note: string;
}

/**
 * Addresses are compared on shared tokens plus PIN code, because the same address is
 * written at wildly different levels of detail across documents. A PIN mismatch is the
 * strongest signal that the documents describe genuinely different places.
 */
export function compareAddresses(a: string, b: string): AddressComparison {
  const pinA = extractPincode(a);
  const pinB = extractPincode(b);
  const na = normaliseAddress(a);
  const nb = normaliseAddress(b);

  if (!na || !nb) {
    return { score: 0, verdict: 'mismatch', note: 'One of the documents has no readable address.' };
  }

  const setA = new Set(na.split(' ').filter((w) => w.length > 2));
  const setB = new Set(nb.split(' ').filter((w) => w.length > 2));
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const overlap = intersection / Math.min(setA.size, setB.size || 1);

  if (pinA && pinB && pinA !== pinB) {
    return {
      score: Math.min(overlap, 0.5),
      verdict: 'mismatch',
      note: `PIN codes differ (${pinA} vs ${pinB}) — these look like different addresses.`,
    };
  }
  if (pinA && pinB && pinA === pinB && overlap >= 0.5) {
    return { score: 0.95, verdict: 'match', note: 'Same PIN code and matching locality details.' };
  }
  if (overlap >= 0.75) {
    return { score: overlap, verdict: 'match', note: 'Addresses agree on all the key details.' };
  }
  if (overlap >= 0.45) {
    return {
      score: overlap,
      verdict: 'likely-match',
      note: 'Addresses broadly agree but one is written in more detail than the other.',
    };
  }
  return { score: overlap, verdict: 'mismatch', note: 'Addresses do not appear to describe the same place.' };
}

// ─── Identifier normalisation ────────────────────────────────────────────────

/** Aadhaar and account numbers appear with spaces, hyphens or masking (XXXX XXXX 1234). */
export function normaliseIdNumber(raw: string): string {
  return raw.replace(/[\s\-]/g, '').toUpperCase();
}

export function compareIdNumbers(a: string, b: string): { match: boolean; note: string } {
  const na = normaliseIdNumber(a);
  const nb = normaliseIdNumber(b);
  if (na === nb) return { match: true, note: 'Identifiers match.' };

  // Compare only the visible tail when one side is masked.
  const maskedA = /^[X*]+/.test(na);
  const maskedB = /^[X*]+/.test(nb);
  if (maskedA || maskedB) {
    const tailA = na.slice(-4);
    const tailB = nb.slice(-4);
    if (tailA === tailB) return { match: true, note: 'Last four digits match on a masked identifier.' };
  }
  return { match: false, note: 'Identifiers do not match.' };
}
