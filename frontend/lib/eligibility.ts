import type {
  CitizenProfile,
  EligibilityResult,
  Rule,
  RuleResult,
  Scheme,
  DocumentRequirement,
  StoredDocument,
} from '@/types';
import { SCHEMES } from './schemes';

/**
 * MITRA eligibility engine.
 *
 * Rules are declarative data (see lib/schemes.ts), so the engine never needs to change
 * when a scheme is added. Every result carries the specific rules that drove it — the
 * UI shows this reasoning rather than presenting a black-box verdict.
 */

function readField(profile: CitizenProfile, field: keyof CitizenProfile): unknown {
  return profile[field];
}

export function evaluateRule(profile: CitizenProfile, rule: Rule): boolean {
  const actual = readField(profile, rule.field);
  const expected = rule.value;

  switch (rule.op) {
    case 'exists':
      return actual !== undefined && actual !== null && actual !== '';
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'lte':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case 'gte':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case 'in':
      return Array.isArray(expected) && expected.includes(actual as string | number);
    case 'nin':
      return Array.isArray(expected) && !expected.includes(actual as string | number);
    case 'includes':
      return Array.isArray(actual) && actual.includes(expected as never);
    case 'excludes':
      return Array.isArray(actual) && !actual.includes(expected as never);
    default:
      return false;
  }
}

/**
 * A scheme is "eligible" only when every hard rule passes.
 * A failing soft rule downgrades to "verify" rather than rejecting — these are the
 * criteria that depend on documents or state-level variants MITRA cannot confirm.
 */
export function evaluateScheme(profile: CitizenProfile, scheme: Scheme): EligibilityResult {
  const passed: RuleResult[] = [];
  const failed: RuleResult[] = [];

  for (const rule of scheme.rules) {
    const ok = evaluateRule(profile, rule);
    const entry: RuleResult = { label: rule.label, passed: ok, soft: Boolean(rule.soft) };
    if (ok) passed.push(entry);
    else failed.push(entry);
  }

  const hardFailures = failed.filter((f) => !f.soft);
  const softFailures = failed.filter((f) => f.soft);

  /**
   * A near-miss is only worth surfacing when the failing criterion is a *threshold*
   * (an income ceiling, an age band), because those genuinely vary between states and
   * are worth verifying locally. A categorical failure — living in a rural area when
   * the scheme is urban-only, or the wrong gender for a girl-child scheme — is a real
   * disqualification, and telling the citizen to "go and check" would waste their trip.
   */
  const thresholdOps = new Set(['lte', 'gte']);
  const onlyThresholdFailure =
    hardFailures.length === 1 &&
    scheme.rules.some((r) => r.label === hardFailures[0].label && thresholdOps.has(r.op));

  let level: EligibilityResult['level'];
  let reason: string;

  if (hardFailures.length === 0 && softFailures.length === 0) {
    level = 'eligible';
    reason = `You meet all ${passed.length} criteria we can check for this scheme.`;
  } else if (hardFailures.length === 0) {
    level = 'verify';
    reason = `You meet the main criteria. ${softFailures.length} point${
      softFailures.length > 1 ? 's need' : ' needs'
    } confirmation with a document or at your local centre.`;
  } else if (onlyThresholdFailure) {
    level = 'verify';
    reason = `You are close: one limit does not match — "${hardFailures[0].label.toLowerCase()}". Worth confirming, because states often set this threshold differently.`;
  } else {
    level = 'not-eligible';
    reason =
      hardFailures.length === 1
        ? `You do not currently meet one essential condition: ${hardFailures[0].label.toLowerCase()}.`
        : `${hardFailures.length} of the required criteria do not match your profile right now.`;
  }

  const score =
    scheme.rules.length === 0 ? 0 : Math.round((passed.length / scheme.rules.length) * 100);

  return { schemeId: scheme.id, level, score, passed, failed, reason };
}

