import type {
  Application,
  CitizenProfile,
  Complaint,
  Notification,
  ServiceTileData,
  StoredDocument,
} from '@/types';

/**
 * Seed data for the MITRA prototype.
 *
 * The document set for the primary citizen deliberately contains the three
 * inconsistencies that most often cause real rejections — a transliteration variant of
 * the name, a day/month-swapped date of birth, and a lapsed income certificate — so the
 * pre-application verification engine has genuine problems to find rather than a
 * contrived error injected for the demo.
 */

const iso = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86_400_000).toISOString();

export const PRIMARY_USER: CitizenProfile = {
  id: 'u-ravi',
  name: 'Ravi Kumar',
  age: 34,
  gender: 'male',
  state: 'Bihar',
  district: 'Muzaffarpur',
  area: 'rural',
  occupation: 'farmer',
  annualIncome: 148000,
  category: 'obc',
  familySize: 5,
  hasDisability: false,
  landHoldingHectares: 1.2,
  existingBenefits: ['e-shram'],
  lifeEvents: ['farming-season'],
  avatarColor: '#4F46E5',
};

export const FAMILY: CitizenProfile[] = [
  {
    id: 'u-sunita',
    name: 'Sunita Devi',
    age: 31,
    gender: 'female',
    state: 'Bihar',
    district: 'Muzaffarpur',
    area: 'rural',
    occupation: 'homemaker',
    annualIncome: 0,
    category: 'obc',
    familySize: 5,
    hasDisability: false,
    existingBenefits: [],
    lifeEvents: ['childbirth'],
    relation: 'Spouse',
    avatarColor: '#DB2777',
  },
  {
    id: 'u-anjali',
    name: 'Anjali Kumari',
    age: 17,
    gender: 'female',
    state: 'Bihar',
    district: 'Muzaffarpur',
    area: 'rural',
    occupation: 'student',
    annualIncome: 0,
    category: 'obc',
    familySize: 5,
    hasDisability: false,
    existingBenefits: [],
    lifeEvents: ['started-studies'],
    relation: 'Daughter',
    avatarColor: '#7C3AED',
  },
  {
    id: 'u-ramdev',
    name: 'Ram Dev Singh',
    age: 67,
    gender: 'male',
    state: 'Bihar',
    district: 'Muzaffarpur',
    area: 'rural',
    occupation: 'retired',
    annualIncome: 42000,
    category: 'obc',
    familySize: 5,
    hasDisability: true,
    disabilityPercent: 45,
    existingBenefits: [],
    lifeEvents: ['senior-citizen'],
    relation: 'Father',
    avatarColor: '#0891B2',
  },
  {
    id: 'u-meena',
    name: 'Meena Devi',
    age: 63,
    gender: 'female',
    state: 'Bihar',
    district: 'Muzaffarpur',
    area: 'rural',
    occupation: 'homemaker',
    annualIncome: 0,
    category: 'obc',
    familySize: 5,
    hasDisability: false,
    existingBenefits: [],
    lifeEvents: ['senior-citizen'],
    relation: 'Mother',
    avatarColor: '#EA580C',
  },
];

export const ALL_PEOPLE = [PRIMARY_USER, ...FAMILY];

