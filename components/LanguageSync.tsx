'use client'

import { useEffect, useRef } from 'react'
import { getSession } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'

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
  const { lang } = useLanguage()
  /** What the server was last told, so a re-render does not re-post. */
  const sent = useRef<string | null>(null)

  useEffect(() => {
    const session = getSession()
    if (!session?.clientId) return

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
  }, [lang])

  return null
}
