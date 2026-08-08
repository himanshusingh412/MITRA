import type {
  Application,
  ApplicationStatus,
  CitizenProfile,
  LifeEvent,
  Notification,
  Occupation,
  StoredDocument,
} from '@/types';

/**
 * The only place allowed to translate between Prisma rows and domain types.
 *
 * Prisma forbids hyphens in enum members, but the UI unions use them
 * ('under-review', 'self-employed'). Rather than leak snake_case into the
 * components — or weaken the unions to plain strings — every conversion happens
 * here and nowhere else.
 */

const toHyphen = <T extends string>(v: string): T => v.replace(/_/g, '-') as T;
const toSnake = (v: string): string => v.replace(/-/g, '_');

export const statusToDb = (s: ApplicationStatus) => toSnake(s) as never;
export const statusFromDb = (s: string) => toHyphen<ApplicationStatus>(s);
export const occupationToDb = (o: Occupation) => toSnake(o) as never;
export const occupationFromDb = (o: string) => toHyphen<Occupation>(o);

/** Decimal columns arrive as Prisma.Decimal; the UI wants a plain number. */
const decimalToNumber = (v: unknown): number | undefined =>
  v === null || v === undefined ? undefined : Number(v);

type CitizenRow = {
  id: string;
  name: string;
  age: number;
  gender: string;
  state: string;
  district: string;
  area: string;
  occupation: string;
  annualIncome: number;
  category: string;
  familySize: number;
  hasDisability: boolean;
  disabilityPercent: number | null;
  landHoldingHectares: unknown;
  existingBenefits: string[];
  lifeEvents: string[];
  relation: string | null;
  avatarColor: string | null;
};

export function toCitizenProfile(row: CitizenRow): CitizenProfile {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    gender: row.gender as CitizenProfile['gender'],
    state: row.state,
    district: row.district,
    area: row.area as CitizenProfile['area'],
    occupation: occupationFromDb(row.occupation),
    annualIncome: row.annualIncome,
    category: row.category as CitizenProfile['category'],
    familySize: row.familySize,
    hasDisability: row.hasDisability,
    disabilityPercent: row.disabilityPercent ?? undefined,
    landHoldingHectares: decimalToNumber(row.landHoldingHectares),
    existingBenefits: row.existingBenefits,
    lifeEvents: row.lifeEvents as LifeEvent[],
    relation: row.relation ?? undefined,
    avatarColor: row.avatarColor ?? undefined,
  };
}

type ApplicationRow = {
  id: string;
  schemeId: string;
  applicantId: string;
  status: string;
  progressStep: number;
  totalSteps: number;
  referenceNo: string;
  district: string;
  submittedAt: Date;
  updatedAt: Date;
  applicant?: { name: string } | null;
  timeline?: { at: Date; status: string; note: string }[];
};

export function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    schemeId: row.schemeId,
    applicantId: row.applicantId,
    applicantName: row.applicant?.name ?? '',
    status: statusFromDb(row.status),
    submittedAt: row.submittedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    progressStep: row.progressStep,
    totalSteps: row.totalSteps,
    referenceNo: row.referenceNo,
    district: row.district,
    timeline: (row.timeline ?? []).map((e) => ({
      at: e.at.toISOString(),
      status: statusFromDb(e.status),
      note: e.note,
    })),
  };
}

type DocumentRow = {
  id: string;
  name: string;
  type: string;
  ownerId: string;
  uploadedAt: Date;
  expiresAt: Date | null;
  verified: boolean;
  source: string;
  extracted: unknown;
};

export function toStoredDocument(row: DocumentRow): StoredDocument {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    ownerId: row.ownerId,
    uploadedAt: row.uploadedAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString(),
    verified: row.verified,
    source: row.source as StoredDocument['source'],
    extracted: (row.extracted as Record<string, string> | null) ?? undefined,
  };
}

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  kind: string;
  at: Date;
  read: boolean;
  href: string | null;
};

export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    kind: row.kind as Notification['kind'],
    at: row.at.toISOString(),
    read: row.read,
    href: row.href ?? undefined,
  };
}
