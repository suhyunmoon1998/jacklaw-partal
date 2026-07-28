/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    // pdfkit resolves its standard-font .afm files via a __dirname-relative
    // path; webpack bundling rewrites __dirname to the compiled route's own
    // output dir, breaking that lookup. Keeping it external makes Next use
    // a plain Node require instead, so __dirname stays pdfkit's real folder.
    serverComponentsExternalPackages: ['pdfkit'],
  },
}

module.exports = nextConfig
