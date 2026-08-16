import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from '@/components/Providers'
import InstallPrompt from '@/components/InstallPrompt'

export const metadata: Metadata = {
  title: 'JACKLAW Client Portal | Law Offices of Jack D. Josephson, APC',
  description: 'Secure client onboarding portal for Law Offices of Jack D. Josephson, APC. California employment law.',
  robots: 'noindex, nofollow',
  manifest: '/manifest.json',
  applicationName: '866 JACKLAW',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '866 JACKLAW',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
  viewportFit: 'cover',
}

/*
 * Chrome fires `beforeinstallprompt` as soon as the page loads — usually
 * before React has hydrated, so a listener inside a component misses it and
 * the install offer never appears. Stashing it here, ahead of any bundle,
 * keeps the event alive for InstallPrompt to pick up when it mounts.
 */
const CAPTURE_INSTALL_EVENT = `
window.__jlpInstallEvent = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  window.__jlpInstallEvent = e;
  window.dispatchEvent(new Event('jlp:install-available'));
});
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: CAPTURE_INSTALL_EVENT }} />
      </head>
      <body className="min-h-screen bg-white">
        <Providers>
          {children}
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  )
}
