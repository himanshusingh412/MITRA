import type { MetadataRoute } from 'next';

/**
 * The citizen app should be discoverable; the government portal must not be.
 * `X-Robots-Tag: noindex` is also set on /admin in next.config.mjs and proxy.ts, because
 * a robots directive is a request and a header is an instruction.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
  };
}
