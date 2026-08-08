import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/**
 * Flat config so `npm run lint` is non-interactive and can run as a CI merge gate.
 * Previously `next lint` dropped into a setup prompt and hung any non-TTY job.
 *
 * eslint-config-next v16 ships flat configs directly, so no FlatCompat shim is needed.
 */
export default [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'prisma/generated/**',
    ],
  },
  {
    rules: {
      // Unused args are fine when prefixed with _, which reads as deliberate.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // The React Compiler rules below arrived with Next 16 and flag real but
      // non-blocking patterns in code that predates them (chiefly the speech-recognition
      // hook, where a ref is assigned during render, and a few mount-time setState
      // calls). They are warnings rather than errors so the lint gate can be enforced in
      // CI today; clearing them is tracked in TASKS.md under Phase 10 hardening.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    // Config files legitimately export an object literal.
    files: ['*.config.mjs', 'postcss.config.mjs', 'eslint.config.mjs'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },
];