export function evaluateAll(profile: CitizenProfile): EligibilityResult[] {
  return SCHEMES.map((s) => evaluateScheme(profile, s));
}

const LEVEL_WEIGHT: Record<EligibilityResult['level'], number> = {
  eligible: 1000,
  verify: 500,
  'not-eligible': 0,
};

/**
 * Ranks schemes for a citizen. Beyond raw eligibility we boost schemes tied to a
 * life event the citizen has declared — a person who just lost their job should see
 * employment support before a savings scheme they also technically qualify for.
 */
export function recommendSchemes(
  profile: CitizenProfile,
  opts: { limit?: number; includeIneligible?: boolean; sector?: string } = {},
): Array<{ scheme: Scheme; result: EligibilityResult }> {
  const { limit, includeIneligible = false, sector } = opts;

  const rows = SCHEMES.filter((s) => (sector ? s.sector === sector : true))
    .map((scheme) => ({ scheme, result: evaluateScheme(profile, scheme) }))
    .filter((row) => (includeIneligible ? true : row.result.level !== 'not-eligible'))
    .map((row) => {
      const lifeEventBoost = row.scheme.relatedLifeEvents.some((e) => profile.lifeEvents.includes(e))
        ? 200
        : 0;
      const alreadyHas = profile.existingBenefits.includes(row.scheme.id) ? -900 : 0;
      const rank = LEVEL_WEIGHT[row.result.level] + row.result.score + lifeEventBoost + alreadyHas;
      return { ...row, rank };
    })
    .sort((a, b) => b.rank - a.rank)
    .map(({ scheme, result }) => ({ scheme, result }));

  return limit ? rows.slice(0, limit) : rows;
}

/**
 * Builds a personalised document checklist: conditional documents are only included
 * when their predicate matches this citizen, so nobody is asked for paperwork they
 * do not actually need.
 */
export function buildChecklist(
  profile: CitizenProfile,
  scheme: Scheme,
  owned: StoredDocument[],
): Array<{ doc: DocumentRequirement; status: 'have' | 'missing' | 'expiring'; detail: string }> {
  const applicable = scheme.documents.filter((d) =>
    d.requiredIf ? evaluateRule(profile, d.requiredIf) : true,
  );

  return applicable.map((doc) => {
    const match = owned.find((o) => o.type === doc.id && o.ownerId === profile.id);
    if (!match) {
      return { doc, status: 'missing' as const, detail: 'Not in your document vault yet.' };
    }
    if (match.expiresAt) {
      const daysLeft = Math.round(
        (new Date(match.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft < 0) {
        return { doc, status: 'missing' as const, detail: `Expired ${Math.abs(daysLeft)} days ago — renew before applying.` };
      }
      if (daysLeft < 90) {
        return { doc, status: 'expiring' as const, detail: `Valid for ${daysLeft} more days. Renew soon.` };
      }
    }
    if (!match.verified) {
      return { doc, status: 'expiring' as const, detail: 'Uploaded but not yet verified.' };
    }
    return { doc, status: 'have' as const, detail: 'Verified and ready to use.' };
  });
}

/** Cross-checks OCR-extracted fields against the profile to catch wrong or mismatched uploads. */
export function verifyDocument(
  profile: CitizenProfile,
  doc: StoredDocument,
): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const ex = doc.extracted ?? {};

  if (ex.name && ex.name.trim().toLowerCase() !== profile.name.trim().toLowerCase()) {
    issues.push(`Name on the document reads "${ex.name}" but your profile says "${profile.name}".`);
  }
  if (ex.dob) {
    const derivedAge = new Date().getFullYear() - new Date(ex.dob).getFullYear();
    if (Math.abs(derivedAge - profile.age) > 1) {
      issues.push(`Date of birth suggests age ${derivedAge}, your profile says ${profile.age}.`);
    }
  }
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) {
    issues.push('This document has expired.');
  }
  return { ok: issues.length === 0, issues };
}
