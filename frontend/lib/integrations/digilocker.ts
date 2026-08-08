import type { StoredDocument } from '@/types';

/**
 * DigiLocker integration.
 *
 * DigiLocker is MeitY's issued-document repository. Documents fetched from it are
 * digitally signed at source, which is why MITRA treats them as authoritative when
 * documents disagree — a DigiLocker Aadhaar outranks a photographed one.
 *
 * The real API is an OAuth 2.0 authorisation-code flow against
 * `https://api.digitallocker.gov.in/public/oauth2/1/`, and access requires a registered
 * partner application. That registration is a government onboarding process, not an API
 * key you can self-serve, so this module ships a `MockDigiLockerProvider` that implements
 * the identical interface and is swapped for `HttpDigiLockerProvider` once credentials
 * exist. Nothing above this file changes when that swap happens — the UI, the store and
 * the verification engine all talk to `DigiLockerProvider`.
 */

export interface DigiLockerIssuedDoc {
  /** DigiLocker URI — the stable handle for an issued document. */
  uri: string;
  name: string;
  /** MITRA document type, mapped from DigiLocker's `doctype`. */
  type: string;
  issuer: string;
  issuedOn?: string;
  expiresOn?: string;
  /** Fields the issuer publishes in the signed XML payload. */
  fields?: Record<string, string>;
}

export interface DigiLockerAccount {
  connected: boolean;
  /** Masked — MITRA never stores or displays a full Aadhaar number. */
  maskedId?: string;
  name?: string;
  connectedAt?: string;
  /** Scopes the citizen actually granted. Revocable individually. */
  grantedScopes: DigiLockerScope[];
  lastSyncedAt?: string;
}

export type DigiLockerScope = 'issued-documents' | 'profile' | 'aadhaar-kyc';

export const SCOPE_LABEL: Record<DigiLockerScope, { label: string; detail: string }> = {
  'issued-documents': {
    label: 'Issued documents',
    detail: 'Read certificates issued to you — Aadhaar, PAN, marksheets, caste and income certificates.',
  },
  profile: {
    label: 'Basic profile',
    detail: 'Your name, date of birth and gender as held by DigiLocker.',
  },
  'aadhaar-kyc': {
    label: 'Aadhaar KYC',
    detail: 'Full demographic KYC. MITRA does not request this — listed so you can see it is not used.',
  },
};

export interface DigiLockerProvider {
  /** Begins the authorisation flow. Returns the URL to send the citizen to. */
  beginAuthorisation(scopes: DigiLockerScope[]): Promise<{ authorisationUrl: string; state: string }>;
  /** Exchanges the returned code for a session. */
  completeAuthorisation(code: string, state: string): Promise<DigiLockerAccount>;
  /** Lists documents the citizen has issued in their locker. */
  listIssuedDocuments(): Promise<DigiLockerIssuedDoc[]>;
  /** Revokes the connection and forgets the tokens. */
  disconnect(): Promise<void>;
}

/** DigiLocker `doctype` → MITRA document type. */
const DOCTYPE_MAP: Record<string, string> = {
  ADHAR: 'aadhaar',
  PANCR: 'pan',
  DRVLC: 'driving-license',
  MRKSH: 'marksheet',
  CASTE: 'caste-cert',
  INCOM: 'income-cert',
  BIRTH: 'birth-cert',
  RATIN: 'ration-card',
};

export const mapDocType = (doctype: string): string =>
  DOCTYPE_MAP[doctype.toUpperCase()] ?? doctype.toLowerCase();

/**
 * Converts a DigiLocker issued document into a MITRA vault document.
 *
 * `verified: true` and `source: 'digilocker'` are what make the verification engine
 * treat this copy as the trustworthy one during conflict resolution.
 */
export function toStoredDocument(
  doc: DigiLockerIssuedDoc,
  ownerId: string,
): StoredDocument {
  return {
    id: `dl-${doc.uri.split('/').pop() ?? doc.type}-${ownerId}`,
    name: doc.name,
    type: doc.type,
    ownerId,
    uploadedAt: new Date().toISOString(),
    expiresAt: doc.expiresOn,
    verified: true,
    source: 'digilocker',
    extracted: doc.fields,
  };
}

/**
 * Mock provider — used until partner credentials exist.
 *
 * Deliberately simulates the parts of the real flow that affect the UI: an authorisation
 * round trip, network latency, and a document list that arrives asynchronously. It does
 * not simulate failure modes the UI already handles elsewhere.
 */
export class MockDigiLockerProvider implements DigiLockerProvider {
  constructor(private readonly seed: DigiLockerIssuedDoc[] = DEMO_ISSUED_DOCS) {}

