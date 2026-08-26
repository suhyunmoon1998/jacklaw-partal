'use client'

/**
 * The portal's language switch.
 *
 * With two languages a single toggle button was enough — it could show the
 * one language you were not reading. Four languages need a picker, and it
 * has to be readable to someone who cannot read the language the page is
 * currently in, so every option is written in its own language and never
 * translated.
 *
 * Two shapes for the two places it appears: `menu` for the compact header,
 * `row` for the wide entry pages where the choice should be the obvious
 * first thing a client makes.
 */

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import { LANGUAGES, Lang } from '@/lib/langs'

const GLOBE = (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18"
    />
  </svg>
)

export default function LanguagePicker({ variant = 'menu' }: { variant?: 'menu' | 'row' }) {
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  // A menu left open behind a tap elsewhere is the usual complaint about this
  // pattern on a phone, so it closes on any outside touch and on Escape.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (code: Lang) => { setLang(code); setOpen(false) }
  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0]

  if (variant === 'row') {
    return (
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Language">
        {LANGUAGES.map(l => {
          const selected = l.code === lang
          return (
            <button
              key={l.code}
              onClick={() => choose(l.code)}
              lang={l.code}
              aria-pressed={selected}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 active:scale-[0.96] ${
                selected
                  ? 'bg-gold text-white border-2 border-gold shadow-md shadow-gold/25'
                  : 'bg-white/10 text-white border-2 border-white/20 hover:bg-white/20 hover:border-white/40'
              }`}
            >
              {l.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative" ref={wrap}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Language"
        className="flex items-center gap-1 shrink-0 whitespace-nowrap text-white/60 hover:text-gold
                   text-xs font-bold tracking-wider transition-all duration-150
                   border border-white/20 hover:border-gold/50 px-2 py-1 rounded-lg active:scale-[0.93]"
      >
        {GLOBE}
        <span lang={current.code}>{current.short}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[9rem] bg-white rounded-xl shadow-xl
                     border border-gray-100 overflow-hidden animate-fade-in"
        >
          {LANGUAGES.map(l => {
            const selected = l.code === lang
            return (
              <button
                key={l.code}
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => choose(l.code)}
                lang={l.code}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm text-left
                            transition-colors ${
                  selected ? 'bg-gold/10 text-gold font-semibold' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {l.label}
                {selected && (
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