export const DOCUMENTS: StoredDocument[] = [
  {
    id: 'd-aadhaar-ravi',
    name: 'Aadhaar Card',
    type: 'aadhaar',
    ownerId: 'u-ravi',
    uploadedAt: iso(-210),
    verified: true,
    source: 'digilocker',
    extracted: {
      name: 'Ravi Kumar',
      dob: '14/03/1992',
      gender: 'Male',
      address: 'Vill- Bahadurpur, PO- Kanti, Dist- Muzaffarpur, Bihar - 843130',
      idNumber: 'XXXX XXXX 4417',
      fatherName: 'Ram Dev Singh',
    },
  },
  {
    id: 'd-pan-ravi',
    name: 'PAN Card',
    type: 'pan',
    ownerId: 'u-ravi',
    uploadedAt: iso(-180),
    verified: true,
    source: 'digilocker',
    extracted: {
      // Transliteration variant — same person, different spelling. Should NOT alarm.
      name: 'Rabi Kumar',
      dob: '14/03/1992',
      fatherName: 'Ramdev Singh',
      idNumber: 'BXKPK4417M',
    },
  },
  {
    id: 'd-land-ravi',
    name: 'Land Record (Khatauni)',
    type: 'land-record',
    ownerId: 'u-ravi',
    uploadedAt: iso(-95),
    verified: true,
    source: 'upload',
    extracted: {
      name: 'Ravi Kumar Singh',
      // Day and month swapped (should be 14/03) — a data-entry error worth flagging.
      dob: '03/14/1992',
      address: 'Bahadurpur Village, Kanti Block, Muzaffarpur, Bihar 843130',
      fatherName: 'Ram Dev Singh',
    },
  },
  {
    id: 'd-income-ravi',
    name: 'Income Certificate',
    type: 'income-cert',
    ownerId: 'u-ravi',
    uploadedAt: iso(-400),
    // Already lapsed — a blocker for any scheme that requires it.
    expiresAt: iso(-35),
    verified: true,
    source: 'csc',
    extracted: {
      name: 'Ravi Kumar',
      address: 'Vill- Bahadurpur, PO- Kanti, Dist- Muzaffarpur, Bihar - 843130',
      fatherName: 'Ram Dev Singh',
    },
  },
  {
    id: 'd-bank-ravi',
    name: 'Bank Passbook',
    type: 'bank-passbook',
    ownerId: 'u-ravi',
    uploadedAt: iso(-150),
    verified: true,
    source: 'upload',
    extracted: {
      name: 'Ravi Kumar',
      address: 'Bahadurpur, Kanti, Muzaffarpur, Bihar 843130',
      idNumber: 'XXXX XXXX 4417',
    },
  },
  {
    id: 'd-ration-ravi',
    name: 'Ration Card',
    type: 'ration-card',
    ownerId: 'u-ravi',
    uploadedAt: iso(-320),
    verified: false,
    source: 'upload',
    extracted: {
      name: 'Ravi Kumar',
      address: 'Vill Bahadurpur, PO Kanti, Muzaffarpur, Bihar 843130',
      fatherName: 'Ram Dev Singh',
    },
  },
  {
    id: 'd-caste-anjali',
    name: 'Caste Certificate',
    type: 'caste-cert',
    ownerId: 'u-anjali',
    uploadedAt: iso(-260),
    expiresAt: iso(62),
    verified: true,
    source: 'csc',
    extracted: {
      name: 'Anjali Kumari',
      dob: '22/07/2009',
      fatherName: 'Ravi Kumar',
      address: 'Vill- Bahadurpur, PO- Kanti, Dist- Muzaffarpur, Bihar - 843130',
    },
  },
  {
    id: 'd-aadhaar-anjali',
    name: 'Aadhaar Card',
    type: 'aadhaar',
    ownerId: 'u-anjali',
    uploadedAt: iso(-260),
    verified: true,
    source: 'digilocker',
    extracted: {
      name: 'Anjali Kumari',
      dob: '22/07/2009',
      gender: 'Female',
      fatherName: 'Ravi Kumar',
      address: 'Vill- Bahadurpur, PO- Kanti, Dist- Muzaffarpur, Bihar - 843130',
      idNumber: 'XXXX XXXX 9082',
    },
  },
  {
    id: 'd-marksheet-anjali',
    name: 'Class 10 Marksheet',
    type: 'marksheet',
    ownerId: 'u-anjali',
    uploadedAt: iso(-40),
    verified: true,
    source: 'upload',
    extracted: {
      name: 'Anjali Kumari',
      // Genuine year mismatch — this is a real blocker for scholarship verification.
      dob: '22/07/2008',
      fatherName: 'Ravi Kumar',
    },
  },
  {
    id: 'd-aadhaar-ramdev',
    name: 'Aadhaar Card',
    type: 'aadhaar',
    ownerId: 'u-ramdev',
    uploadedAt: iso(-500),
    verified: true,
    source: 'digilocker',
    extracted: {
      name: 'Ram Dev Singh',
      dob: '1959',
      gender: 'Male',
      address: 'Vill- Bahadurpur, PO- Kanti, Dist- Muzaffarpur, Bihar - 843130',
      idNumber: 'XXXX XXXX 1120',
    },
  },
  {
    id: 'd-bank-ramdev',
    name: 'Bank Passbook',
    type: 'bank-passbook',
    ownerId: 'u-ramdev',
    uploadedAt: iso(-480),
    verified: true,
    source: 'upload',
    extracted: {
      name: 'Ramdeo Singh',
      dob: '01/01/1959',
      address: 'Bahadurpur, Kanti, Muzaffarpur, Bihar 843130',
    },
  },
];

