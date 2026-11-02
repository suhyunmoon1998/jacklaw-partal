'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import BookingShell, { ErrorNote, Spinner, bookingFormat } from '@/components/BookingShell'
import { formatPhone } from '@/lib/auth'
import { typedPhoneDigits } from '@/lib/phoneNumber'
import { useLanguage } from '@/lib/i18n'
import type { BookingField } from '@/lib/consultations/request'

/**
 * /book — a free consultation, booked by the person themselves.
 *
 * Pick a day, pick a time, say who you are and who the dispute is with. The
 * times come from the hosts' Google calendars (api/consultations/slots); the
 * booking is checked against them again when it is made, so a time that went
 * while the form was being filled is refused and the page goes back to the
 * times.
 *
 * Linked from the intake thank-you email and the portal's front page, in
 * place of the Calendly link the office used before.
 */

interface Day {
  date: string
  slots: string[]
}

interface Slots {
  open: boolean
  durationMinutes: number
  days: Day[]
}

type Phase = 'loading' | 'failed' | 'ready' | 'done'

const FIELD_ERROR: Record<BookingField, 'book_err_start' | 'book_err_name' | 'book_err_email' | 'book_err_phone' | 'book_err_adverse' | 'book_err_ack'> = {
  start: 'book_err_start',
  name: 'book_err_name',
  email: 'book_err_email',
  phone: 'book_err_phone',
  adverse: 'book_err_adverse',
  ack: 'book_err_ack',
}

