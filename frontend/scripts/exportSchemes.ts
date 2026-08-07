/**
 * Exports the scheme catalogue to shared/schemes.json.
 *
 * The catalogue is authored once, in TypeScript, where the types keep it honest. The
 * Python backend reads the exported JSON rather than carrying a hand-maintained copy —
 * two copies of eligibility criteria would drift, and drift here means citizens getting
 * different answers from the app and the API.
 *
 * Run: npx tsx scripts/exportSchemes.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SCHEMES, SECTOR_LABELS } from '../lib/schemes';

const out = resolve(process.cwd(), '../shared/schemes.json');
mkdirSync(dirname(out), { recursive: true });

const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  note: 'Generated from frontend/lib/schemes.ts — do not edit by hand.',
  sectorLabels: SECTOR_LABELS,
  schemes: SCHEMES,
};

writeFileSync(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');

console.log(`Exported ${SCHEMES.length} schemes → ${out}`);
console.log(`Rules: ${SCHEMES.reduce((n, s) => n + s.rules.length, 0)}`);
console.log(`Documents: ${SCHEMES.reduce((n, s) => n + s.documents.length, 0)}`);
