/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // pdfkit resolves its standard-font .afm files via a __dirname-relative
  // path; webpack bundling rewrites __dirname to the compiled route's own
  // output dir, breaking that lookup. Keeping it external makes Next use
  // a plain Node require instead, so __dirname stays pdfkit's real folder.
  // (Next 15 moved this out of `experimental` and renamed it.)
  serverExternalPackages: ['pdfkit'],
  async redirects() {
    return [
      {
        // The firm's own address for booking, given out by text and on other
        // sites. Its front door is the booking page; everything else stays at
        // the same path. Temporary, so no browser remembers it.
        source: '/',
        has: [{ type: 'host', value: 'book.866jacklaw.com' }],
        destination: '/book',
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      {
        // A stale worker would pin clients to an old build, so it is never
        // cached, and it needs root scope to control the whole portal.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
    ]
  },
}

module.exports = nextConfig
