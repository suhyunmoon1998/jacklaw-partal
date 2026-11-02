'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import BookingShell, { ErrorNote, Spinner, bookingFormat, useVisitorZone } from '@/components/BookingShell'
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
    visitorZone ? <p className="text-xs text-gray-500">{tf('book_your_time', { when: f.localWhen(iso, visitorZone) })}</p> : null

  return (
    <BookingShell>
      <div className="card animate-slide-up">
        <h1 className="text-[22px] font-semibold tracking-tight text-gray-950 mb-4">{t('manage_title')}</h1>

        {state === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-gray-500 py-4 justify-center">
            <Spinner />
            {t('manage_loading')}
          </p>
        )}
        {state === 'missing' && <ErrorNote>{t('manage_not_found')}</ErrorNote>}
        {state === 'failed' && <ErrorNote>{t('book_load_failed')}</ErrorNote>}

        {state === 'ready' && booking && (
          <div className="space-y-5">
            <div className="bg-canvas border border-line rounded-xl px-4 py-3">
              <p className={`text-[17px] font-semibold text-gray-950 ${booking.status === 'cancelled' ? 'line-through text-gray-400' : ''}`}>
                {f.when(booking.start)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t('book_times_in')}</p>
              {booking.status !== 'cancelled' && yourTime(booking.start)}
            </div>

            {notice && (
              <div role="status" className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm leading-snug">
                {notice}
              </div>
            )}
            {error && <ErrorNote>{error}</ErrorNote>}

            {booking.status === 'cancelled' && (
              <>
                <p className="text-[15px] text-gray-700">{t('manage_cancelled')}</p>
                <Link href={`/book?lang=${lang}`} className="btn-primary block text-center">{t('manage_book_again')}</Link>
              </>
            )}

            {booking.status === 'past' && <p className="text-[15px] text-gray-700">{t('manage_past')}</p>}

            {booking.status === 'booked' && mode === 'view' && (
              <>
                {booking.meetUrl && (
                  <div>
                    <a href={booking.meetUrl} target="_blank" rel="noopener noreferrer" className="btn-primary block text-center">
                      {t('book_done_join')}
                    </a>
                    <p className="text-xs text-gray-500 mt-2 text-center">{t('book_done_join_hint')}</p>
                  </div>
                )}
                <div className="pt-4 border-t border-line space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNotice('')
                      setMode('pick')
                      loadTimes()
                    }}
                    className="btn-secondary"
                  >
                    {t('manage_reschedule')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotice('')
                      setMode('cancel')
                    }}
                    className="w-full py-2 text-sm font-semibold text-red-600 hover:text-red-700"
                  >
                    {t('manage_cancel')}
                  </button>
                </div>
              </>
            )}

            {booking.status === 'booked' && mode === 'cancel' && (
              <div className="pt-4 border-t border-line space-y-3">
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

            {booking.status === 'booked' && mode === 'pick' && (
              <div className="pt-4 border-t border-line">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-semibold text-gray-950">{t('manage_reschedule_pick')}</h2>
                  <button type="button" onClick={() => setMode('view')} className="text-sm font-semibold text-gray-500 hover:text-gray-900">
                    {t('manage_reschedule_back')}
                  </button>
                </div>
                {days === null ? (
                  <p className="flex items-center gap-2 text-sm text-gray-500 py-4 justify-center">
                    <Spinner />
                    {t('book_loading')}
                  </p>
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
                  <ErrorNote>{t('book_no_times')}</ErrorNote>
                )}
              </div>
            )}

            {booking.status === 'booked' && mode === 'confirm-move' && newStart && (
              <div className="pt-4 border-t border-line space-y-3">
                <p className="text-[15px] font-medium text-gray-950">{tf('manage_reschedule_confirm', { when: f.when(newStart) })}</p>
                {yourTime(newStart)}
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setMode('pick')} disabled={busy} className="btn-secondary">
                    {t('manage_reschedule_back')}
                  </button>
                  <button type="button" onClick={moveIt} disabled={busy} className="btn-primary">
                    {busy ? <span className="flex items-center justify-center gap-2"><Spinner />{t('manage_rescheduling')}</span> : t('manage_reschedule_yes')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BookingShell>
  )
}
