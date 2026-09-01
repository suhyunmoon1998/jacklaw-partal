'use client'

/**
 * Emailing one client the link to one assignment.
 *
 * A component of its own because two screens now hand a client questions: the
 * assignments panel of a client who already exists, and the add-client screen
 * where the questions are pasted before that client has any history at all.
 * One dialog is what keeps the address, the language and the wording of a
 * failure identical whichever door the questions came through.
 */

import { useState } from 'react'
import { MOCK_ADMIN_PASSWORD } from '@/lib/mockData'
import { Lang, LANGUAGES, LANG_ENGLISH_NAME, toLang } from '@/lib/langs'
import ModalPortal from '@/components/ModalPortal'

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-key': MOCK_ADMIN_PASSWORD }

export default function SendAssignmentDialog({
  assignmentId,
  setName,
  clientName,
  link,
  initialEmail,
  initialLang,
  onClose,
  onSent,
}: {
  assignmentId: string
  setName: string
  clientName: string
  link: string
  /** Whatever address is on file — blank for a client who has answered nothing yet. */
  initialEmail: string
  initialLang: Lang
  onClose: () => void
  /** Fired once the email is actually out, with a line the caller can show. */
  onSent: (message: string) => void
}) {
  const [email, setEmail] = useState(initialEmail)
  const [lang, setLang] = useState<Lang>(initialLang)
  /**
   * Why a send failed, shown inside this dialog.
   *
   * Reporting it on the panel behind the overlay looked to the office like the
   * button did nothing at all, and they pressed it again and again.
   */
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (sending) return
    setSending(true)
    setError('')

    const res = await fetch(`/api/admin/assignments/${assignmentId}/send`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ email, lang }),
    }).catch(() => null)

    setSending(false)

    if (!res) {
      setError('Could not reach the server. Check your connection and try again.')
      return
    }
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error ?? 'Could not send the email.')
      return
    }

    onSent(`Sent to ${body.email} in ${LANG_ENGLISH_NAME[toLang(body.lang)]}.`)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setError('')
    } catch {
      prompt('Copy this link:', link)
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl animate-modal-in" onClick={e => e.stopPropagation()}>
          <h3 className="font-bold text-black">Send “{setName}”</h3>
          <p className="text-xs text-gray-400 mt-0.5 mb-4">To {clientName}. This link opens only this question set.</p>

          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Client email</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="input-field text-sm"
          />
          {!email && (
            <p className="text-xs text-amber-600 mt-1.5">
              No email on file — type one, or use Copy Link and send it yourself.
            </p>
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
              <p className="text-sm text-red-700 font-semibold">The email was not sent.</p>
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
              disabled={sending || !email.includes('@')}
              className="bg-gold text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {sending && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {sending ? 'Sending…' : error ? 'Try again' : 'Send Email'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
