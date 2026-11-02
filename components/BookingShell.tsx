'use client'

import { ReactNode } from 'react'
import Image from 'next/image'
import LanguagePicker from '@/components/LanguagePicker'
import { FIRM_PHONE_DISPLAY, FIRM_PHONE_TEL } from '@/lib/contact'
import { useLanguage } from '@/lib/i18n'

/**
 * The frame /book and /book/manage share: the firm's mark, the language
 * choice before anything has to be read, and the office's number at the foot
 * of every state — booking online is offered, never the only way in.
 */
export default function BookingShell({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen bg-canvas flex flex-col animate-fade-in">
      <header className="bg-black pt-10 pb-7 px-4 text-center border-b border-white/10">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="866 JACK LAW" width={88} height={88} className="rounded-sm" priority />
          <div>
            <p className="text-white/70 text-sm font-medium">Law Offices of Jack D. Josephson, APC</p>
            <p className="text-gold text-[11px] mt-1 font-semibold tracking-[0.16em] uppercase">{t('home_book_title')}</p>
          </div>
          <div className="mt-2">
            <LanguagePicker variant="row" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-8 pb-16">
        <div className="w-full max-w-lg">
          {children}
          <p className="text-center text-xs text-gray-500 mt-8 leading-relaxed">
            {t('no_emergency')} {t('no_emergency_sub')}{' '}
            <a href={FIRM_PHONE_TEL} className="font-semibold text-gray-700 whitespace-nowrap">
              {FIRM_PHONE_DISPLAY}
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}

export function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm leading-snug">
      {children}
    </div>
  )
}

const LOCALE = { en: 'en-US', es: 'es-US', zh: 'zh-CN', ko: 'ko-KR' } as const

/** Formats in the office's zone: a consultation is at 10am Pacific wherever the client is. */
export function bookingFormat(lang: keyof typeof LOCALE) {
  const locale = LOCALE[lang]
  const zone = 'America/Los_Angeles'
  const at = (date: string) => new Date(`${date}T12:00:00Z`)
  return {
    time: (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso)),
    dayLong: (date: string) =>
      new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' }).format(at(date)),
    month: (date: string) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(at(date)),
    weekdayShort: (date: string) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' }).format(at(date)),
    /** The bare number for a calendar cell; Intl would write 2일 or 2日. */
    dayNumber: (date: string) => String(Number(date.slice(8, 10))),
    when: (iso: string) =>
      new Intl.DateTimeFormat(locale, {
        timeZone: zone,
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(iso)),
  }
}