  async beginAuthorisation(scopes: DigiLockerScope[]) {
    await delay(300);
    const state = crypto.randomUUID();
    // The real flow leaves the app; the mock stays in it and returns a sentinel the
    // connect screen recognises.
    return {
      authorisationUrl: `mitra://digilocker-mock?scopes=${scopes.join(',')}&state=${state}`,
      state,
    };
  }

  async completeAuthorisation(_code: string, _state: string): Promise<DigiLockerAccount> {
    await delay(900);
    return {
      connected: true,
      maskedId: 'XXXX XXXX 4417',
      name: 'Ravi Kumar',
      connectedAt: new Date().toISOString(),
      grantedScopes: ['issued-documents', 'profile'],
      lastSyncedAt: new Date().toISOString(),
    };
  }

  async listIssuedDocuments(): Promise<DigiLockerIssuedDoc[]> {
    await delay(1100);
    return this.seed;
  }

  async disconnect(): Promise<void> {
    await delay(250);
  }
}

/**
 * Real provider — the shape the production implementation takes.
 *
 * Left unimplemented on purpose rather than half-written: a partially real OAuth client
 * that silently falls back to mock data is exactly the kind of thing that looks working
 * in a demo and fails in a pilot. Each method throws with the specific missing piece.
 */
export class HttpDigiLockerProvider implements DigiLockerProvider {
  constructor(
    private readonly config: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      baseUrl?: string;
    },
  ) {}

  private notConfigured(step: string): never {
    throw new Error(
      `DigiLocker ${step} requires a registered MeitY partner application. ` +
        'Set DIGILOCKER_CLIENT_ID, DIGILOCKER_CLIENT_SECRET and DIGILOCKER_REDIRECT_URI, ' +
        'then implement this method against https://api.digitallocker.gov.in/public/oauth2/1/.',
    );
  }

  async beginAuthorisation(): Promise<{ authorisationUrl: string; state: string }> {
    this.notConfigured('authorisation');
  }
  async completeAuthorisation(): Promise<DigiLockerAccount> {
    this.notConfigured('token exchange');
  }
  async listIssuedDocuments(): Promise<DigiLockerIssuedDoc[]> {
    this.notConfigured('document listing');
  }
  async disconnect(): Promise<void> {
    this.notConfigured('revocation');
  }
}

/** Selects the provider based on whether partner credentials are present. */
export function getDigiLockerProvider(): DigiLockerProvider {
  const clientId = process.env.NEXT_PUBLIC_DIGILOCKER_CLIENT_ID;
  if (!clientId) return new MockDigiLockerProvider();
  return new HttpDigiLockerProvider({
    clientId,
    clientSecret: '',
    redirectUri: `${window.location.origin}/documents/digilocker/callback`,
  });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Documents the demo household holds in DigiLocker.
 *
 * Intentionally overlaps the manually uploaded set so the connect flow demonstrates the
 * thing that actually matters: a DigiLocker copy of a document supersedes a photographed
 * one, and the verification engine's conflict resolution shifts accordingly.
 */
const DEMO_ISSUED_DOCS: DigiLockerIssuedDoc[] = [
  {
    uri: 'in.gov.uidai-ADHAR-4417',
    name: 'Aadhaar Card',
    type: 'aadhaar',
    issuer: 'Unique Identification Authority of India',
    issuedOn: '2012-06-18',
    fields: {
      name: 'Ravi Kumar',
      dob: '14/03/1992',
      gender: 'Male',
      address: 'Vill- Bahadurpur, PO- Kanti, Dist- Muzaffarpur, Bihar - 843130',
      idNumber: 'XXXX XXXX 4417',
      fatherName: 'Ram Dev Singh',
    },
  },
  {
    uri: 'in.gov.pan-PANCR-4417',
    name: 'PAN Card',
    type: 'pan',
    issuer: 'Income Tax Department',
    issuedOn: '2014-02-09',
    fields: {
      name: 'Ravi Kumar',
      dob: '14/03/1992',
      fatherName: 'Ram Dev Singh',
      idNumber: 'BXKPK4417M',
    },
  },
  {
    uri: 'in.gov.bihar-INCOM-9921',
    name: 'Income Certificate',
    type: 'income-cert',
    issuer: 'Revenue Department, Government of Bihar',
    issuedOn: new Date(Date.now() - 20 * 86_400_000).toISOString().slice(0, 10),
    // Freshly issued — replaces the lapsed copy in the vault, which is the point.
    expiresOn: new Date(Date.now() + 345 * 86_400_000).toISOString(),
    fields: {
      name: 'Ravi Kumar',
      address: 'Vill- Bahadurpur, PO- Kanti, Dist- Muzaffarpur, Bihar - 843130',
      fatherName: 'Ram Dev Singh',
    },
  },
];
