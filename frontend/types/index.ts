/** Core domain types for MITRA. Shared by the data layer, engines and UI. */

export type Locale = 'en' | 'hi' | 'bn' | 'ta' | 'mr';

export type Category =
  | 'general'
  | 'sc'
  | 'st'
  | 'obc'
  | 'ews'
  | 'minority';

export type Occupation =
  | 'farmer'
  | 'student'
  | 'salaried'
  | 'self-employed'
  | 'daily-wage'
  | 'homemaker'
  | 'unemployed'
  | 'retired'
  | 'artisan';

export type Gender = 'male' | 'female' | 'other';
export type Area = 'rural' | 'urban';

export type LifeEvent =
  | 'marriage'
  | 'childbirth'
  | 'job-loss'
  | 'started-studies'
  | 'started-business'
  | 'disability'
  | 'senior-citizen'
  | 'farming-season'
  | 'bought-home'
  | 'bereavement';

export interface CitizenProfile {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  state: string;
  district: string;
  area: Area;
  occupation: Occupation;
  annualIncome: number;
  category: Category;
  familySize: number;
  hasDisability: boolean;
  disabilityPercent?: number;
  landHoldingHectares?: number;
  existingBenefits: string[];
  lifeEvents: LifeEvent[];
  relation?: string;
  avatarColor?: string;
}

export type SchemeSector =
  | 'agriculture'
  | 'health'
  | 'education'
  | 'housing'
  | 'pension'
  | 'employment'
  | 'business'
  | 'women-child'
  | 'disability'
  | 'financial';

/**
 * A single machine-evaluable eligibility criterion.
 * Rules are data, not code — new schemes are added without touching the engine.
 */
export interface Rule {
  field: keyof CitizenProfile;
  op: 'eq' | 'neq' | 'lte' | 'gte' | 'in' | 'nin' | 'includes' | 'excludes' | 'exists';
  value?: string | number | boolean | Array<string | number>;
  /** Human-readable statement of the rule, shown in the explanation panel. */
  label: string;
  /** A rule marked soft downgrades a match to "verify" instead of failing it outright. */
  soft?: boolean;
}

export interface DocumentRequirement {
  id: string;
  name: string;
  /** Only requested when this predicate passes — checklists stay personal, not generic. */
  requiredIf?: Rule;
  validityMonths?: number;
  note?: string;
}

export interface Scheme {
  id: string;
  name: string;
  shortName: string;
  ministry: string;
  sector: SchemeSector;
  level: 'central' | 'state';
  tagline: string;
  /** Plain-language description written at roughly a class-8 reading level. */
  summary: string;
  benefitHeadline: string;
  benefitDetail: string;
  rules: Rule[];
  documents: DocumentRequirement[];
  applyMode: string[];
  processingDays: number;
  officialUrl: string;
  state?: string;
  sourceUrl?: string;
  sourceName?: string;
  sourceType?: 'live_api' | 'authoritative_catalogue';
  lastUpdated?: string;
  fetchedAt?: string;
  isActive?: boolean;
  relatedLifeEvents: LifeEvent[];
  icon: string;
  accent: 'blue' | 'green' | 'amber' | 'violet' | 'rose' | 'teal';
}

export type MatchLevel = 'eligible' | 'verify' | 'not-eligible';

export interface RuleResult {
  label: string;
  passed: boolean;
  soft: boolean;
}

export interface EligibilityResult {
  schemeId: string;
  level: MatchLevel;
  score: number;
  passed: RuleResult[];
  failed: RuleResult[];
  reason: string;
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under-review'
  | 'info-needed'
  | 'approved'
  | 'rejected'
  | 'disbursed';

export interface ApplicationEvent {
  at: string;
  status: ApplicationStatus;
  note: string;
}

export interface Application {
  id: string;
  schemeId: string;
  applicantId: string;
  applicantName: string;
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  progressStep: number;
  totalSteps: number;
  referenceNo: string;
  timeline: ApplicationEvent[];
  district: string;
}

export type DocumentSource = 'upload' | 'digilocker' | 'csc';

export interface StoredDocument {
  id: string;
  name: string;
  type: string;
  ownerId: string;
  uploadedAt: string;
  expiresAt?: string;
  verified: boolean;
  /** How the document entered the vault. DigiLocker documents are signed at source. */
  source?: DocumentSource;
  /**
   * Fields OCR extracted from the upload. Compared across every other document to
   * catch inconsistencies before an application is submitted.
   * Keys: name, dob, address, gender, idNumber, fatherName.
   */
  extracted?: Record<string, string>;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  kind: 'deadline' | 'status' | 'renewal' | 'recommendation';
  at: string;
  read: boolean;
  href?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
  /** Scheme ids the assistant surfaced as cards alongside this reply. */
  schemeRefs?: string[];
  actions?: { label: string; href: string }[];
}

export interface Complaint {
  id: string;
  citizen: string;
  district: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved';
  raisedAt: string;
  category: string;
}

export interface ServiceTileData {
  id: string;
  name: string;
  icon: string;
  accent: string;
  description: string;
  href: string;
}