export const APPLICATIONS: Application[] = [
  {
    id: 'a-1',
    schemeId: 'pm-kisan',
    applicantId: 'u-ravi',
    applicantName: 'Ravi Kumar',
    status: 'approved',
    submittedAt: iso(-72),
    updatedAt: iso(-12),
    progressStep: 5,
    totalSteps: 5,
    referenceNo: 'PMK/BR/2026/094412',
    district: 'Muzaffarpur',
    timeline: [
      { at: iso(-72), status: 'submitted', note: 'Application submitted through MITRA.' },
      { at: iso(-64), status: 'under-review', note: 'Land records verified by the revenue officer.' },
      { at: iso(-31), status: 'under-review', note: 'Bank account seeded with Aadhaar.' },
      { at: iso(-12), status: 'approved', note: 'Approved. First instalment scheduled for the next cycle.' },
    ],
  },
  {
    id: 'a-2',
    schemeId: 'ayushman-bharat',
    applicantId: 'u-ravi',
    applicantName: 'Ravi Kumar',
    status: 'info-needed',
    submittedAt: iso(-25),
    updatedAt: iso(-4),
    progressStep: 3,
    totalSteps: 5,
    referenceNo: 'PMJAY/BR/2026/551208',
    district: 'Muzaffarpur',
    timeline: [
      { at: iso(-25), status: 'submitted', note: 'Family details submitted for Ayushman card.' },
      { at: iso(-18), status: 'under-review', note: 'SECC database cross-check in progress.' },
      { at: iso(-4), status: 'info-needed', note: 'A valid income certificate is required — the one on file has expired.' },
    ],
  },
  {
    id: 'a-3',
    schemeId: 'post-matric-scholarship',
    applicantId: 'u-anjali',
    applicantName: 'Anjali Kumari',
    status: 'under-review',
    submittedAt: iso(-14),
    updatedAt: iso(-6),
    progressStep: 3,
    totalSteps: 5,
    referenceNo: 'NSP/BR/2026/778341',
    district: 'Muzaffarpur',
    timeline: [
      { at: iso(-14), status: 'submitted', note: 'Application forwarded to the institution for verification.' },
      { at: iso(-6), status: 'under-review', note: 'Institution verified admission. Awaiting district-level approval.' },
    ],
  },
  {
    id: 'a-4',
    schemeId: 'nsap-old-age',
    applicantId: 'u-ramdev',
    applicantName: 'Ram Dev Singh',
    status: 'draft',
    submittedAt: iso(-2),
    updatedAt: iso(-2),
    progressStep: 2,
    totalSteps: 5,
    referenceNo: 'DRAFT-NSAP-0041',
    district: 'Muzaffarpur',
    timeline: [{ at: iso(-2), status: 'draft', note: 'Draft started. Bank details still to be added.' }],
  },
  {
    id: 'a-5',
    schemeId: 'e-shram',
    applicantId: 'u-ravi',
    applicantName: 'Ravi Kumar',
    status: 'disbursed',
    submittedAt: iso(-190),
    updatedAt: iso(-176),
    progressStep: 5,
    totalSteps: 5,
    referenceNo: 'ESHRAM/2025/220914',
    district: 'Muzaffarpur',
    timeline: [
      { at: iso(-190), status: 'submitted', note: 'e-Shram registration submitted.' },
      { at: iso(-186), status: 'approved', note: 'Universal Account Number generated.' },
      { at: iso(-176), status: 'disbursed', note: 'e-Shram card issued with accident cover active.' },
    ],
  },
];

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'n-1',
    title: 'Your income certificate has expired',
    body: 'Ayushman Bharat is waiting on a valid income certificate. Renew it at your nearest CSC to unblock the application.',
    kind: 'renewal',
    at: iso(-1),
    read: false,
    href: '/documents',
  },
  {
    id: 'n-2',
    title: 'Date of birth mismatch found',
    body: "Anjali's Class 10 marksheet shows 2008 but her Aadhaar shows 2009. Fix this before the scholarship deadline.",
    kind: 'deadline',
    at: iso(-1),
    read: false,
    href: '/documents/verify',
  },
  {
    id: 'n-3',
    title: 'PM-KISAN instalment approved',
    body: 'Your next instalment of ₹2,000 has been approved and is scheduled for the coming cycle.',
    kind: 'status',
    at: iso(-12),
    read: true,
    href: '/applications',
  },
  {
    id: 'n-4',
    title: 'Scholarship window closes in 21 days',
    body: 'The Post Matric Scholarship portal closes on 31 August. Anjali\'s application is still under review.',
    kind: 'deadline',
    at: iso(-3),
    read: false,
    href: '/applications',
  },
  {
    id: 'n-5',
    title: 'Your father may be eligible for Old Age Pension',
    body: 'Ram Dev Singh is 67 and your household income qualifies. A draft application is already started.',
    kind: 'recommendation',
    at: iso(-5),
    read: true,
    href: '/family',
  },
  {
    id: 'n-6',
    title: "Anjali's caste certificate expires in 62 days",
    body: 'Renew it before the scholarship disbursal, or the payment may be held up.',
    kind: 'renewal',
    at: iso(-6),
    read: true,
    href: '/documents',
  },
];

