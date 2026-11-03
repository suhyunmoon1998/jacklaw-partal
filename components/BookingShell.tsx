'use client'

import { ReactNode, useEffect, useState } from 'react'
import Header from '@/components/Header'
import { FIRM_PHONE_LABEL, FIRM_PHONE_TEL } from '@/lib/contact'
import { useLanguage } from '@/lib/i18n'

/**
 * The frame /book and /book/manage share, drawn the way the client portal's
 * own screens are (app/dashboard): the black header with the back arrow and
 * the language menu, a title on the left, and the line about emergencies with
 * the office's number before anything else — booking online is offered,
 * never the only way in.
 *
 * The pieces below it — the dark banner, the numbered step card and row —
 * are the dashboard's, so a client who has seen one has seen the other.
 */
export default function BookingShell({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  const { t } = useLanguage()
  return (
    <div className="relative min-h-screen bg-canvas flex flex-col animate-fade-in">
      <div className="relative z-20">
        <Header showBack backHref="/" subtitle={t('home_book_title')} />
      </div>

      <main className="relative z-10 flex-1 px-4 pt-5 pb-8 pb-safe max-w-2xl mx-auto w-full">
        <div className="mb-5 animate-slide-up">
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-gray-950">{title}</h1>
          {sub && <p className="text-gray-500 text-[15px] mt-1">{sub}</p>}
        </div>

        <div className="mb-6 bg-white/70 border border-line rounded-2xl px-4 py-3.5 flex gap-3 animate-slide-up stagger-1">
          <svg className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 text-[13px] leading-relaxed">
            <strong className="text-gray-900 font-semibold">{t('no_emergency')}</strong> {t('no_emergency_sub')}{' '}
            <a
              href={FIRM_PHONE_TEL}
              className="text-gray-900 font-semibold underline decoration-gray-300 underline-offset-2 whitespace-nowrap hover:decoration-gray-900"
            >
              {FIRM_PHONE_LABEL}
            </a>
            .
          </p>
        </div>

        {children}
      </main>
    </div>
  )
}

/** The dashboard's dark banner: one line worth noticing, with a gold mark. A link when given `href`. */
export function DarkBanner({
  icon,
  title,
  detail,
  href,
  action,
}: {
  icon: ReactNode
  title: string
  detail?: string
  href?: string
  action?: string
}) {
  const body = (
    <>
      <span className="w-9 h-9 rounded-full bg-gold flex items-center justify-center shrink-0 text-white">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-white font-semibold text-sm">{title}</span>
        {detail && <span className="block text-white/60 text-xs mt-0.5">{detail}</span>}
      </span>
      {action && <span className="text-gold font-semibold text-sm shrink-0">{action}</span>}
    </>
  )
  const cls = 'w-full mb-5 bg-neutral-950 rounded-2xl p-4 flex items-center gap-3 text-left shadow-lift animate-slide-up stagger-1'
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} active:opacity-90 transition-opacity`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** The step being worked on: the dashboard's open-step card, gold ring and number. */
export function StepCard({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-gold/50 ring-4 ring-gold/[0.07] rounded-2xl p-5 shadow-card animate-slide-up">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-9 h-9 rounded-full bg-gold/10 text-gold-dark font-semibold flex items-center justify-center shrink-0 tabular-nums">{n}</span>
        <h2 className="font-semibold text-gray-950 tracking-tight text-[17px]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

/** A step that is done (a green check, and a way back into it) or still waiting (grey). */
export function StepRow({
  n,
  title,
  detail,
  done,
  action,
  onAction,
}: {
  n: number
  title: string
  detail: string
  done: boolean
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="w-full bg-white border border-line rounded-xl px-4 py-3 flex items-center gap-3">
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold tabular-nums ${
          done ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block font-medium truncate ${done ? 'text-gray-950' : 'text-gray-500'}`}>{title}</span>
        <span className="block text-xs text-gray-500 mt-0.5">{detail}</span>
      </span>
      {action && onAction && (
        <button type="button" onClick={onAction} className="text-xs font-semibold text-gray-600 hover:text-gray-950 shrink-0 px-1 py-2">
          {action}
        </button>
      )}
    </div>
  )
}

/** What the dashboard draws while it reads: grey blocks, not a spinner over nothing. */
export function Shimmer({ heights }: { heights: string[] }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {heights.map((h, i) => (
        <div key={i} className={`animate-shimmer rounded-2xl ${h}`} />
      ))}
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

/** Something to tell the client that is not an error: no times, booking closed. A card with the way out. */
export function NoticeCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card animate-slide-up">
      <p className="font-semibold text-gray-950">{title}</p>
      {children}
    </div>
  )
}

export const VideoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const LOCALE = { en: 'en-US', es: 'es-US', zh: 'zh-CN', ko: 'ko-KR' } as const

const OFFICE_ZONE = 'America/Los_Angeles'

const clock = (zone: string, at: Date) =>
  new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(at)

/**
 * The visitor's own time zone, when its clock reads differently from the
 * office's — null in California, and in Vancouver, which keeps the same time.
 *
 * Read after mount: the page is prerendered on a server whose zone is not the
 * visitor's, and reading it during render would draw one thing and hydrate
 * another.
 */
export function useVisitorZone(): string | null {
  const [zone, setZone] = useState<string | null>(null)
  useEffect(() => {
    try {
      const own = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (own && clock(own, new Date()) !== clock(OFFICE_ZONE, new Date())) setZone(own)
    } catch {
      /* no zone support: Pacific alone, as before */
    }
  }, [])
  return zone
}

/**
 * Formats in the office's zone: a consultation is at 10am Pacific wherever the
 * client is, and the emails say so. The `local*` helpers add the visitor's own
 * clock beside it, never instead of it.
 */
export function bookingFormat(lang: keyof typeof LOCALE) {
  const locale = LOCALE[lang]
  const zone = OFFICE_ZONE
  const at = (date: string) => new Date(`${date}T12:00:00Z`)
  const ymd = (iso: string, z: string) => clock(z, new Date(iso)).slice(0, 10)
  return {
    localTime: (iso: string, local: string) =>
      new Intl.DateTimeFormat(locale, { timeZone: local, hour: 'numeric', minute: '2-digit' }).format(new Date(iso)),
    /** +1 when the slot falls on the next day where the visitor is, -1 the day before. */
    localDayShift: (iso: string, local: string) => {
      const a = ymd(iso, local)
      const b = ymd(iso, zone)
      // MM/DD/YYYY from the en-US clock: compare as dates, not strings.
      const toTime = (s: string) => Date.UTC(Number(s.slice(6, 10)), Number(s.slice(0, 2)) - 1, Number(s.slice(3, 5)))
      return Math.round((toTime(a) - toTime(b)) / 86_400_000)
    },
    localWhen: (iso: string, local: string) =>
      new Intl.DateTimeFormat(locale, {
        timeZone: local,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(new Date(iso)),
    zoneName: (local: string) =>
      new Intl.DateTimeFormat(locale, { timeZone: local, timeZoneName: 'long' })
        .formatToParts(new Date())
        .find(p => p.type === 'timeZoneName')?.value ?? local,
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
