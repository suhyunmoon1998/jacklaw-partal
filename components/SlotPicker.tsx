'use client'

import { useMemo } from 'react'
import { bookingFormat } from '@/components/BookingShell'
import { useLanguage } from '@/lib/i18n'

/**
 * The day grid and the times on the chosen day, as /book and the reschedule
 * step on /book/manage both show them.
 *
 * Times are Pacific, the office's clock. When the visitor's own clock reads
 * differently, each time carries theirs underneath in grey — with +1 or -1
 * when it falls on another day there — so a client in New York or Seoul does
 * not have to work it out.
 */

export interface SlotDay {
  date: string
  slots: string[]
}

export default function SlotPicker({
  days,
  day,
  onDay,
  onPick,
  visitorZone,
}: {
  days: SlotDay[]
  day: string | null
  onDay: (date: string) => void
  onPick: (start: string) => void
  visitorZone: string | null
}) {
  const { t, tf, lang } = useLanguage()
  const f = useMemo(() => bookingFormat(lang), [lang])
  const today = days.find(d => d.date === day)

  // The calendar starts on the weekday of the first date, so its columns line up.
  const leading = days.length ? new Date(`${days[0].date}T12:00:00Z`).getUTCDay() : 0
  // 2026-11-01 is a Sunday; the seven days from it name the columns.
  const weekdayHeads = useMemo(() => Array.from({ length: 7 }, (_, i) => f.weekdayShort(`2026-11-0${i + 1}`)), [f])

  if (!days.length) return null
  const first = days[0].date
  const last = days[days.length - 1].date

  return (
    <>
      {/* No "times are Pacific" here: both pages say it above the picker. */}
      <p className="text-sm font-semibold text-gray-950 mb-3">
        {f.month(first)}
        {f.month(last) !== f.month(first) && ` – ${f.month(last)}`}
      </p>
      <div className="grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label={t('book_pick_day')}>
        {weekdayHeads.map(w => (
          <div key={w} className="text-[11px] font-medium text-gray-400 pb-1">{w}</div>
        ))}
        {Array.from({ length: leading }, (_, i) => <div key={`pad-${i}`} />)}
        {days.map(d => {
          const open = d.slots.length > 0
          const selected = d.date === day
          return (
            <button
              key={d.date}
              type="button"
              disabled={!open}
              onClick={() => onDay(d.date)}
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
          <h2 className="text-sm font-semibold text-gray-950 mb-1">
            {t('book_pick_time')} · <span className="font-normal text-gray-600">{f.dayLong(day)}</span>
          </h2>
          {visitorZone && <p className="text-xs text-gray-500 mb-3">{tf('book_local_note', { zone: f.zoneName(visitorZone) })}</p>}
          {!visitorZone && <div className="mb-3" />}
          {today?.slots.length ? (
            <div className="grid grid-cols-3 gap-2">
              {today.slots.map(s => {
                const shift = visitorZone ? f.localDayShift(s, visitorZone) : 0
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onPick(s)}
                    className="py-2.5 rounded-xl border border-gray-300 bg-white text-gray-950 hover:border-gold hover:text-gold-dark transition-colors"
                  >
                    <span className="block text-[15px] font-semibold">{f.time(s)}</span>
                    {visitorZone && (
                      <span className="block text-[11px] text-gray-400 font-medium mt-0.5">
                        {f.localTime(s, visitorZone)}
                        {shift !== 0 && ` (${shift > 0 ? '+' : ''}${shift})`}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t('book_no_times_day')}</p>
          )}
        </div>
      )}
    </>
  )
}
