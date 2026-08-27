'use client'

import { ReactNode } from 'react'
import { LanguageProvider } from '@/lib/i18n'
import LanguageSync from '@/components/LanguageSync'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <LanguageSync />
      {children}
    </LanguageProvider>
  )
}