export const SERVICES: ServiceTileData[] = [
  { id: 'aadhaar', name: 'Aadhaar Services', icon: 'Fingerprint', accent: '#DC2626', description: 'Update address, mobile number or biometrics', href: '/services/aadhaar' },
  { id: 'pan', name: 'PAN Card', icon: 'CreditCard', accent: '#2563EB', description: 'Apply for a new PAN or correct existing details', href: '/services/pan' },
  { id: 'voter', name: 'Voter ID', icon: 'Vote', accent: '#7C3AED', description: 'Register as a voter or update your constituency', href: '/services/voter' },
  { id: 'driving', name: 'Driving License', icon: 'Car', accent: '#DC2626', description: 'Apply, renew or check licence status', href: '/services/driving' },
  { id: 'passport', name: 'Passport', icon: 'BookMarked', accent: '#0891B2', description: 'Fresh passport, renewal and police verification', href: '/services/passport' },
  { id: 'birth', name: 'Birth Certificate', icon: 'ScrollText', accent: '#059669', description: 'Register a birth or get a certified copy', href: '/services/birth' },
  { id: 'income', name: 'Income Certificate', icon: 'Receipt', accent: '#B45309', description: 'Apply for or renew your income certificate', href: '/services/income' },
  { id: 'caste', name: 'Caste Certificate', icon: 'FileBadge', accent: '#4F46E5', description: 'Apply for SC, ST or OBC certification', href: '/services/caste' },
];

