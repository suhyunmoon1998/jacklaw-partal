'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import BookingShell, {
  DarkBanner,
  ErrorNote,
  NoticeCard,
  Shimmer,
  Spinner,
  StepCard,
  StepRow,
  VideoIcon,
  bookingFormat,
  useVisitorZone,
} from '@/components/BookingShell'
import SlotPicker, { SlotDay } from '@/components/SlotPicker'
import { formatPhone } from '@/lib/auth'
import { FIRM_PHONE_TEL } from '@/lib/contact'
import { typedPhoneDigits } from '@/lib/phoneNumber'
import { useLanguage } from '@/lib/i18n'
import type { BookingField } from '@/lib/consultations/request'

/**
 * /book — a free consultation, booked by the person themselves.
 *
 * Two steps, drawn as the portal's dashboard draws its steps: the day and
 * time, then who they are and who the dispute is with. The times come from
 * the hosts' Google calendars (api/consultations/slots); the booking is
 * checked against them again when it is made, so a time that went while the
 * form was being filled is refused and step 1 opens again.
 *
 * Linked from the intake thank-you email and the portal's front page, in
 * place of the Calendly link the office used before. Times are Pacific; a
 * visitor elsewhere sees their own clock beside them (components/SlotPicker).
 */

interface Slots {
  open: boolean
  durationMinutes: number
  days: SlotDay[]
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
  const visitorZone = useVisitorZone()

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

  const anyOpen = Boolean(slots?.days.some(d => d.slots.length))

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

  const callButton = (
    <a href={FIRM_PHONE_TEL} className="btn-primary block text-center mt-4">
      {t('book_call')}
    </a>
  )

  if (phase === 'done' && booked) {
    return (
      <BookingShell title={t('book_done_title')} sub={tf('book_done_sub', { email })}>
        <div className="mb-5 bg-emerald-50 border border-emerald-200/70 rounded-2xl p-4 flex gap-3 animate-slide-up">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-semibold">✓</span>
          <div className="min-w-0">
            <p className="font-semibold text-emerald-900 text-[15px]">{f.when(booked.start)}</p>
            <p className="text-sm text-emerald-800/80 mt-0.5">{t('book_times_in')}</p>
            {visitorZone && (
              <p className="text-sm text-emerald-800/80">{tf('book_your_time', { when: f.localWhen(booked.start, visitorZone) })}</p>
            )}
          </div>
        </div>

        {booked.meetUrl && (
          <DarkBanner
            href={booked.meetUrl}
            icon={<VideoIcon />}
            title={t('book_done_join')}
            detail={t('book_done_join_hint')}
            action="→"
          />
        )}

        <div className="card animate-slide-up stagger-2">
          <p className="text-sm text-gray-600 leading-relaxed">{t('book_done_manage')}</p>
          <Link href="/" className="btn-secondary block text-center mt-4">
            {t('book_done_home')}
          </Link>
        </div>
      </BookingShell>
    )
  }

  return (
    <BookingShell title={t('book_title')} sub={t('book_sub')}>
      <DarkBanner
        icon={<VideoIcon />}
        title={tf('book_duration', { minutes: slots?.durationMinutes ?? 30 })}
        detail={t('book_times_in')}
      />

      {phase === 'loading' && <Shimmer heights={['h-72', 'h-16']} />}

      {phase === 'failed' && (
        <NoticeCard title={t('book_load_failed')}>
          <button type="button" onClick={load} className="btn-primary mt-4">{t('book_retry')}</button>
        </NoticeCard>
      )}

      {phase === 'ready' && slots && !slots.open && <NoticeCard title={t('book_closed')}>{callButton}</NoticeCard>}
      {phase === 'ready' && slots?.open && !anyOpen && <NoticeCard title={t('book_no_times')}>{callButton}</NoticeCard>}

      {phase === 'ready' && slots?.open && anyOpen && (
        <div className="space-y-2.5">
          {error && <ErrorNote>{error}</ErrorNote>}

          {!start ? (
            <>
              <StepCard n={1} title={t('book_step_time')}>
                <SlotPicker
                  days={slots.days}
                  day={day}
                  onDay={setDay}
                  visitorZone={visitorZone}
                  onPick={s => {
                    setStart(s)
                    setError('')
                    setBadField(null)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                />
              </StepCard>
              <StepRow n={2} title={t('book_details')} detail={t('book_step_details_wait')} done={false} />
            </>
          ) : (
            <>
              <StepRow
                n={1}
                title={t('book_step_time')}
                detail={visitorZone ? `${f.when(start)} · ${tf('book_your_time', { when: f.localWhen(start, visitorZone) })}` : f.when(start)}
                done
                action={t('book_change')}
                onAction={() => setStart(null)}
              />
              <StepCard n={2} title={t('book_details')}>
                <form onSubmit={submit} className="space-y-5" noValidate>
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

                  <div className="bg-canvas border border-line rounded-xl p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ack}
                        onChange={e => setAck(e.target.checked)}
                        className="mt-0.5 h-5 w-5 rounded border-gray-300 text-gold focus:ring-gold shrink-0"
                      />
                      <span className="text-sm text-gray-700 leading-snug">{t('book_ack')}</span>
                    </label>
                    {badField === 'ack' && <p className="text-sm text-red-600 mt-2">{t('book_err_ack')}</p>}
                  </div>

                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2"><Spinner />{t('book_submitting')}</span>
                    ) : (
                      t('book_submit')
                    )}
                  </button>
                </form>
              </StepCard>
            </>
          )}
        </div>
      )}
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
