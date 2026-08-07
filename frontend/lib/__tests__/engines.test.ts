/**
 * Engine test suite for MITRA.
 * Run with: npx tsx lib/__tests__/engines.test.ts
 *
 * Covers the logic a citizen's outcome actually depends on: fuzzy name/date matching,
 * cross-document inconsistency detection, and eligibility reasoning.
 */
import { compareNames, compareDates, compareAddresses, parseIndianDate, jaroWinkler } from '../fuzzy';
import { verifyDocumentSet } from '../documentVerification';
import { evaluateScheme, recommendSchemes, buildChecklist } from '../eligibility';
import { getScheme, SCHEMES } from '../schemes';
import { ask, detectLifeEvents } from '../assistant';
import { PRIMARY_USER, FAMILY, DOCUMENTS } from '../demoData';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function group(title: string) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

// ─── Fuzzy name matching ─────────────────────────────────────────────────────
group('Fuzzy name matching');

const nameCases: Array<[string, string, 'match' | 'likely-match' | 'mismatch']> = [
  ['Ravi Kumar', 'RAVI KUMAR', 'match'],
  ['Ravi Kumar', 'Ravi  Kumar', 'match'],
  ['Ravi Kumar', 'Shri Ravi Kumar', 'match'],
  ['Ravi Kumar', 'Kumar Ravi', 'match'],
  ['Ravi Kumar', 'Ravi Kumar Singh', 'match'],
  ['Ravi Kumar', 'Rabi Kumar', 'match'],
  ['Ram Dev Singh', 'Ramdev Singh', 'match'],
  // 'Ramdeo' swaps a whole vowel, not just spacing. Surfacing it as a soft warning is
  // the right call: it is probably the same person, but a clerk may still reject it.
  ['Ram Dev Singh', 'Ramdeo Singh', 'likely-match'],
  ['Jai Prakash', 'Jaiprakash', 'match'],
  ['Ravi Kumar', 'R Kumar', 'match'],
  ['Ravi Kumar', 'Sunita Devi', 'mismatch'],
  ['Anjali Kumari', 'Anjali Kumari', 'match'],
  ['Lakshmi', 'Laxmi', 'match'],
  ['Krishna', 'Krishnaa', 'match'],
];

for (const [a, b, expected] of nameCases) {
  const r = compareNames(a, b);
  const ok = r.verdict === expected;
  check(`name "${a}" vs "${b}" => ${expected}`, ok, `got ${r.verdict} (${r.score.toFixed(2)})`);
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} "${a}" vs "${b}" → ${r.verdict} (${r.score.toFixed(2)})`);
}

check('jaroWinkler identical = 1', jaroWinkler('abc', 'abc') === 1);
check('jaroWinkler disjoint = 0', jaroWinkler('abc', 'xyz') === 0);

// ─── Date parsing and comparison ─────────────────────────────────────────────
group('Date parsing and comparison');

check('DD/MM/YYYY parses', parseIndianDate('14/03/1992')?.iso === '1992-03-14');
check('YYYY-MM-DD parses', parseIndianDate('1992-03-14')?.iso === '1992-03-14');
check('DD-MM-YY expands century', parseIndianDate('14-03-92')?.iso === '1992-03-14');
check('named month parses', parseIndianDate('14 Mar 1992')?.iso === '1992-03-14');
check('year-only flagged', parseIndianDate('1959')?.yearOnly === true);

const dateCases: Array<[string, string, 'match' | 'likely-match' | 'mismatch']> = [
  ['14/03/1992', '1992-03-14', 'match'],
  ['14/03/1992', '14-03-1992', 'match'],
  ['14/03/1992', '03/14/1992', 'likely-match'],
  // A year-only record normalises to 1 January, so this is an exact agreement.
  ['1959', '01/01/1959', 'match'],
  ['1959', '14/03/1959', 'likely-match'],
  ['22/07/2009', '22/07/2008', 'mismatch'],
  ['14/03/1992', '15/03/1992', 'mismatch'],
];
for (const [a, b, expected] of dateCases) {
  const r = compareDates(a, b);
  const ok = r.verdict === expected;
  check(`date "${a}" vs "${b}" => ${expected}`, ok, `got ${r.verdict}`);
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} "${a}" vs "${b}" → ${r.verdict}`);
}

// ─── Address comparison ──────────────────────────────────────────────────────
group('Address comparison');

const addrA = 'Vill- Bahadurpur, PO- Kanti, Dist- Muzaffarpur, Bihar - 843130';
const addrB = 'Bahadurpur Village, Kanti Block, Muzaffarpur, Bihar 843130';
const addrC = 'Sector 22, Gurugram, Haryana 122015';
check('same address across formats is not a mismatch', compareAddresses(addrA, addrB).verdict !== 'mismatch');
check('different PIN is a mismatch', compareAddresses(addrA, addrC).verdict === 'mismatch');
console.log(`  A vs B → ${compareAddresses(addrA, addrB).verdict}`);
console.log(`  A vs C → ${compareAddresses(addrA, addrC).verdict}`);