export const CSC_CENTRES = [
  { id: 'c1', name: 'Kanti Common Service Centre', address: 'Near Block Office, Kanti, Muzaffarpur', distanceKm: 2.4, open: true, services: ['Income Certificate', 'Aadhaar Update', 'PM-KISAN'], phone: '0621-2234567' },
  { id: 'c2', name: 'Bahadurpur Panchayat Bhawan', address: 'Bahadurpur Village, Kanti Block', distanceKm: 0.8, open: true, services: ['Pension Schemes', 'Ration Card', 'Certificates'], phone: '0621-2234891' },
  { id: 'c3', name: 'Muzaffarpur District Collectorate', address: 'Company Bagh Road, Muzaffarpur', distanceKm: 11.2, open: true, services: ['All Certificates', 'Grievance Redressal', 'Scheme Approval'], phone: '0621-2212000' },
  { id: 'c4', name: 'Sadar Block Development Office', address: 'Sadar Block, Muzaffarpur', distanceKm: 9.6, open: false, services: ['PMAY-G', 'MGNREGA', 'Old Age Pension'], phone: '0621-2245512' },
  { id: 'c5', name: 'Jan Seva Kendra, Motipur', address: 'Main Market, Motipur, Muzaffarpur', distanceKm: 18.3, open: true, services: ['Aadhaar', 'PAN', 'Passport Seva'], phone: '0621-2261340' },
];

// ─── Admin-side data ─────────────────────────────────────────────────────────

export const COMPLAINTS: Complaint[] = [
  { id: 'c-101', citizen: 'Sunita Devi', district: 'Muzaffarpur', subject: 'Janani Suraksha payment not received after delivery', status: 'in-progress', raisedAt: iso(-9), category: 'Payment delay' },
  { id: 'c-102', citizen: 'Mohammad Irfan', district: 'Darbhanga', subject: 'Name spelling differs between Aadhaar and ration card', status: 'open', raisedAt: iso(-3), category: 'Document mismatch' },
  { id: 'c-103', citizen: 'Lalita Kumari', district: 'Muzaffarpur', subject: 'Scholarship marked rejected without a reason', status: 'open', raisedAt: iso(-2), category: 'Rejection appeal' },
  { id: 'c-104', citizen: 'Ram Dev Singh', district: 'Muzaffarpur', subject: 'Pension application pending for over 60 days', status: 'in-progress', raisedAt: iso(-16), category: 'Processing delay' },
  { id: 'c-105', citizen: 'Ganesh Yadav', district: 'Sitamarhi', subject: 'PM-KISAN instalment credited to the wrong account', status: 'resolved', raisedAt: iso(-40), category: 'Payment error' },
  { id: 'c-106', citizen: 'Farida Khatun', district: 'Vaishali', subject: 'Unable to upload disability certificate', status: 'resolved', raisedAt: iso(-33), category: 'Technical' },
  { id: 'c-107', citizen: 'Suresh Paswan', district: 'Muzaffarpur', subject: 'Income certificate expired mid-review', status: 'open', raisedAt: iso(-1), category: 'Document mismatch' },
];

/** District-level application volumes used by the admin analytics dashboard. */
export const DISTRICT_STATS = [
  { district: 'Muzaffarpur', applications: 4820, approved: 3411, pending: 1102, rejected: 307 },
  { district: 'Darbhanga', applications: 3960, approved: 2688, pending: 981, rejected: 291 },
  { district: 'Vaishali', applications: 3105, approved: 2214, pending: 704, rejected: 187 },
  { district: 'Sitamarhi', applications: 2740, approved: 1802, pending: 741, rejected: 197 },
  { district: 'Samastipur', applications: 2455, approved: 1699, pending: 611, rejected: 145 },
];

/** Top rejection causes — the evidence base for the document-verification feature. */
export const REJECTION_REASONS = [
  { reason: 'Name mismatch across documents', count: 1284, share: 31 },
  { reason: 'Expired supporting certificate', count: 902, share: 22 },
  { reason: 'Date of birth inconsistency', count: 741, share: 18 },
  { reason: 'Incomplete document set', count: 578, share: 14 },
  { reason: 'Address does not match records', count: 412, share: 10 },
  { reason: 'Other', count: 205, share: 5 },
];

export const MONTHLY_TREND = [
  { month: 'Feb', applications: 1820, approvals: 1204 },
  { month: 'Mar', applications: 2140, approvals: 1488 },
  { month: 'Apr', applications: 2610, approvals: 1802 },
  { month: 'May', applications: 3050, approvals: 2211 },
  { month: 'Jun', applications: 3480, approvals: 2604 },
  { month: 'Jul', applications: 4120, approvals: 3188 },
];
