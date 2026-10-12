'use client'

import { useEffect, useRef } from 'react'
import { getSession } from '@/lib/auth'
import { isLang, useLanguage } from '@/lib/i18n'

/**
 * Tells the office which language this client reads the portal in.
 *
 * The choice is made in the header and kept in the browser, which is all the
 * client needs — but it left the firm guessing from a "Preferred Language" box
 * on an intake form, ticked once and often not at all. Recording it means the
 * invitation email and any extra questions built for this client come out in
 * the language they are actually reading.
 *
 * Mounted app-wide and does nothing until someone is signed in, so the landing
 * and intake pages — where there is no client yet — cost nothing.
 */
export default function LanguageSync() {
  const { lang, chosen, ready, adopt } = useLanguage()
  /** What the server was last told, so a re-render does not re-post. */
  const sent = useRef<string | null>(null)

  useEffect(() => {
    if (!ready) return
    const session = getSession()
    if (!session?.clientId) return

    // A phone that has never been given a language shows English, and that
    // English is a default, not the client's word. Sending it would overwrite
    // the office's record — a Spanish-speaking client opening the portal on a
    // new phone would quietly become English, and so would every text, email
    // and call after it. Instead the office's record is read and taken.
    if (!chosen) {
      fetch(`/api/clients/language?clientId=${encodeURIComponent(session.clientId)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(body => {
          if (body && isLang(body.lang)) adopt(body.lang)
        })
        .catch(() => {})
      return
    }

    const key = `${session.clientId}:${lang}`
    if (sent.current === key) return
    sent.current = key

    // Best effort. A client who changes language must not see an error, and
    // the office still has the intake answer to fall back on.
    fetch('/api/clients/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: session.clientId, lang }),
    }).catch(() => {})
  }, [lang, chosen, ready, adopt])

  return null
}