// ─── Cross-document verification ─────────────────────────────────────────────
group('Cross-document verification');

const report = verifyDocumentSet(PRIMARY_USER, DOCUMENTS);
console.log(`  Documents checked: ${report.documentsChecked}, field pairs compared: ${report.fieldsCompared}`);
console.log(`  Consistency score: ${report.consistencyScore}%  |  ready: ${report.readyToSubmit}`);
console.log(`  Issues found: ${report.issues.length}`);
for (const i of report.issues) {
  console.log(`    [${i.severity}] ${i.title}`);
}

check('finds the expired income certificate', report.issues.some((i) => i.id === 'expired-d-income-ravi'));
check('flags the day/month swapped DOB', report.issues.some((i) => i.field === 'dob' && i.documentIds.includes('d-land-ravi')));
check('does NOT flag Rabi/Ravi transliteration as a name mismatch', !report.issues.some((i) => i.field === 'name' && i.documentIds.includes('d-pan-ravi')));
check('resolves a canonical name', Boolean(report.canonicalValues.name));
check('canonical name comes from an authoritative doc', report.canonicalValues.name?.value === 'Ravi Kumar');
check('every issue carries a suggestion', report.issues.every((i) => i.suggestion.length > 20));
check('does NOT compare Aadhaar number against PAN number', !report.issues.some((i) => i.field === 'idNumber' && i.documentIds.includes('d-pan-ravi')));
check('does NOT flag Ram Dev vs Ramdev as a discrepancy', !report.issues.some((i) => i.field === 'fatherName'));
check('score reflects only genuine problems', report.consistencyScore > 40, `got ${report.consistencyScore}`);
check('blockers sort before warnings', (() => {
  const idx = report.issues.findIndex((i) => i.severity === 'warning');
  return idx === -1 || !report.issues.slice(idx).some((i) => i.severity === 'blocker');
})());

const anjali = FAMILY.find((f) => f.id === 'u-anjali')!;
const anjaliReport = verifyDocumentSet(anjali, DOCUMENTS);
console.log(`\n  Anjali — score ${anjaliReport.consistencyScore}%, issues ${anjaliReport.issues.length}`);
for (const i of anjaliReport.issues) console.log(`    [${i.severity}] ${i.title}`);
check('catches the marksheet birth-year mismatch', anjaliReport.issues.some((i) => i.field === 'dob'));

const emptyReport = verifyDocumentSet({ ...PRIMARY_USER, id: 'nobody' }, DOCUMENTS);
check('no documents => not ready to submit', emptyReport.readyToSubmit === false);
check('no documents => explanatory summary', emptyReport.summary.includes('No documents'));

// ─── Eligibility engine ──────────────────────────────────────────────────────
group('Eligibility engine');

const pmKisan = evaluateScheme(PRIMARY_USER, getScheme('pm-kisan')!);
console.log(`  Ravi / PM-KISAN → ${pmKisan.level} (${pmKisan.score}%)`);
check('farmer with land is eligible for PM-KISAN', pmKisan.level === 'eligible');

const scholarship = evaluateScheme(anjali, getScheme('post-matric-scholarship')!);
console.log(`  Anjali / Post Matric → ${scholarship.level} (${scholarship.score}%)`);
check('OBC student is eligible for post-matric scholarship', scholarship.level === 'eligible');

const oldAge = evaluateScheme(FAMILY.find((f) => f.id === 'u-ramdev')!, getScheme('nsap-old-age')!);
console.log(`  Ram Dev / Old Age Pension → ${oldAge.level} (${oldAge.score}%)`);
check('67-year-old BPL is eligible for old age pension', oldAge.level === 'eligible');

const urbanHousing = evaluateScheme(PRIMARY_USER, getScheme('pmay-urban')!);
console.log(`  Ravi (rural) / PMAY-Urban → ${urbanHousing.level}`);
check('rural citizen is not eligible for urban housing', urbanHousing.level === 'not-eligible');

const sukanya = evaluateScheme(PRIMARY_USER, getScheme('sukanya-samriddhi')!);
check('adult male is not eligible for Sukanya Samriddhi', sukanya.level === 'not-eligible');

check('every result explains itself', SCHEMES.every((s) => evaluateScheme(PRIMARY_USER, s).reason.length > 10));
check('every result lists rule outcomes', SCHEMES.every((s) => {
  const r = evaluateScheme(PRIMARY_USER, s);
  return r.passed.length + r.failed.length === s.rules.length;
}));

// ─── Recommendation ranking ──────────────────────────────────────────────────
group('Recommendation ranking');

