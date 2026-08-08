/**
 * Seeds Neon from lib/demoData.ts.
 *
 * Idempotent by design — every write is an upsert keyed on the stable application id,
 * so re-running after a schema change refreshes the demo household without duplicating
 * it. Application timelines are the exception: they are replaced wholesale, because an
 * event list is only meaningful as a complete sequence.
 *
 * Run: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import {
  ALL_PEOPLE,
  APPLICATIONS,
  DOCUMENTS,
  NOTIFICATIONS,
  PRIMARY_USER,
} from '../lib/demoData';

const prisma = new PrismaClient();

const toSnake = (v: string) => v.replace(/-/g, '_');

async function main() {
  console.log('Seeding MITRA demo household…');

  // Citizens first: dependents carry a foreign key to the head of household, so the
  // primary must exist before the rest are written.
  for (const person of ALL_PEOPLE) {
    const isPrimary = person.id === PRIMARY_USER.id;
    const data = {
      name: person.name,
      age: person.age,
      gender: person.gender as never,
      state: person.state,
      district: person.district,
      area: person.area as never,
      occupation: toSnake(person.occupation) as never,
      annualIncome: person.annualIncome,
      category: person.category as never,
      familySize: person.familySize,
      hasDisability: person.hasDisability,
      disabilityPercent: person.disabilityPercent ?? null,
      landHoldingHectares: person.landHoldingHectares ?? null,
      existingBenefits: person.existingBenefits,
      lifeEvents: person.lifeEvents,
      relation: person.relation ?? null,
      avatarColor: person.avatarColor ?? null,
      primaryId: isPrimary ? null : PRIMARY_USER.id,
      // This household is the template every visitor sandbox is cloned from. It is
      // never served to a session and never mutated by the app.
      isTemplate: true,
    };

    await prisma.citizen.upsert({
      where: { id: person.id },
      create: { id: person.id, ...data },
      update: data,
    });
  }
  console.log(`  citizens: ${ALL_PEOPLE.length}`);

  for (const doc of DOCUMENTS) {
    const data = {
      ownerId: doc.ownerId,
      name: doc.name,
      type: doc.type,
      source: (doc.source ?? 'upload') as never,
      extracted: doc.extracted ?? undefined,
      verified: doc.verified,
      uploadedAt: new Date(doc.uploadedAt),
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : null,
    };
    await prisma.document.upsert({
      where: { id: doc.id },
      create: { id: doc.id, ...data },
      update: data,
    });
  }
  console.log(`  documents: ${DOCUMENTS.length}`);

  for (const app of APPLICATIONS) {
    const data = {
      referenceNo: app.referenceNo,
      schemeId: app.schemeId,
      applicantId: app.applicantId,
      status: toSnake(app.status) as never,
      progressStep: app.progressStep,
      totalSteps: app.totalSteps,
      district: app.district,
      submittedAt: new Date(app.submittedAt),
    };
    await prisma.application.upsert({
      where: { id: app.id },
      create: { id: app.id, ...data },
      update: data,
    });


    // A timeline only makes sense as a whole sequence, so replace rather than merge.
    await prisma.applicationEvent.deleteMany({ where: { applicationId: app.id } });
    await prisma.applicationEvent.createMany({
      data: app.timeline.map((e) => ({
        applicationId: app.id,
        status: toSnake(e.status) as never,
        note: e.note,
        at: new Date(e.at),
      })),
    });
  }
  console.log(`  applications: ${APPLICATIONS.length}`);

  for (const n of NOTIFICATIONS) {
    const data = {
      citizenId: PRIMARY_USER.id,
      kind: n.kind as never,
      title: n.title,
      body: n.body,
      href: n.href ?? null,
      read: n.read,
      at: new Date(n.at),
    };
    await prisma.notification.upsert({
      where: { id: n.id },
      create: { id: n.id, ...data },
      update: data,
    });
  }
  console.log(`  notifications: ${NOTIFICATIONS.length}`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
