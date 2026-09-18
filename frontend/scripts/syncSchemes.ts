/**
 * MITRA — Live Government Schemes Synchronization CLI Script
 *
 * Fetches live data from official government sources (data.gov.in / Govt Open Data),
 * validates, normalizes, and upserts into PostgreSQL database.
 *
 * Run: npx tsx scripts/syncSchemes.ts
 */

import { syncSchemes } from '../lib/services/schemeSync';
import { prisma } from '../lib/db/client';

async function main() {
  console.log('🔄 Starting MITRA Live Government Schemes Synchronization...');
  const summary = await syncSchemes();

  console.log('\n✅ Synchronization complete:');
  console.log(`   - Total schemes processed: ${summary.total}`);
  console.log(`   - New schemes added:       ${summary.added}`);
  console.log(`   - Schemes updated:         ${summary.updated}`);
  console.log(`   - Data Source:             ${summary.source}`);
  console.log(`   - Timestamp:               ${summary.lastSyncedAt}`);
}

main()
  .catch((e) => {
    console.error('❌ Sync script error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