const recs = recommendSchemes(PRIMARY_USER, { limit: 5 });
console.log('  Top 5 for Ravi:');
recs.forEach((r, i) => console.log(`    ${i + 1}. ${r.scheme.shortName} — ${r.result.level} (${r.result.score}%)`));
check('returns recommendations', recs.length > 0);
check('excludes ineligible by default', recs.every((r) => r.result.level !== 'not-eligible'));
check('eligible outrank verify', (() => {
  const firstVerify = recs.findIndex((r) => r.result.level === 'verify');
  return firstVerify === -1 || !recs.slice(firstVerify).some((r) => r.result.level === 'eligible');
})());
check('already-held benefits are demoted', !recs.slice(0, 3).some((r) => r.scheme.id === 'e-shram'));

const sectorFiltered = recommendSchemes(anjali, { sector: 'education' });
check('sector filter works', sectorFiltered.every((r) => r.scheme.sector === 'education'));
check('sector filter finds education schemes for a student', sectorFiltered.length > 0);

// ─── Document checklist ──────────────────────────────────────────────────────
group('Personalised document checklist');

const checklist = buildChecklist(PRIMARY_USER, getScheme('pm-kisan')!, DOCUMENTS);
console.log('  PM-KISAN checklist for Ravi:');
checklist.forEach((c) => console.log(`    [${c.status}] ${c.doc.name} — ${c.detail}`));
check('checklist is non-empty', checklist.length > 0);
check('recognises documents already held', checklist.some((c) => c.status === 'have'));
check('conditional docs respect the profile', (() => {
  const urbanUser = { ...PRIMARY_USER, area: 'urban' as const };
  const urbanList = buildChecklist(urbanUser, getScheme('pm-kisan')!, DOCUMENTS);
  // The citizenship proof is rural-only, so an urban citizen should not be asked for it.
  return urbanList.length < checklist.length;
})());

// ─── Assistant engine ────────────────────────────────────────────────────────
group('Assistant engine');

check('detects job loss', detectLifeEvents('I lost my job last month').includes('job-loss'));
check('detects childbirth', detectLifeEvents('my wife is pregnant').includes('childbirth'));
check('detects studies', detectLifeEvents('my daughter is starting college').includes('started-studies'));
check('detects senior citizen', detectLifeEvents('my father turned 60').includes('senior-citizen'));

const greeting = ask('hello', PRIMARY_USER);
check('greeting returns schemes', greeting.schemeRefs.length > 0);

const jobLoss = ask('I lost my job', PRIMARY_USER);
console.log(`  "I lost my job" → ${jobLoss.schemeRefs.join(', ')}`);
check('job loss surfaces employment support', jobLoss.schemeRefs.length > 0);

const schemeQ = ask('tell me about PM-KISAN', PRIMARY_USER);
check('named scheme resolves to that scheme', schemeQ.schemeRefs.includes('pm-kisan'));

const hindi = ask('hello', PRIMARY_USER, 'hi');
check('Hindi locale returns Devanagari', /[ऀ-ॿ]/.test(hindi.text));

const tamil = ask('hello', PRIMARY_USER, 'ta');
check('Tamil locale returns Tamil script', /[஀-௿]/.test(tamil.text));

// Regression: the interpolated life-event phrase used to stay English, producing a
// Hindi sentence with an English clause in the middle.
check('life-event phrase is translated', (() => {
  const text = ask('my daughter is starting college', PRIMARY_USER, 'hi').text;
  return !text.includes('starting your studies') && text.includes('पढ़ाई');
})());
check('no English clause leaks into Indic replies', (['hi', 'bn', 'ta', 'mr'] as const).every(
  (l) => !ask('I lost my job', PRIMARY_USER, l).text.includes('losing your job'),
));

check('assistant is deterministic', ask('what schemes am I eligible for', PRIMARY_USER).text === ask('what schemes am I eligible for', PRIMARY_USER).text);
check('every reply has text', ['hi', 'track my application', 'documents', 'renew', 'xyzzy'].every((q) => ask(q, PRIMARY_USER).text.length > 0));

// ─── Data integrity ──────────────────────────────────────────────────────────
group('Scheme dataset integrity');

check('18 schemes present', SCHEMES.length === 18, `got ${SCHEMES.length}`);
check('unique ids', new Set(SCHEMES.map((s) => s.id)).size === SCHEMES.length);
check('every scheme has rules', SCHEMES.every((s) => s.rules.length > 0));
check('every scheme has documents', SCHEMES.every((s) => s.documents.length > 0));
check('every scheme has an official URL', SCHEMES.every((s) => s.officialUrl.startsWith('https://')));
check('every scheme has a plain-language summary', SCHEMES.every((s) => s.summary.length > 80));
check('every rule has a human label', SCHEMES.every((s) => s.rules.every((r) => r.label.length > 5)));

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
if (failed === 0) {
  console.log(`\x1b[32m✓ All ${passed} assertions passed.\x1b[0m`);
} else {
  console.log(`\x1b[31m✗ ${failed} failed\x1b[0m, \x1b[32m${passed} passed\x1b[0m`);
  failures.forEach((f) => console.log(`  \x1b[31m✗\x1b[0m ${f}`));
  process.exitCode = 1;
}
