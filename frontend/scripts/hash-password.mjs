#!/usr/bin/env node
/**
 * Generates an ADMIN_PASSWORD_HASH value.
 *
 * Usage: npm run admin:hash -- 'your-password'
 *
 * scrypt with N=16384 is deliberately slow. That cost is the point: it makes an offline
 * brute force against a leaked hash impractical, and it is irrelevant at sign-in where
 * one comparison per attempt is all that happens.
 */
import { randomBytes, scryptSync } from 'node:crypto';

const password = process.argv[2];

if (!password) {
  console.error("Usage: npm run admin:hash -- 'your-password'");
  process.exit(1);
}
if (password.length < 12) {
  console.error('Refusing: use at least 12 characters for a government portal account.');
  process.exit(1);
}

const N = 16384;
const r = 8;
const p = 1;
const keylen = 64;

const salt = randomBytes(16);
const hash = scryptSync(password, salt, keylen, { N, r, p, maxmem: 64 * 1024 * 1024 });

// Colon-delimited: dotenv expands `$name`, which would corrupt a `$`-delimited hash.
console.log(
  `ADMIN_PASSWORD_HASH="scrypt:${N}:${r}:${p}:${salt.toString('base64')}:${hash.toString('base64')}"`,
);
