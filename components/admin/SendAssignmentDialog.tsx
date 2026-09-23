'use client'

/**
 * Handing one client the link to one assignment — by email, by text, or both.
 *
 * A component of its own because several screens now hand a client questions:
 * the assignments panel, the add-client screen where the questions are pasted
 * before that client has any history at all, and the module rows where the
 * office sends Module 1 or Module 2. One dialog is what keeps the address, the
 * number, the language and the wording of a failure identical whichever door
 * they came through.
 *
 * Both channels are offered because plenty of this office's clients have no
 * email address at all — they reached the firm by telephone and the number is
 * on a message pad. Sending was email-shaped for long enough that those clients
 * were "sent" questionnaires nobody could have opened. Either box filled in is
 * a send; both filled in sends both, which is what the office does when a
 * client is hard to reach.
 */

import { useState } from 'react'
import { Lang, LANGUAGES, LANG_ENGLISH_NAME, toLang } from '@/lib/langs'
import ModalPortal from '@/components/ModalPortal'

const adminHeaders = { 'Content-Type': 'application/json' }

/** Ten digits is what the routes will accept, so the button agrees with them. */
const phoneReady = (raw: string) => raw.replace(/\D/g, '').length >= 10

/** (213) 555-0147 as it is typed, because a half-typed number should not fight back. */
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  const n = d.length === 11 && d.startsWith('1') ? d.slice(1) : d
  if (n.length <= 3) return n
  if (n.length <= 6) return `(${n.slice(0, 3)}) ${n.slice(3)}`
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6, 10)}`
}

export default function SendAssignmentDialog({
  assignmentId,
  sendTo,
  setName,
  clientName,
  link,
  warning,
  initialEmail,
  initialPhone = '',
  smsOptOut = false,
  smsReady = true,
  initialLang,
  onClose,
  onSent,
}: {
  /** The assignment being sent. Ignored when `sendTo` names a module instead. */
  assignmentId: string
  /**
   * Send a built-in module rather than an assignment. The two go to different
   * routes and record different things; everything the person doing the sending
   * sees and types is the same, which is why they share this.
   */
  sendTo?: { clientId: string; moduleId: string }
  setName: string
  clientName: string
  link: string
  /**
   * What the office should know before they press Send. Today that is one
   * thing: this module will land locked, because a step the client was already
   * given is unfinished. Sending anyway is a legitimate choice — the office
   * queues work ahead — but it should be a choice, not a surprise the client
   * discovers by tapping a link that refuses her.
   */
  warning?: string
  /** Whatever address is on file — blank for a client who has answered nothing yet. */
  initialEmail: string
  /** Whatever mobile number is on file. Blank is normal and typing one is the point. */
  initialPhone?: string
  /** They replied STOP. The office may not text them, whatever is typed. */
  smsOptOut?: boolean
  /** Twilio is configured for this deployment. False turns the field off honestly. */
  smsReady?: boolean
  initialLang: Lang
  onClose: () => void
  /** Fired once something is actually out, with a line the caller can show. */
  onSent: (message: string) => void
}) {
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState(formatPhone(initialPhone))
  const [lang, setLang] = useState<Lang>(initialLang)
  /**
   * Why a send failed, shown inside this dialog.
   *
   * Reporting it on the panel behind the overlay looked to the office like the
   * button did nothing at all, and they pressed it again and again.
   */
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const canText = !smsOptOut && smsReady
  const willEmail = email.includes('@')
  const willText = canText && phoneReady(phone)
  /** A module can be opened to a client with neither; an assignment cannot. */
  const canSubmit = willEmail || willText || Boolean(sendTo)

  const handleSend = async () => {
    if (sending) return
    setSending(true)
    setError('')

    const res = await fetch(
      sendTo ? '/api/admin/modules/send' : `/api/admin/assignments/${assignmentId}/send`,
      {
        method: 'POST',
        headers: adminHeaders,
        // Both fields go as strings every time, empty included: the routes read
        // an empty box as "do not use this channel" and only an absent key as
        // "fall back to the file". Clearing one is how the office sends by the
        // other alone.
        body: JSON.stringify({ ...(sendTo ?? {}), email, phone: canText ? phone : '', lang }),
      }
    ).catch(() => null)

    setSending(false)

    if (!res) {
      setError('Could not reach the server. Check your connection and try again.')
      return
    }
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error ?? 'Could not send it.')
      return
    }

    // Sending a module records it whether or not anything got out, because the
    // record is what opens the questionnaire to the client. Say which happened.
    if (body.recorded && !body.sent) {
      onSent(
        `${setName} is now open to ${clientName}, but no message went out. ${body.error ?? ''}`.trim()
      )
      return
    }

    // Name the channels that worked, and the one that did not. The office is
    // deciding whether to pick up the telephone next, and "Sent." does not tell
    // them that the text bounced and only the email landed.
    const went = [body.email && `email to ${body.email}`, body.sms && `text to ${body.sms}`]
      .filter(Boolean)
      .join(' and ')
    const failed = [
      body.emailError && `The email did not go out: ${body.emailError}`,
      body.smsError && `The text did not go out: ${body.smsError}`,
    ]
      .filter(Boolean)
      .join(' ')

    onSent(
      `${went ? `Sent ${went}` : 'Sent'} in ${LANG_ENGLISH_NAME[toLang(body.lang)]}.${failed ? ` ${failed}` : ''}`
    )
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setError('')
    } catch {
      prompt('Copy this link:', link)
    }
  }

  const sendLabel = willEmail && willText
    ? 'Send Email & Text'
    : willText
    ? 'Send Text'
    : willEmail
    ? 'Send Email'
    : 'Open to client'

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl animate-modal-in" onClick={e => e.stopPropagation()}>
          <h3 className="font-bold text-black">Send “{setName}”</h3>
          <p className="text-xs text-gray-400 mt-0.5 mb-4">To {clientName}. This link opens only this question set.</p>

          {warning && (
            <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl px-3.5 py-2.5 flex gap-2.5">
              <svg className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 004.99 19z" />
              </svg>
              <p className="text-xs text-purple-800 leading-relaxed">{warning}</p>
            </div>
          )}

          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Client email</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="input-field text-sm"
          />

          <label className="block text-xs font-semibold text-gray-500 mt-3 mb-1.5">
            Client mobile <span className="font-normal text-gray-400">· for a text</span>
          </label>
          <input
            value={phone}
            onChange={e => setPhone(formatPhone(e.target.value))}
            placeholder="(213) 555-0147"
            inputMode="tel"
            disabled={!canText}
            className="input-field text-sm disabled:bg-gray-50 disabled:text-gray-400"
          />

          {/* One line under the pair, about whichever thing is true — the office
              needs to know what pressing the button will actually do. */}
          {smsOptOut ? (
            <p className="text-xs text-amber-600 mt-1.5">
              {clientName} replied STOP to our texts, so this office cannot text them. Send by
              email, or copy the link and pass it on yourself.
            </p>
          ) : !smsReady ? (
            <p className="text-xs text-gray-400 mt-1.5">
              Texting is not switched on for this portal yet.
            </p>
          ) : !willEmail && !willText ? (
            <p className="text-xs text-amber-600 mt-1.5">
              {sendTo
                ? 'Nothing to send to. You can still open it to them — the link only works once you do — and pass the link on yourself.'
                : 'Nothing to send to. Type an email or a mobile number, or use Copy Link and send it yourself.'}
            </p>
          ) : !willEmail ? (
            <p className="text-xs text-gray-400 mt-1.5">
              No email — this goes by text. The text carries the portal’s front door, not this
              link, and they sign in with this number.
            </p>
          ) : !willText ? (
            <p className="text-xs text-gray-400 mt-1.5">This goes by email only.</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1.5">This goes by both email and text.</p>
          )}

          <label className="block text-xs font-semibold text-gray-500 mt-3 mb-1.5">Language</label>
          <select
            value={lang}
            onChange={e => setLang(toLang(e.target.value))}
            className="input-field text-sm"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>
                {l.code === 'en' ? l.label : `${l.label} · ${LANG_ENGLISH_NAME[l.code]}`}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 mt-1">
            Taken from the language on their intake. The questions themselves appear in whichever
            language the client picks in the portal.
          </p>

          <button
            onClick={copyLink}
            className="mt-3 w-full text-left text-[11px] text-gray-400 break-all bg-gray-50 hover:bg-gray-100 rounded-lg p-2 transition-colors"
            title="Copy this link"
          >
            {link}
          </button>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              <p className="text-sm text-red-700 font-semibold">It was not sent.</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
              <p className="text-xs text-red-500 mt-2">
                The questionnaire itself is still assigned. Use Copy Link and send it yourself in
                the meantime.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-black"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !canSubmit}
              className="bg-gold text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {sending && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {sending ? 'Sending…' : error ? 'Try again' : sendLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
