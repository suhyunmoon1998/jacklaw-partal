import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JACKLAW Client Portal | Law Offices of Jack D. Josephson, APC',
  description: 'Secure client onboarding portal for Law Offices of Jack D. Josephson, APC. California employment law.',
  robots: 'noindex, nofollow',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '866 JACKLAW',
  },
  icons: { apple: '/logo.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        {children}
      </body>
    </html>
  )
}
