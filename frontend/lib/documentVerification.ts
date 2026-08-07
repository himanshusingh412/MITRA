import type { CitizenProfile, Scheme, StoredDocument } from '@/types';
import {
  compareAddresses,
  compareDates,
  compareIdNumbers,
  compareNames,
  parseIndianDate,
} from './fuzzy';

/**
 * MITRA pre-application document verification.
 *
 * A large share of welfare applications are rejected for clerical reasons — the name on
 * the caste certificate is spelled differently from Aadhaar, a date of birth was entered
 * day-month-swapped, an income certificate lapsed two months ago. The citizen finds out
 * weeks later, after the application has already failed.
 *
 * This engine runs *before* submission: it extracts fields via OCR, compares every
 * document against every other document (not just against the profile), and converts
 * each inconsistency into a specific, actionable correction the citizen can make now.
 *
 * Runs fully offline — the OCR adapter and the DigiLocker adapter below are the two
 * clearly marked integration seams where real providers plug in.
 */

export type FieldKey = 'name' | 'dob' | 'address' | 'gender' | 'idNumber' | 'fatherName';

export type IssueSeverity = 'blocker' | 'warning' | 'info';

export interface VerificationIssue {
  id: string;
  severity: IssueSeverity;
  field: FieldKey;
  /** Documents involved in this specific disagreement. */
  documentIds: string[];
  title: string;
  detail: string;
  /** What the citizen should actually do, in plain language. */
  suggestion: string;
  /** The value MITRA believes is correct, where it can tell. */
  recommendedValue?: string;
  confidence: number;
}

export interface DocumentVerificationReport {
  documentsChecked: number;
  fieldsCompared: number;
  issues: VerificationIssue[];
  consistencyScore: number;
  readyToSubmit: boolean;
  /** The value MITRA will auto-fill into forms for each field, with its source. */
  canonicalValues: Partial<Record<FieldKey, { value: string; sourceDocId: string; agreement: number }>>;
  summary: string;
}

const FIELD_LABEL: Record<FieldKey, string> = {
  name: 'Name',
  dob: 'Date of birth',
  address: 'Address',
  gender: 'Gender',
  idNumber: 'ID number',
  fatherName: "Father's / husband's name",
};

/**
 * Documents are trusted unevenly. Aadhaar is the de-facto spine of Indian identity, so
 * when documents disagree the Aadhaar value is normally the one to correct *towards*.
 */
const DOCUMENT_AUTHORITY: Record<string, number> = {
  aadhaar: 100,
  pan: 85,
  'birth-cert': 90,
  passport: 88,
  'voter-id': 70,
  'driving-license': 65,
  'ration-card': 55,
  'caste-cert': 60,
  'income-cert': 55,
  marksheet: 50,
  'school-cert': 50,
  'bank-passbook': 45,
  'land-record': 45,
  'disability-cert': 70,
  'death-cert': 80,
};

const authorityOf = (type: string): number => DOCUMENT_AUTHORITY[type] ?? 40;

const labelOf = (doc: StoredDocument | undefined): string => doc?.name ?? 'a document';

// ─── OCR adapter ─────────────────────────────────────────────────────────────

/**
 * INTEGRATION SEAM 1 — OCR.
 *
 * In the prototype, extracted fields are already present on the document record (they
 * are produced at upload time by the simulated extractor below). In production this
 * function is replaced by a call to Google Vision / Tesseract, and nothing downstream
 * changes because the return shape is identical.
 */
export function extractFields(doc: StoredDocument): Partial<Record<FieldKey, string>> {
  const ex = doc.extracted ?? {};
  return {
    name: ex.name,
    dob: ex.dob,
    address: ex.address,
    gender: ex.gender,
    idNumber: ex.idNumber,
    fatherName: ex.fatherName,
  };
}

/**
 * INTEGRATION SEAM 2 — DigiLocker.
 *
 * Returns documents as if fetched from a citizen's DigiLocker account. Real integration
 * swaps this for the DigiLocker Issued Documents API; documents arriving this way are
 * marked `verified` because they are digitally signed at source, which means they are
 * treated as authoritative during conflict resolution.
 */
export function importFromDigiLocker(
  profile: CitizenProfile,
  available: StoredDocument[],
): StoredDocument[] {
  return available
    .filter((d) => d.ownerId === profile.id)
    .map((d) => ({ ...d, verified: true, source: 'digilocker' as const }));
}

