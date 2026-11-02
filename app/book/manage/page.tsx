'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import BookingShell, { ErrorNote, Spinner, bookingFormat } from '@/components/BookingShell'
import { useLanguage } from '@/lib/i18n'

/**
 * /book/manage?b=<id>&t=<token> — the client's own booking, from the link in
 * their emails: when it is, the video link, and a way to cancel. Changing the
 * time is cancelling and booking again; the page says so.
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

export default function ManageBookingPage() {
  const { t, tf, lang } = useLanguage()
  const f = useMemo(() => bookingFormat(lang), [lang])

  const [link, setLink] = useState<{ b: string; t: string } | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [state, setState] = useState<'loading' | 'missing' | 'failed' | 'ready'>('loading')
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

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

  async function cancelIt() {
    if (!link) return
    setCancelling(true)
    setError('')
    try {
      const res = await fetch('/api/consultations/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...link, action: 'cancel' }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setBooking(await res.json())
      setConfirming(false)
    } catch {
      setError(t('manage_cancel_failed'))
    } finally {
      setCancelling(false)
    }
  }

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
            </div>

            {booking.status === 'cancelled' && (
              <>
                <p className="text-[15px] text-gray-700">{t('manage_cancelled')}</p>
                <Link href={`/book?lang=${lang}`} className="btn-primary block text-center">{t('manage_book_again')}</Link>
              </>
            )}

            {booking.status === 'past' && <p className="text-[15px] text-gray-700">{t('manage_past')}</p>}

            {booking.status === 'booked' && (
              <>
                {booking.meetUrl && (
                  <div>
                    <a href={booking.meetUrl} target="_blank" rel="noopener noreferrer" className="btn-primary block text-center">
                      {t('book_done_join')}
                    </a>
                    <p className="text-xs text-gray-500 mt-2 text-center">{t('book_done_join_hint')}</p>
                  </div>
                )}

                {error && <ErrorNote>{error}</ErrorNote>}

                {!confirming ? (
                  <div className="pt-2 border-t border-line">
                    <p className="text-sm text-gray-500 mt-4 mb-3">{t('manage_change_hint')}</p>
                    <button type="button" onClick={() => setConfirming(true)} className="btn-secondary">
                      {t('manage_cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-line space-y-3">
                    <p className="text-[15px] font-medium text-gray-950">{tf('manage_cancel_confirm', { when: f.when(booking.start) })}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setConfirming(false)} disabled={cancelling} className="btn-secondary">
                        {t('manage_cancel_no')}
                      </button>
                      <button
                        type="button"
                        onClick={cancelIt}
                        disabled={cancelling}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl text-[15px] font-semibold disabled:opacity-50"
                      >
                        {cancelling ? <span className="flex items-center justify-center gap-2"><Spinner />{t('manage_cancelling')}</span> : t('manage_cancel_yes')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </BookingShell>
  )
}
