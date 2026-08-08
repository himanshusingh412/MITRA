import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { ok } from '@/lib/db/http';
import { handleError, rateLimit, sameOrigin } from '@/lib/db/guard';
import { HttpError, requireCitizen } from '@/lib/db/session';
import { toCitizenProfile } from '@/lib/db/mappers';
import type { Area, Category, Gender, LifeEvent, Occupation } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Field-level validation for the profile.
 *
 * An allow-list rather than a spread, so a future column cannot become citizen-writable
 * by accident — and every value is range-checked, because these fields feed the
 * eligibility engine. An income of -1 or an age of 900 would not crash anything; it
 * would quietly produce a wrong entitlement answer, which is worse.
 */
const GENDERS: Gender[] = ['male', 'female', 'other'];
const AREAS: Area[] = ['rural', 'urban'];
const CATEGORIES: Category[] = ['general', 'sc', 'st', 'obc', 'ews', 'minority'];
const OCCUPATIONS: Occupation[] = [
  'farmer', 'student', 'salaried', 'self-employed', 'daily-wage',
  'homemaker', 'unemployed', 'retired', 'artisan',
];
const LIFE_EVENTS: LifeEvent[] = [
  'marriage', 'childbirth', 'job-loss', 'started-studies', 'started-business',
  'disability', 'senior-citizen', 'farming-season', 'bought-home', 'bereavement',
];

const bad = (field: string, why: string) =>
  new HttpError('VALIDATION_ERROR', `${field} ${why}`, 422);

const str = (v: unknown, field: string, max: number) => {
  if (typeof v !== 'string' || v.trim().length === 0) throw bad(field, 'must be text.');
  if (v.length > max) throw bad(field, `must be ${max} characters or fewer.`);
  return v.trim();
};

const int = (v: unknown, field: string, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw bad(field, 'must be a whole number.');
  if (n < min || n > max) throw bad(field, `must be between ${min} and ${max}.`);
  return n;
};

const oneOf = <T extends string>(v: unknown, field: string, allowed: T[]): T => {
  if (typeof v !== 'string' || !allowed.includes(v as T)) throw bad(field, 'is not a valid option.');
  return v as T;
};

type Validator = (v: unknown) => unknown;

const FIELDS: Record<string, Validator> = {
  name: (v) => str(v, 'Name', 120),
  age: (v) => int(v, 'Age', 0, 120),
  gender: (v) => oneOf(v, 'Gender', GENDERS),
  state: (v) => str(v, 'State', 60),
  district: (v) => str(v, 'District', 60),
  area: (v) => oneOf(v, 'Area', AREAS),
  occupation: (v) => oneOf(v, 'Occupation', OCCUPATIONS).replace(/-/g, '_'),
  annualIncome: (v) => int(v, 'Annual income', 0, 100_000_000),
  category: (v) => oneOf(v, 'Category', CATEGORIES),
  familySize: (v) => int(v, 'Family size', 1, 30),
  hasDisability: (v) => {
    if (typeof v !== 'boolean') throw bad('Disability', 'must be true or false.');
    return v;
  },
  disabilityPercent: (v) => (v === null ? null : int(v, 'Disability percentage', 0, 100)),
  landHoldingHectares: (v) => {
    if (v === null) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 10_000) throw bad('Land holding', 'is not valid.');
    return n;
  },
  existingBenefits: (v) => {
    if (!Array.isArray(v) || v.length > 40) throw bad('Existing benefits', 'is not valid.');
    return v.map((x) => str(x, 'Benefit', 60));
  },
  // The assistant writes detected life events back here, which is what makes the
  // recommendations change as the conversation goes on.
  lifeEvents: (v) => {
    if (!Array.isArray(v) || v.length > 20) throw bad('Life events', 'is not valid.');
    return v.map((x) => oneOf(x, 'Life event', LIFE_EVENTS));
  },
  locale: (v) => oneOf(v, 'Language', ['en', 'hi', 'bn', 'ta', 'mr']),
};

export async function PATCH(req: NextRequest) {
  try {
    sameOrigin(req);
    rateLimit(req, 'profile', 60, 60_000);
    const citizenId = await requireCitizen();

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      throw new HttpError('VALIDATION_ERROR', 'A JSON body is required.', 422);
    }

    const data: Record<string, unknown> = {};
    for (const [key, validate] of Object.entries(FIELDS)) {
      if (body[key] === undefined) continue;
      data[key] = validate(body[key]);
    }

    if (Object.keys(data).length === 0) {
      throw new HttpError('VALIDATION_ERROR', 'No writable fields were supplied.', 422);
    }

    // Scoped by the session subject, so this can only ever update the caller's own row.
    const updated = await prisma.citizen.update({ where: { id: citizenId }, data });
    return ok(toCitizenProfile(updated));
  } catch (e) {
    return handleError('profile', e);
  }
}
