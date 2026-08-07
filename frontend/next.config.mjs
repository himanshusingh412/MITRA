/** @type {import('next').NextConfig} */
const nextConfig = {
  // Some container mounts disallow unlink, which breaks next build's cleanup step.
  // Overriding the dist dir lets the build run anywhere. See DEPLOYMENT.md §2.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Standalone output keeps the Docker runtime image minimal.
  output: process.env.NEXT_STANDALONE ? 'standalone' : undefined,
  reactStrictMode: true,
  // MITRA runs fully self-contained: no external API calls, no API keys.
  // All scheme data, eligibility reasoning and assistant logic execute locally.
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
        ],
      },
    ];
  },
};

export default nextConfig;
