import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root. Without this, a stray lockfile in a parent directory makes
  // Turbopack infer the wrong root and fail to resolve PostCSS plugins like tailwindcss.
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  // Some container mounts disallow unlink, which breaks next build's cleanup step.
  // Overriding the dist dir lets the build run anywhere. See DEPLOYMENT.md §2.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Standalone output keeps the Docker runtime image minimal.
  output: process.env.NEXT_STANDALONE ? 'standalone' : undefined,
  reactStrictMode: true,
  // Eligibility, recommendation and document verification run locally against the
  // bundled catalogue — those never call out. The conversational assistant does call
  // Google Gemini, server-side, with a minimised non-identifying profile; if that call
  // fails the on-device engine answers instead. See SECURITY.md §"Data that leaves the
  // device" for exactly which fields are sent.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(self), microphone=(self)' },
          {
            // Scripts need 'unsafe-inline'/'unsafe-eval' for the Next.js runtime and the
            // theme bootstrap; everything else is locked to self. connect-src allows the
            // one upstream the app actually talks to.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://generativelanguage.googleapis.com",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
      {
        // The government portal must never be indexed.
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