// ─── Cross-document comparison ───────────────────────────────────────────────

interface Disagreement {
  field: FieldKey;
  docA: StoredDocument;
  docB: StoredDocument;
  valueA: string;
  valueB: string;
  score: number;
  verdict: 'match' | 'likely-match' | 'mismatch';
  note: string;
}

function compareField(
  field: FieldKey,
  valueA: string,
  valueB: string,
): { score: number; verdict: 'match' | 'likely-match' | 'mismatch'; note: string } {
  switch (field) {
    case 'name':
    case 'fatherName':
      return compareNames(valueA, valueB);
    case 'dob':
      return compareDates(valueA, valueB);
    case 'address':
      return compareAddresses(valueA, valueB);
    case 'idNumber': {
      const r = compareIdNumbers(valueA, valueB);
      return {
        score: r.match ? 1 : 0,
        verdict: r.match ? 'match' : 'mismatch',
        note: r.note,
      };
    }
    case 'gender': {
      const a = valueA.trim().toLowerCase()[0];
      const b = valueB.trim().toLowerCase()[0];
      return a === b
        ? { score: 1, verdict: 'match', note: 'Gender matches.' }
        : { score: 0, verdict: 'mismatch', note: 'Gender differs between documents.' };
    }
    default:
      return { score: 0, verdict: 'mismatch', note: 'Field could not be compared.' };
  }
}

const FIELDS: FieldKey[] = ['name', 'dob', 'address', 'gender', 'idNumber', 'fatherName'];

/**
 * Each document carries its own identifier under a different scheme — an Aadhaar number
 * and a PAN are supposed to differ. Comparing them across document types would report a
 * mismatch on every single pair, which is noise, not signal. Identifier comparison is
 * therefore restricted to documents that should genuinely carry the *same* number:
 * two copies of the same document type, or a bank passbook showing its seeded Aadhaar.
 */
const AADHAAR_LINKED = new Set(['aadhaar', 'bank-passbook', 'ration-card', 'job-card']);

function comparableIdentifiers(typeA: string, typeB: string): boolean {
  if (typeA === typeB) return true;
  return AADHAAR_LINKED.has(typeA) && AADHAAR_LINKED.has(typeB);
}

/**
 * Chooses the value to trust for a field, weighting each document's vote by how
 * authoritative that document type is. Ties break towards the more authoritative source.
 */
function resolveCanonical(
  field: FieldKey,
  docs: StoredDocument[],
): { value: string; sourceDocId: string; agreement: number } | undefined {
  const entries = docs
    .map((d) => ({ doc: d, value: extractFields(d)[field] }))
    .filter((e): e is { doc: StoredDocument; value: string } => Boolean(e.value));

  if (entries.length === 0) return undefined;

  let best = entries[0];
  let bestWeight = -1;

  for (const candidate of entries) {
    let weight = authorityOf(candidate.doc.type) + (candidate.doc.verified ? 25 : 0);
    // Every other document that agrees adds to this candidate's weight.
    for (const other of entries) {
      if (other === candidate) continue;
      const cmp = compareField(field, candidate.value, other.value);
      if (cmp.verdict === 'match') weight += authorityOf(other.doc.type) * 0.5;
      else if (cmp.verdict === 'likely-match') weight += authorityOf(other.doc.type) * 0.2;
    }
    if (weight > bestWeight) {
      bestWeight = weight;
      best = candidate;
    }
  }

  const agreeing = entries.filter(
    (e) => compareField(field, best.value, e.value).verdict !== 'mismatch',
  ).length;

  return {
    value: best.value,
    sourceDocId: best.doc.id,
    agreement: entries.length === 0 ? 0 : Math.round((agreeing / entries.length) * 100),
  };
}