export default function BookPage() {
  const { t, tf, lang } = useLanguage()
  const f = useMemo(() => bookingFormat(lang), [lang])

  const [phase, setPhase] = useState<Phase>('loading')
  const [slots, setSlots] = useState<Slots | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [start, setStart] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [adverse, setAdverse] = useState('')
  const [others, setOthers] = useState('')
  const [summary, setSummary] = useState('')
  const [ack, setAck] = useState(false)
  const [website, setWebsite] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [badField, setBadField] = useState<BookingField | null>(null)
  const [booked, setBooked] = useState<{ start: string; meetUrl: string | null } | null>(null)

  const load = useCallback(async () => {
    setPhase('loading')
    try {
      const res = await fetch('/api/consultations/slots', { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const data: Slots = await res.json()
      setSlots(data)
      setDay(current => current && data.days.some(d => d.date === current && d.slots.length) ? current : data.days.find(d => d.slots.length)?.date ?? null)
      setPhase('ready')
    } catch {
      setPhase('failed')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const today = slots?.days.find(d => d.date === day)
  const anyOpen = Boolean(slots?.days.some(d => d.slots.length))

  // The calendar starts on the weekday of the first date, so its columns line up.
  const leading = slots?.days.length ? new Date(`${slots.days[0].date}T12:00:00Z`).getUTCDay() : 0
  const weekdayHeads = useMemo(() => {
    // 2026-11-01 is a Sunday; the seven days after it name the columns.
    return Array.from({ length: 7 }, (_, i) => f.weekdayShort(`2026-11-0${i + 1}`))
  }, [f])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBadField(null)
    if (!start) {
      setBadField('start')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, name, email, phone, adverseParty: adverse, otherParties: others, summary, ack, lang, website }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setBooked({ start, meetUrl: body.meetUrl ?? null })
        setPhase('done')
        window.scrollTo({ top: 0 })
        return
      }
      if (body.field && body.field in FIELD_ERROR) {
        setBadField(body.field)
        if (body.field === 'start') setStart(null)
        return
      }
      if (body.reason === 'taken') {
        setStart(null)
        setError(t('book_err_taken'))
        await load()
        return
      }
      setError(t(body.reason === 'limit' ? 'book_err_limit' : 'book_err_failed'))
    } catch {
      setError(t('book_err_failed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (phase === 'done' && booked) {
    return (
      <BookingShell>
        <div className="card animate-slide-up text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-gray-950 mb-1">{t('book_done_title')}</h1>
          <p className="text-gray-950 font-semibold text-[17px] mt-3">{f.when(booked.start)}</p>
          <p className="text-gray-500 text-sm mt-1">{t('book_times_in')}</p>
          <p className="text-gray-600 text-[15px] mt-4">{tf('book_done_sub', { email })}</p>

          {booked.meetUrl && (
            <div className="mt-6">
              <a href={booked.meetUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inline-block">
                {t('book_done_join')}
              </a>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{t('book_done_join_hint')}</p>
            </div>
          )}

          <p className="text-sm text-gray-500 mt-6">{t('book_done_manage')}</p>
          <Link href="/" className="inline-block mt-6 text-sm font-medium text-gray-500 hover:text-gray-900">
            {t('book_done_home')}
          </Link>
        </div>
      </BookingShell>
    )
  }

  return (
    <BookingShell>
      <div className="card animate-slide-up">
        <h1 className="text-[22px] font-semibold tracking-tight text-gray-950 mb-1">{t('book_title')}</h1>
        <p className="text-gray-500 text-[15px] leading-relaxed">{t('book_sub')}</p>
        <p className="text-gray-700 text-sm font-medium mt-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {tf('book_duration', { minutes: slots?.durationMinutes ?? 30 })}
        </p>

        <div className="mt-6">
          {phase === 'loading' && (
            <p className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
              <Spinner />
              {t('book_loading')}
            </p>
          )}

          {phase === 'failed' && (
            <div className="space-y-3">
              <ErrorNote>{t('book_load_failed')}</ErrorNote>
              <button type="button" onClick={load} className="btn-secondary">{t('book_retry')}</button>
            </div>
          )}

          {phase === 'ready' && slots && !slots.open && <ErrorNote>{t('book_closed')}</ErrorNote>}
          {phase === 'ready' && slots?.open && !anyOpen && <ErrorNote>{t('book_no_times')}</ErrorNote>}

          {phase === 'ready' && slots?.open && anyOpen && (
            <>
              {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

              {!start ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 mb-3">
                    <h2 className="text-sm font-semibold text-gray-950">{t('book_pick_day')}</h2>
                    <p className="text-xs text-gray-500">{t('book_times_in')}</p>
                  </div>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    {f.month(slots.days[0].date)}
                    {f.month(slots.days[slots.days.length - 1].date) !== f.month(slots.days[0].date) &&
                      ` – ${f.month(slots.days[slots.days.length - 1].date)}`}
                  </p>
                  <div className="grid grid-cols-7 gap-1.5 text-center" role="grid">
                    {weekdayHeads.map(w => (
                      <div key={w} className="text-[11px] font-medium text-gray-400 pb-1">{w}</div>
                    ))}
                    {Array.from({ length: leading }, (_, i) => <div key={`pad-${i}`} />)}
                    {slots.days.map(d => {
                      const open = d.slots.length > 0
                      const selected = d.date === day
                      return (
                        <button
                          key={d.date}
                          type="button"
                          disabled={!open}
                          onClick={() => setDay(d.date)}
                          aria-pressed={selected}
                          aria-label={f.dayLong(d.date)}
                          className={`h-11 rounded-xl text-[15px] font-semibold transition-colors ${
                            selected
                              ? 'bg-gold text-white shadow-sm'
                              : open
                              ? 'bg-white border border-gray-300 text-gray-950 hover:border-gold'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          {f.dayNumber(d.date)}
                        </button>
                      )
                    })}
                  </div>

                  {day && (
                    <div className="mt-6">
                      <h2 className="text-sm font-semibold text-gray-950 mb-3">
                        {t('book_pick_time')} · <span className="font-normal text-gray-600">{f.dayLong(day)}</span>
                      </h2>
                      {today?.slots.length ? (
                        <div className="grid grid-cols-3 gap-2">
                          {today.slots.map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setStart(s)
                                setError('')
                                setBadField(null)
                              }}
                              className="py-2.5 rounded-xl border border-gray-300 bg-white text-[15px] font-semibold text-gray-950 hover:border-gold hover:text-gold-dark transition-colors"
                            >
                              {f.time(s)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">{t('book_no_times_day')}</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={submit} className="space-y-5" noValidate>
                  <div className="flex items-center justify-between gap-3 bg-canvas border border-line rounded-xl px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t('book_selected')}</p>
                      <p className="text-[15px] font-semibold text-gray-950">{f.when(start)}</p>
                    </div>
                    <button type="button" onClick={() => setStart(null)} className="text-sm font-semibold text-gold-dark hover:text-gold shrink-0">
                      {t('book_change')}
                    </button>
                  </div>

                  <h2 className="text-sm font-semibold text-gray-950 pt-1">{t('book_details')}</h2>

                  <Field id="name" label={t('book_name')} error={badField === 'name' ? t('book_err_name') : ''}>
                    <input id="name" className="input-field" autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
                  </Field>

                  <Field id="email" label={t('book_email')} hint={t('book_email_hint')} error={badField === 'email' ? t('book_err_email') : ''}>
                    <input id="email" type="email" inputMode="email" autoComplete="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
                  </Field>

                  <Field id="phone" label={t('book_phone')} error={badField === 'phone' ? t('book_err_phone') : ''}>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      className="input-field"
                      value={formatPhone(phone)}
                      onChange={e => setPhone(typedPhoneDigits(e.target.value))}
                    />
                  </Field>

                  <Field id="adverse" label={t('book_adverse')} hint={t('book_adverse_hint')} error={badField === 'adverse' ? t('book_err_adverse') : ''}>
                    <input id="adverse" className="input-field" autoComplete="organization" value={adverse} onChange={e => setAdverse(e.target.value)} maxLength={200} />
                  </Field>

                  <Field id="others" label={t('book_others')} hint={t('book_others_hint')}>
                    <input id="others" className="input-field" autoComplete="off" value={others} onChange={e => setOthers(e.target.value)} maxLength={500} />
                  </Field>

                  <Field id="summary" label={t('book_summary')} hint={t('book_summary_hint')}>
                    <textarea id="summary" rows={4} className="input-field resize-y" value={summary} onChange={e => setSummary(e.target.value)} maxLength={1500} />
                  </Field>

                  {/* No person sees this. */}
                  <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
                    <label htmlFor="website">Website</label>
                    <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
                  </div>

                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ack}
                        onChange={e => setAck(e.target.checked)}
                        className="mt-0.5 h-5 w-5 rounded border-gray-300 text-gold focus:ring-gold shrink-0"
                      />
                      <span className="text-sm text-gray-700 leading-snug">{t('book_ack')}</span>
                    </label>
                    {badField === 'ack' && <p className="text-sm text-red-600 mt-1.5">{t('book_err_ack')}</p>}
                  </div>

                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2"><Spinner />{t('book_submitting')}</span>
                    ) : (
                      t('book_submit')
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </BookingShell>
  )
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {error ? <p className="text-sm text-red-600 mt-1.5">{error}</p> : hint ? <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{hint}</p> : null}
    </div>
  )
}
