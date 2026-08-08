import type { Application, CitizenProfile, StoredDocument } from '@/types';

/**
 * SMS and WhatsApp reminders.
 *
 * Feasibility, stated plainly. WhatsApp Business requires a Meta-approved template for
 * every proactive message and a verified business — weeks of onboarding. SMS to Indian
 * numbers requires a DLT-registered sender ID and pre-approved templates with TRAI, which
 * is also weeks. Neither can be stood up for a hackathon, so this module ships the
 * provider interface, the message templates, and the scheduling logic — everything except
 * the transport — behind a `ConsoleReminderProvider` that logs what would be sent.
 *
 * That split is deliberate. The hard part of a reminder system is not the HTTP call; it
 * is deciding *what* is worth interrupting someone about and *when*. That logic is real
 * here and testable without a single credential.
 */

export type ReminderChannel = 'sms' | 'whatsapp';

export type ReminderKind =
  | 'scheme-deadline'
  | 'application-status'
  | 'certificate-expiry'
  | 'scholarship-renewal'
  | 'pension-reminder'
  | 'missing-document';

export interface ReminderMessage {
  kind: ReminderKind;
  /** E.164. Never logged in full. */
  to: string;
  /** DLT/Meta template identifier. Free-text proactive messages are not permitted. */
  templateId: string;
  /** Ordered template variables. */
  variables: string[];
  /** Rendered text — for preview and for the console provider. */
  body: string;
  locale: 'en' | 'hi';
  /** When this should be sent. Past-dated messages are dropped, not sent late. */
  sendAt: string;
}

export interface ReminderProvider {
  send(message: ReminderMessage): Promise<{ accepted: boolean; providerId?: string; reason?: string }>;
  channel: ReminderChannel;
}

/**
 * Templates.
 *
 * Deliberately short — many recipients pay per SMS segment and read on a feature phone.
 * Each has an English and Hindi variant because a reminder in a language the recipient
 * does not read is worse than no reminder: it looks like spam.
 */
const TEMPLATES: Record<ReminderKind, { id: string; en: string; hi: string }> = {
  'scheme-deadline': {
    id: 'MITRA_SCHEME_DEADLINE_V1',
    en: 'MITRA: {0} closes on {1}. Your application is not submitted yet. Open MITRA to finish.',
    hi: 'MITRA: {0} की अंतिम तिथि {1} है। आपका आवेदन अभी जमा नहीं हुआ है। पूरा करने के लिए MITRA खोलें।',
  },
  'application-status': {
    id: 'MITRA_APP_STATUS_V1',
    en: 'MITRA: Your {0} application ({1}) is now {2}.',
    hi: 'MITRA: आपका {0} आवेदन ({1}) अब {2} है।',
  },
  'certificate-expiry': {
    id: 'MITRA_CERT_EXPIRY_V1',
    en: 'MITRA: Your {0} expires on {1}. Renew it at your nearest CSC before applying.',
    hi: 'MITRA: आपका {0} {1} को समाप्त हो रहा है। आवेदन से पहले नजदीकी CSC पर नवीनीकरण कराएं।',
  },
  'scholarship-renewal': {
    id: 'MITRA_SCHOLARSHIP_RENEWAL_V1',
    en: 'MITRA: {0} renewal for {1} closes on {2}. Renewal is not automatic.',
    hi: 'MITRA: {1} के लिए {0} नवीनीकरण {2} को बंद होगा। नवीनीकरण स्वतः नहीं होता।',
  },
  'pension-reminder': {
    id: 'MITRA_PENSION_V1',
    en: 'MITRA: {0} requires an annual life certificate by {1} to continue payments.',
    hi: 'MITRA: भुगतान जारी रखने के लिए {0} हेतु {1} तक जीवन प्रमाण पत्र आवश्यक है।',
  },
  'missing-document': {
    id: 'MITRA_MISSING_DOC_V1',
    en: 'MITRA: Your {0} application needs a {1}. Upload it in MITRA to avoid rejection.',
    hi: 'MITRA: आपके {0} आवेदन के लिए {1} आवश्यक है। अस्वीकृति से बचने हेतु MITRA में अपलोड करें।',
  },
};

