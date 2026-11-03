'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import BookingShell, {
  DarkBanner,
  ErrorNote,
  NoticeCard,
  Shimmer,
  Spinner,
  StepCard,
  VideoIcon,
  bookingFormat,
  useVisitorZone,
} from '@/components/BookingShell'
import SlotPicker, { SlotDay } from '@/components/SlotPicker'
import { useLanguage } from '@/lib/i18n'

/**
 * /book/manage?b=<id>&t=<token> — the client's own booking, from the link in
 * their emails: when it is, the video link, and two ways to change it.
 *
 *   Change the time  the same picker as /book; the booking keeps its id and
 *                    its link, and the old time is let go only once the new
 *                    one is on a calendar
 *   Cancel           off the calendar, both sides told
 *
 * Read off window.location rather than useSearchParams so the page keeps
 * prerendering without a Suspense boundary.
 */

interface Booking {
  start: string
  end: string
  status: 'booked' | 'cancelled' | 'past'
  meetUrl: string | null
  name: string
}

type Mode = 'view' | 'cancel' | 'pick' | 'confirm-move'

export default function ManageBookingPage() {
  const { t, tf, lang } = useLanguage()
  const f = useMemo(() => bookingFormat(lang), [lang])
  const visitorZone = useVisitorZone()

  const [link, setLink] = useState<{ b: string; t: string } | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [state, setState] = useState<'loading' | 'missing' | 'failed' | 'ready'>('loading')
  const [mode, setMode] = useState<Mode>('view')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [days, setDays] = useState<SlotDay[] | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [newStart, setNewStart] = useState<string | null>(null)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const b = q.get('b') ?? ''
    const token = q.get('t') ?? ''
    if (!b || !token) {
      setState('missing')
      return
    }
    setLink({ b, t: token })
    fetch(`/api/consultations/manage?${new URLSearchParams({ b, t: token })}`, { cache: 'no-store' })
      .then(async res => {
        if (res.status === 404) return setState('missing')
        if (!res.ok) return setState('failed')
        setBooking(await res.json())
        setState('ready')
      })
      .catch(() => setState('failed'))
  }, [])

  const loadTimes = useCallback(async () => {
    setDays(null)
    setError('')
    try {
      const res = await fetch('/api/consultations/slots', { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const data: { open: boolean; days: SlotDay[] } = await res.json()
      const open = data.open ? data.days : []
      setDays(open)
      setDay(current => (current && open.some(d => d.date === current && d.slots.length) ? current : open.find(d => d.slots.length)?.date ?? null))
    } catch {
      setError(t('book_load_failed'))
      setMode('view')
    }
  }, [t])

  async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/consultations/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...link, ...body }),
    })
    return { res, json: await res.json().catch(() => ({})) }
  }

  async function cancelIt() {
    if (!link) return
    setBusy(true)
    setError('')
    try {
      const { res, json } = await post({ action: 'cancel' })
      if (!res.ok) throw new Error(String(res.status))
      setBooking(json)
      setMode('view')
    } catch {
      setError(t('manage_cancel_failed'))
    } finally {
      setBusy(false)
    }
  }

  async function moveIt() {
    if (!link || !newStart) return
    setBusy(true)
    setError('')
    try {
      const { res, json } = await post({ action: 'reschedule', start: newStart })
      if (res.ok) {
        setBooking(json)
        setNotice(t('manage_rescheduled'))
        setMode('view')
        setNewStart(null)
        return
      }
      if (json?.reason === 'taken') {
        setError(t('book_err_taken'))
        setNewStart(null)
        setMode('pick')
        await loadTimes()
        return
      }
      setError(t('manage_reschedule_failed'))
      setMode('view')
    } catch {
      setError(t('manage_reschedule_failed'))
      setMode('view')
    } finally {
      setBusy(false)
    }
  }

  const yourTime = (iso: string) =>
    visitorZone ? <p className="text-sm text-gray-500">{tf('book_your_time', { when: f.localWhen(iso, visitorZone) })}</p> : null

  const status = booking?.status
  const chip =
    status === 'booked'
      ? { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15', text: t('manage_status_booked') }
      : status === 'cancelled'
      ? { cls: 'bg-gray-100 text-gray-600', text: t('manage_status_cancelled') }
      : { cls: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/15', text: t('manage_status_past') }

  return (
    <BookingShell title={t('manage_title')}>
      {state === 'loading' && <Shimmer heights={['h-32', 'h-16', 'h-24']} />}
      {state === 'missing' && <NoticeCard title={t('manage_not_found')} />}
      {state === 'failed' && <NoticeCard title={t('book_load_failed')} />}

      {state === 'ready' && booking && (
        <div className="space-y-2.5">
          {/* When it is, and where it stands */}
          <div className="card mb-2.5 animate-slide-up stagger-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow mb-1">{t('manage_when')}</p>
                <p className={`font-semibold text-lg leading-tight tracking-tight ${status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-950'}`}>
                  {f.when(booking.start)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{t('book_times_in')}</p>
                {status !== 'cancelled' && yourTime(booking.start)}
              </div>
              <span className={`chip shrink-0 ${chip.cls}`}>{chip.text}</span>
            </div>
          </div>

          {notice && (
            <div role="status" className="bg-emerald-50 border border-emerald-200/70 rounded-2xl p-4 text-emerald-800 text-sm leading-relaxed animate-slide-up">
              {notice}
            </div>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}

          {status === 'cancelled' && (
            <div className="card">
              <p className="text-[15px] text-gray-700">{t('manage_cancelled')}</p>
              <Link href={`/book?lang=${lang}`} className="btn-primary block text-center mt-4">{t('manage_book_again')}</Link>
            </div>
          )}

          {status === 'past' && <NoticeCard title={t('manage_past')} />}

          {status === 'booked' && mode === 'view' && (
            <>
              {booking.meetUrl && (
                <DarkBanner href={booking.meetUrl} icon={<VideoIcon />} title={t('book_done_join')} detail={t('book_done_join_hint')} action="→" />
              )}
              <button
                type="button"
                onClick={() => {
                  setNotice('')
                  setMode('pick')
                  loadTimes()
                }}
                className="w-full bg-white border border-line rounded-xl px-4 py-3.5 text-left flex items-center gap-3 hover:border-gray-300 transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-gold/10 text-gold-dark flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <span className="flex-1 font-medium text-gray-950">{t('manage_reschedule')}</span>
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotice('')
                  setMode('cancel')
                }}
                className="w-full bg-white border border-line rounded-xl px-4 py-3.5 text-left flex items-center gap-3 hover:border-red-200 transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                <span className="flex-1 font-medium text-red-600">{t('manage_cancel')}</span>
              </button>
            </>
          )}

          {status === 'booked' && mode === 'cancel' && (
            <div className="card space-y-4 animate-slide-up">
              <p className="text-[15px] font-medium text-gray-950">{tf('manage_cancel_confirm', { when: f.when(booking.start) })}</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setMode('view')} disabled={busy} className="btn-secondary">
                  {t('manage_cancel_no')}
                </button>
                <button
                  type="button"
                  onClick={cancelIt}
                  disabled={busy}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl text-[15px] font-semibold disabled:opacity-50"
                >
                  {busy ? <span className="flex items-center justify-center gap-2"><Spinner />{t('manage_cancelling')}</span> : t('manage_cancel_yes')}
                </button>
              </div>
            </div>
          )}

          {status === 'booked' && mode === 'pick' && (
            <StepCard n={1} title={t('manage_reschedule_pick')}>
              {days === null ? (
                <Shimmer heights={['h-56']} />
              ) : days.some(d => d.slots.length) ? (
                <SlotPicker
                  days={days}
                  day={day}
                  onDay={setDay}
                  visitorZone={visitorZone}
                  onPick={s => {
                    setNewStart(s)
                    setError('')
                    setMode('confirm-move')
                  }}
                />
              ) : (
                <p className="text-sm text-gray-600">{t('book_no_times')}</p>
              )}
              <button type="button" onClick={() => setMode('view')} className="btn-secondary mt-5">
                {t('manage_reschedule_back')}
              </button>
            </StepCard>
          )}

          {status === 'booked' && mode === 'confirm-move' && newStart && (
            <StepCard n={2} title={t('manage_reschedule')}>
              <p className="text-[15px] font-medium text-gray-950">{tf('manage_reschedule_confirm', { when: f.when(newStart) })}</p>
              {yourTime(newStart)}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <button type="button" onClick={() => setMode('pick')} disabled={busy} className="btn-secondary">
                  {t('manage_reschedule_back')}
                </button>
                <button type="button" onClick={moveIt} disabled={busy} className="btn-primary">
                  {busy ? <span className="flex items-center justify-center gap-2"><Spinner />{t('manage_rescheduling')}</span> : t('manage_reschedule_yes')}
                </button>
              </div>
            </StepCard>
          )}
        </div>
      )}
    </BookingShell>
  )
}
