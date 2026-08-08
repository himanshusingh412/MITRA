import { SERVICES } from './demoData';
import type { ServiceTileData } from '@/types';

/**
 * Service detail content.
 *
 * The eight service tiles on the home screen and the Services page all linked to
 * `/services/<id>`, but no such route existed — every one of them returned a 404. This
 * module supplies the content those pages need, keyed by the same ids the tiles already
 * use, so the links resolve without changing any of the existing navigation.
 *
 * Content is deliberately practical rather than encyclopaedic: what the service is, what
 * a citizen needs before starting, what it costs, how long it takes, and where to go.
 * That is what someone standing at a CSC counter actually needs to know.
 */

export interface ServiceDetail {
  id: string;
  /** One-line plain-language explanation, class-8 reading level. */
  summary: string;
  /** The tasks a citizen can perform under this service. */
  actions: { title: string; detail: string }[];
  /** Documents to bring or upload. Mapped to vault types where one exists. */
  requires: string[];
  fee: string;
  processingTime: string;
  /** Where the service is actually delivered. */
  where: string[];
  officialUrl: string;
  officialName: string;
  /** Scheme ids in the catalogue that commonly need this document. */
  relatedSchemeIds: string[];
}

const DETAILS: Record<string, Omit<ServiceDetail, 'id'>> = {
  aadhaar: {
    summary:
      'Aadhaar is the identity document almost every scheme checks first. You can update your address, mobile number, name spelling or biometrics at any enrolment centre.',
    actions: [
      { title: 'Update address', detail: 'Needs one valid proof of your current address.' },
      { title: 'Link or change mobile number', detail: 'Done in person — OTP is sent to the new number.' },
      { title: 'Correct name or date of birth', detail: 'One correction is allowed for date of birth, twice for name.' },
      { title: 'Update biometrics', detail: 'Free for children turning 5 and 15; chargeable otherwise.' },
    ],
    requires: ['Existing Aadhaar number', 'Proof of address for address changes', 'Registered mobile for OTP'],
    fee: '₹50 for demographic update · ₹100 for biometric update',
    processingTime: 'Usually 7–30 days',
    where: ['Aadhaar Seva Kendra', 'Common Service Centre', 'Some bank and post office branches'],
    officialUrl: 'https://uidai.gov.in',
    officialName: 'UIDAI',
    relatedSchemeIds: ['pm-kisan', 'ayushman-bharat', 'e-shram'],
  },
  pan: {
    summary:
      'PAN is your tax identity. Schemes rarely require it directly, but banks ask for it when a benefit is paid into an account above certain limits.',
    actions: [
      { title: 'Apply for a new PAN', detail: 'Form 49A, submitted online or at a facilitation centre.' },
      { title: 'Correct existing details', detail: 'Used most often when the name spelling differs from Aadhaar.' },
      { title: 'Link PAN with Aadhaar', detail: 'Mandatory — an unlinked PAN becomes inoperative.' },
      { title: 'Request a reprint', detail: 'For a lost or damaged card.' },
    ],
    requires: ['Aadhaar card', 'Proof of date of birth', 'Passport-size photograph'],
    fee: '₹107 for an Indian address',
    processingTime: '15–20 days',
    where: ['NSDL or UTIITSL online', 'Common Service Centre', 'PAN facilitation centre'],
    officialUrl: 'https://www.incometax.gov.in',
    officialName: 'Income Tax Department',
    relatedSchemeIds: [],
  },
  voter: {
    summary:
      'Registering as a voter also produces an EPIC card, which many state schemes accept as proof of residence.',
    actions: [
      { title: 'Register as a new voter', detail: 'Form 6. You must be 18 or older on the qualifying date.' },
      { title: 'Change your constituency', detail: 'Form 8A, used after moving to a new address.' },
      { title: 'Correct details on the roll', detail: 'Form 8, for name, age, photo or address errors.' },
    ],
    requires: ['Proof of age', 'Proof of current address', 'Passport-size photograph'],
    fee: 'Free',
    processingTime: '30–45 days',
    where: ['Voter Helpline app', 'Booth Level Officer', 'Common Service Centre'],
    officialUrl: 'https://voters.eci.gov.in',
    officialName: 'Election Commission of India',
    relatedSchemeIds: [],
  },
  driving: {
    summary:
      'A driving licence doubles as widely accepted photo identity and address proof, which is why it appears on many scheme checklists.',
    actions: [
      { title: 'Apply for a learner licence', detail: 'Requires an online test on traffic rules.' },
      { title: 'Apply for a permanent licence', detail: 'Taken 30 days after the learner licence is issued.' },
      { title: 'Renew an expiring licence', detail: 'Can be renewed up to one year after expiry without a retest.' },
      { title: 'Check application status', detail: 'Tracked with the application number on Parivahan.' },
    ],
    requires: ['Aadhaar or other identity proof', 'Proof of address', 'Medical certificate (Form 1A) if over 40'],
    fee: '₹200 learner · ₹700 permanent (varies by state)',
    processingTime: '30 days including the test',
    where: ['Regional Transport Office', 'Parivahan Sewa online'],
    officialUrl: 'https://parivahan.gov.in',
    officialName: 'Ministry of Road Transport and Highways',
    relatedSchemeIds: [],
  },
  passport: {
    summary:
      'A passport is the strongest proof of identity, date of birth and address in one document. Police verification is part of the process.',
    actions: [
      { title: 'Apply for a fresh passport', detail: 'Booked through Passport Seva with an appointment.' },
      { title: 'Renew or reissue', detail: 'Apply up to a year before expiry.' },
      { title: 'Track police verification', detail: 'Status is visible on the Passport Seva portal.' },
    ],
    requires: ['Aadhaar card', 'Birth certificate or school certificate', 'Proof of current address'],
    fee: '₹1,500 for a 36-page booklet · ₹2,000 tatkaal surcharge',
    processingTime: '30–45 days normal · 3–7 days tatkaal',
    where: ['Passport Seva Kendra', 'Post Office Passport Seva Kendra'],
    officialUrl: 'https://www.passportindia.gov.in',
    officialName: 'Ministry of External Affairs',
    relatedSchemeIds: [],
  },
  birth: {
    summary:
      'A birth certificate is the primary proof of date of birth. Scholarship and child-welfare schemes ask for it more often than any other certificate.',
    actions: [
      { title: 'Register a birth', detail: 'Free within 21 days of the birth; late registration attracts a fee.' },
      { title: 'Get a certified copy', detail: 'Issued by the municipality or gram panchayat that registered it.' },
      { title: 'Correct an entry', detail: 'Requires an affidavit and supporting proof.' },
    ],
    requires: ['Hospital discharge summary or birth report', "Parents' identity proof", 'Proof of address'],
    fee: 'Free within 21 days · ₹20–₹100 for late registration',
    processingTime: '7–21 days',
    where: ['Municipal corporation', 'Gram panchayat', 'Common Service Centre'],
    officialUrl: 'https://crsorgi.gov.in',
    officialName: 'Civil Registration System',
    relatedSchemeIds: ['post-matric-scholarship'],
  },
  income: {
    summary:
      'An income certificate states your household income and decides eligibility for most welfare schemes. It usually expires after one financial year, which is the single most common cause of rejection.',
    actions: [
      { title: 'Apply for a new certificate', detail: 'Issued by the Tehsildar or Revenue Officer.' },
      { title: 'Renew before expiry', detail: 'Renew each financial year even if your income has not changed.' },
      { title: 'Correct the stated income', detail: 'Needs fresh salary or land-revenue evidence.' },
    ],
    requires: ['Aadhaar card', 'Ration card', 'Salary slip, Form 16 or land records', 'Self-declaration of income'],
    fee: '₹10–₹50 depending on the state',
    processingTime: '7–15 days',
    where: ['Tehsil or Revenue office', 'Common Service Centre', 'State e-district portal'],
    officialUrl: 'https://services.india.gov.in',
    officialName: 'National Government Services Portal',
    relatedSchemeIds: ['ayushman-bharat', 'post-matric-scholarship', 'nsap-old-age'],
  },
  caste: {
    summary:
      'A caste certificate proves SC, ST or OBC status and unlocks reserved scholarships, fee waivers and quota benefits. Some states issue it with a validity period.',
    actions: [
      { title: 'Apply for a caste certificate', detail: 'Issued by the Tehsildar or SDM.' },
      { title: 'Obtain a non-creamy-layer certificate', detail: 'Required for OBC reservation benefits; renewed annually.' },
      { title: 'Renew before expiry', detail: 'Check the validity date — an expired certificate blocks disbursal.' },
    ],
    requires: ['Aadhaar card', 'Ration card', "Father's or grandfather's caste certificate", 'Proof of residence'],
    fee: '₹10–₹50 depending on the state',
    processingTime: '15–30 days',
    where: ['Tehsil or SDM office', 'Common Service Centre', 'State e-district portal'],
    officialUrl: 'https://services.india.gov.in',
    officialName: 'National Government Services Portal',
    relatedSchemeIds: ['post-matric-scholarship'],
  },
};

export function getService(id: string): (ServiceTileData & ServiceDetail) | undefined {
  const tile = SERVICES.find((s) => s.id === id);
  const detail = DETAILS[id];
  if (!tile || !detail) return undefined;
  return { ...tile, ...detail, id };
}

export function allServiceIds(): string[] {
  return SERVICES.filter((s) => DETAILS[s.id]).map((s) => s.id);
}