function suggestionFor(d: Disagreement, canonical?: string): { text: string; recommended?: string } {
  const authA = authorityOf(d.docA.type);
  const authB = authorityOf(d.docB.type);
  const [trusted, toFix] = authA >= authB ? [d.docA, d.docB] : [d.docB, d.docA];
  const trustedValue = authA >= authB ? d.valueA : d.valueB;

  switch (d.field) {
    case 'name':
    case 'fatherName':
      return {
        text: `Get the name on your ${labelOf(toFix)} corrected to match your ${labelOf(
          trusted,
        )} — "${trustedValue}". Most departments accept the ${labelOf(
          trusted,
        )} spelling as the correct one. You can request this correction at a Common Service Centre.`,
        recommended: canonical ?? trustedValue,
      };
    case 'dob': {
      const parsed = parseIndianDate(trustedValue);
      return {
        text: `Your ${labelOf(toFix)} shows a different date of birth. Apply for a correction so it matches your ${labelOf(
          trusted,
        )}${parsed ? ` (${formatDate(parsed.iso)})` : ''}. Submitting with mismatched dates is one of the most common reasons applications are rejected.`,
        recommended: canonical ?? trustedValue,
      };
    }
    case 'address':
      return {
        text: `Update the address on your ${labelOf(toFix)} to match your ${labelOf(
          trusted,
        )}. If you have moved recently, update the older document first — scheme verification uses your current address.`,
        recommended: canonical ?? trustedValue,
      };
    case 'gender':
      return {
        text: `The gender recorded on your ${labelOf(toFix)} does not match your ${labelOf(
          trusted,
        )}. This will block verification — get it corrected before you apply.`,
        recommended: canonical ?? trustedValue,
      };
    case 'idNumber':
      return {
        text: `The ID number linked on your ${labelOf(
          toFix,
        )} does not match. Re-check the number and re-link it, as payments are released against this identifier.`,
        recommended: canonical ?? trustedValue,
      };
    default:
      return { text: 'Check this field across both documents and correct the older one.' };
  }
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Runs a full pre-application check across the citizen's documents.
 * Pass a scheme to additionally validate that every document that scheme requires is
 * present and unexpired.
 */
export function verifyDocumentSet(
  profile: CitizenProfile,
  documents: StoredDocument[],
  scheme?: Scheme,
): DocumentVerificationReport {
  const docs = documents.filter((d) => d.ownerId === profile.id);
  const issues: VerificationIssue[] = [];
  const disagreements: Disagreement[] = [];
  let fieldsCompared = 0;

  // 1. Compare every document against every other document, field by field.
  for (const field of FIELDS) {
    for (let i = 0; i < docs.length; i++) {
      for (let j = i + 1; j < docs.length; j++) {
        const a = extractFields(docs[i])[field];
        const b = extractFields(docs[j])[field];
        if (!a || !b) continue;
        if (field === 'idNumber' && !comparableIdentifiers(docs[i].type, docs[j].type)) continue;
        fieldsCompared++;
        const cmp = compareField(field, a, b);
        if (cmp.verdict !== 'match') {
          disagreements.push({
            field,
            docA: docs[i],
            docB: docs[j],
            valueA: a,
            valueB: b,
            ...cmp,
          });
        }
      }
    }
  }

  // 2. Resolve the value to trust for each field.
  const canonicalValues: DocumentVerificationReport['canonicalValues'] = {};
  for (const field of FIELDS) {
    const resolved = resolveCanonical(field, docs);
    if (resolved) canonicalValues[field] = resolved;
  }

  // 3. Turn each disagreement into an actionable alert.
  for (const d of disagreements) {
    const canonical = canonicalValues[d.field]?.value;
    const { text, recommended } = suggestionFor(d, canonical);
    const severity: IssueSeverity =
      d.verdict === 'mismatch' ? (d.field === 'address' ? 'warning' : 'blocker') : 'warning';

    issues.push({
      id: `${d.field}-${d.docA.id}-${d.docB.id}`,
      severity,
      field: d.field,
      documentIds: [d.docA.id, d.docB.id],
      title: `${FIELD_LABEL[d.field]} differs between ${labelOf(d.docA)} and ${labelOf(d.docB)}`,
      detail: `${labelOf(d.docA)} says "${d.valueA}", ${labelOf(d.docB)} says "${d.valueB}". ${d.note}`,
      suggestion: text,
      recommendedValue: recommended,
      confidence: Math.round((1 - d.score) * 100),
    });
  }

  // 4. Compare the trusted values against what the citizen entered in their profile.
  const profileName = canonicalValues.name;
  if (profileName) {
    const cmp = compareNames(profileName.value, profile.name);
    if (cmp.verdict === 'mismatch') {
      issues.push({
        id: 'profile-name-mismatch',
        severity: 'warning',
        field: 'name',
        documentIds: [profileName.sourceDocId],
        title: 'Your profile name does not match your documents',
        detail: `Your documents consistently show "${profileName.value}" but your MITRA profile says "${profile.name}".`,
        suggestion: `Update your MITRA profile to "${profileName.value}" so that auto-filled forms match your documents exactly.`,
        recommendedValue: profileName.value,
        confidence: Math.round((1 - cmp.score) * 100),
      });
    }
  }

  // 5. Expiry and verification-status checks.
  const now = Date.now();
  for (const doc of docs) {
    if (!doc.expiresAt) continue;
    const daysLeft = Math.round((new Date(doc.expiresAt).getTime() - now) / 86_400_000);
    if (daysLeft < 0) {
      issues.push({
        id: `expired-${doc.id}`,
        severity: 'blocker',
        field: 'idNumber',
        documentIds: [doc.id],
        title: `${doc.name} has expired`,
        detail: `It lapsed ${Math.abs(daysLeft)} days ago, on ${formatDate(doc.expiresAt.slice(0, 10))}.`,
        suggestion: `Apply for a fresh ${doc.name.toLowerCase()} before you submit. Most departments reject applications carrying an expired certificate outright.`,
        confidence: 100,
      });
    } else if (daysLeft < 90) {
      issues.push({
        id: `expiring-${doc.id}`,
        severity: 'warning',
        field: 'idNumber',
        documentIds: [doc.id],
        title: `${doc.name} expires in ${daysLeft} days`,
        detail: `Valid until ${formatDate(doc.expiresAt.slice(0, 10))}. Processing this application takes time, and it may still be under review when the certificate lapses.`,
        suggestion: `Renew it now so the certificate stays valid through the whole review period.`,
        confidence: 90,
      });
    }
  }

  // 6. Scheme-specific completeness check.
  if (scheme) {
    const held = new Set(docs.map((d) => d.type));
    for (const req of scheme.documents) {
      if (!held.has(req.id)) {
        issues.push({
          id: `missing-${req.id}`,
          severity: 'blocker',
          field: 'idNumber',
          documentIds: [],
          title: `${req.name} is missing`,
          detail: `${scheme.shortName} requires this document and it is not in your vault yet.`,
          suggestion: `Upload your ${req.name.toLowerCase()}, or fetch it from DigiLocker if it is already issued digitally.`,
          confidence: 100,
        });
      }
    }
  }

  const blockers = issues.filter((i) => i.severity === 'blocker').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;

  const consistencyScore =
    fieldsCompared === 0
      ? docs.length > 0
        ? 100
        : 0
      : Math.max(0, Math.round(100 - (blockers * 18 + warnings * 7)));

  const summary =
    docs.length === 0
      ? 'No documents uploaded yet. Add your documents and MITRA will cross-check them before you apply.'
      : blockers > 0
        ? `${blockers} issue${blockers > 1 ? 's' : ''} will very likely cause a rejection. Fix ${
            blockers > 1 ? 'these' : 'this'
          } before submitting.`
        : warnings > 0
          ? `Your documents broadly agree. ${warnings} minor point${
              warnings > 1 ? 's are' : ' is'
            } worth correcting to be safe.`
          : `All ${docs.length} documents agree with each other. You are ready to submit.`;

  // Sort so the most serious problems are read first.
  const order: Record<IssueSeverity, number> = { blocker: 0, warning: 1, info: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity] || b.confidence - a.confidence);

  return {
    documentsChecked: docs.length,
    fieldsCompared,
    issues,
    consistencyScore,
    readyToSubmit: blockers === 0 && docs.length > 0,
    canonicalValues,
    summary,
  };
}

/**
 * Values MITRA will pre-fill into an application form, drawn from the documents that
 * won the authority-weighted vote. Auto-fill uses document data rather than profile
 * data because it is the document values that the department will verify against.
 */
export function autofillValues(
  report: DocumentVerificationReport,
): Record<string, { value: string; confidence: number }> {
  const out: Record<string, { value: string; confidence: number }> = {};
  for (const [field, resolved] of Object.entries(report.canonicalValues)) {
    if (resolved) out[field] = { value: resolved.value, confidence: resolved.agreement };
  }
  return out;
}