const render = (template: string, vars: string[]): string =>
  template.replace(/\{(\d+)\}/g, (_, i) => vars[Number(i)] ?? '');

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function build(
  kind: ReminderKind,
  to: string,
  variables: string[],
  sendAt: Date,
  locale: 'en' | 'hi',
): ReminderMessage {
  const t = TEMPLATES[kind];
  return {
    kind,
    to,
    templateId: t.id,
    variables,
    body: render(locale === 'hi' ? t.hi : t.en, variables),
    locale,
    sendAt: sendAt.toISOString(),
  };
}

/**
 * Decides which reminders are worth sending.
 *
 * The restraint here is the product decision. A reminder that arrives too early is
 * ignored, one that arrives after the deadline is cruel, and one that repeats becomes
 * noise the recipient learns to dismiss — including the one that mattered. So: expiry is
 * flagged once at 30 days and once at 7; a missing document only when an application is
 * actually blocked on it; status changes only when the citizen must act.
 */
export function planReminders(input: {
  profile: CitizenProfile;
  phone?: string;
  documents: StoredDocument[];
  applications: Application[];
  locale?: 'en' | 'hi';
}): ReminderMessage[] {
  const { profile, documents, applications } = input;
  const phone = input.phone;
  const locale = input.locale ?? 'en';
  if (!phone) return [];

  const out: ReminderMessage[] = [];
  const now = Date.now();

  for (const doc of documents) {
    if (!doc.expiresAt || doc.ownerId !== profile.id) continue;
    const expiry = new Date(doc.expiresAt).getTime();
    const daysLeft = Math.round((expiry - now) / 86_400_000);
    // Already lapsed — the app surfaces this loudly; a text adds nothing.
    if (daysLeft < 0) continue;

    for (const at of [30, 7]) {
      if (daysLeft >= at) {
        out.push(
          build(
            'certificate-expiry',
            phone,
            [doc.name, fmt(doc.expiresAt)],
            new Date(expiry - at * 86_400_000),
            locale,
          ),
        );
      }
    }
  }

  for (const app of applications) {
    if (app.status === 'info-needed') {
      out.push(
        build(
          'missing-document',
          phone,
          [app.schemeId, 'valid supporting document'],
          new Date(now + 86_400_000),
          locale,
        ),
      );
    }
    if (app.status === 'approved' || app.status === 'disbursed') {
      out.push(
        build(
          'application-status',
          phone,
          [app.schemeId, app.referenceNo, app.status],
          new Date(now),
          locale,
        ),
      );
    }
  }

  // Never send anything already in the past.
  return out.filter((m) => new Date(m.sendAt).getTime() >= now - 60_000);
}

/** Masks a phone number for logs and previews. */
export const maskPhone = (p: string): string =>
  p.length < 4 ? '****' : `${'*'.repeat(Math.max(0, p.length - 4))}${p.slice(-4)}`;

/**
 * Console provider — active until DLT / Meta onboarding completes.
 * Logs the rendered message with the recipient masked.
 */
export class ConsoleReminderProvider implements ReminderProvider {
  constructor(readonly channel: ReminderChannel = 'sms') {}

  async send(message: ReminderMessage) {
    console.info(
      `[reminder:${this.channel}] → ${maskPhone(message.to)} @ ${message.sendAt}\n  template=${message.templateId}\n  ${message.body}`,
    );
    return { accepted: true, providerId: `console-${crypto.randomUUID().slice(0, 8)}` };
  }
}

/**
 * Twilio provider — the production shape for SMS and WhatsApp.
 *
 * Unimplemented rather than half-written, for the same reason as DigiLocker: a transport
 * that silently no-ops would make an unsent reminder look sent.
 */
export class TwilioReminderProvider implements ReminderProvider {
  constructor(
    readonly channel: ReminderChannel,
    private readonly config: { accountSid: string; authToken: string; from: string },
  ) {}

  async send(_message: ReminderMessage): Promise<{ accepted: boolean; reason?: string }> {
    throw new Error(
      `Twilio ${this.channel} delivery requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and a ` +
        (this.channel === 'sms'
          ? 'DLT-registered sender ID with TRAI-approved templates.'
          : 'Meta-approved WhatsApp Business template and verified business.'),
    );
  }
}

export function getReminderProvider(channel: ReminderChannel = 'sms'): ReminderProvider {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) return new ConsoleReminderProvider(channel);
  return new TwilioReminderProvider(channel, { accountSid: sid, authToken: token, from });
}
