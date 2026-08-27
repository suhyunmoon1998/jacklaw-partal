'use client'

/**
 * Admin → a client's assigned question sets.
 *
 * The default onboarding questionnaire is listed first as a built-in row read
 * from questionnaire_states — it is not an assignment and is never affected by
 * anything done to the sets below it.
 */

import { useCallback, useEffect, useState } from 'react'
import { MOCK_ADMIN_PASSWORD } from '@/lib/mockData'
import { AnswerValue, Assignment, AssignmentDetail, QuestionSet, QuestionnaireState } from '@/types'
import { LANGUAGES, LANG_ENGLISH_NAME, Lang, toLang } from '@/lib/langs'
import { submissionLanguage, translateAnswersToEnglish } from '@/lib/machineTranslate'
import PasteQuestionsDialog from '@/components/admin/PasteQuestionsDialog'
import ModalPortal from '@/components/ModalPortal'
import type { RecommendedBank } from '@/lib/recommendedQuestions'

const STATUS_BADGE: Record<Assignment['status'], { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-500' },
  assigned: { label: 'Not Sent', cls: 'bg-gray-100 text-gray-600' },
  sent: { label: 'Sent', cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', cls: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
}

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-key': MOCK_ADMIN_PASSWORD }

function shortDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ClientAssignments({
  clientId,
  clientName,
  caseType,
  defaultState,
  defaultQuestionCount,
}: {
  clientId: string
  clientName: string
  caseType: string
  defaultState: QuestionnaireState
  defaultQuestionCount: number
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [sets, setSets] = useState<QuestionSet[]>([])
  const [loading, setLoading] = useState(true)
  const [picking, setPicking] = useState(false)
  const [pasting, setPasting] = useState(false)
  const [asDraft, setAsDraft] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [viewing, setViewing] = useState<AssignmentDetail | null>(null)
  /**
   * The viewed assignment's answers rendered in English. An assigned set is
   * authored in English but answered in whichever language the client read it
   * in, so the office would otherwise be reading a case file in four
   * languages. Null means the translation has not arrived (or was not needed).
   */
  const [viewTranslated, setViewTranslated] = useState<Record<string, string> | null>(null)
  const [viewTranslating, setViewTranslating] = useState(false)
  /** Kept apart from the cache above so the toggle can go both ways. */
  const [viewOriginal, setViewOriginal] = useState(false)
  const [sending, setSending] = useState<{ assignment: Assignment; email: string; link: string; lang: Lang } | null>(null)
  /**
   * Why a send failed, shown inside the send dialog.
   *
   * `notice` renders in the panel's normal flow, which is behind this dialog's
   * overlay — so reporting a failure there looked to the office like the button
   * did nothing at all, and they pressed it again and again.
   */
  const [sendError, setSendError] = useState('')
  const [sendingNow, setSendingNow] = useState(false)
  const [notice, setNotice] = useState('')
  const [banks, setBanks] = useState<RecommendedBank[]>([])

  const load = useCallback(async () => {
    const [aRes, sRes] = await Promise.all([
      fetch(`/api/admin/assignments?clientId=${encodeURIComponent(clientId)}`, { headers: adminHeaders }),
      fetch('/api/admin/question-sets', { headers: adminHeaders }),
    ])
    if (aRes.ok) setAssignments((await aRes.json()).assignments ?? [])
    if (sRes.ok) setSets((await sRes.json()).sets ?? [])
    setLoading(false)
  }, [clientId])

  // Suggestions keyed off this client's own case type, so the shortcut below is
  // already the right one for them.
  useEffect(() => {
    fetch(`/api/admin/recommended-questions?caseType=${encodeURIComponent(caseType)}`, { headers: adminHeaders })
      .then(r => r.json())
      .then(({ banks }) => setBanks(banks ?? []))
      .catch(() => setBanks([]))
  }, [caseType])

  useEffect(() => { load() }, [load])

  const assignable = sets.filter(s => !s.isDefault && s.status === 'active')

  const handleAssign = async (setId: string) => {
    setBusy(setId)
    const res = await fetch('/api/admin/assignments', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ clientId, questionSetId: setId, asDraft }),
    })
    setBusy(null)
    setPicking(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setNotice(body.error ?? 'Could not assign.')
      return
    }
    load()
  }

  /** Creates the suggested set and hands it to this client in one step. */
  const assignRecommended = async (bank: RecommendedBank) => {
    setBusy(bank.key)
    const created = await fetch('/api/admin/question-sets', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: bank.setName,
        nameTranslations: bank.setNameTranslations,
        description: bank.description,
        questions: bank.questions,
      }),
    })
    if (!created.ok) { setBusy(null); setNotice('Could not build that question set.'); return }
    const { id } = await created.json()

    const assigned = await fetch('/api/admin/assignments', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ clientId, questionSetId: id, asDraft }),
    })
    setBusy(null)
    setPicking(false)
    if (!assigned.ok) { setNotice('The set was created but could not be assigned.'); return }
    setNotice(`"${bank.setName}" created and assigned. Edit it under Question Sets if you want to adjust the questions.`)
    load()
  }

  const viewAnsweredIn = viewing ? submissionLanguage(viewing.answers) : null

  useEffect(() => {
    if (!viewing || !viewAnsweredIn || viewTranslated || viewTranslating) return
    let live = true
    setViewTranslating(true)
    translateAnswersToEnglish(viewing.answers).then(result => {
      if (!live) return
      setViewTranslated(result)
      setViewTranslating(false)
    })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewing?.id, viewAnsweredIn])

  const openSend = async (assignment: Assignment) => {
    setBusy(assignment.id)
    const res = await fetch(`/api/admin/assignments/${assignment.id}/send`, { headers: adminHeaders })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    setSendError('')
    setSending({ assignment, email: body.email ?? '', link: body.link ?? '', lang: toLang(body.lang) })
  }

  const handleSend = async () => {
    if (!sending || sendingNow) return
    setSendingNow(true)
    setSendError('')

    const res = await fetch(`/api/admin/assignments/${sending.assignment.id}/send`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ email: sending.email, lang: sending.lang }),
    }).catch(() => null)

    setSendingNow(false)

    if (!res) {
      setSendError('Could not reach the server. Check your connection and try again.')
      return
    }
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setSendError(body.error ?? 'Could not send the email.')
      return
    }

    setSending(null)
    setSendError('')
    setNotice(`Sent to ${body.email} in ${LANG_ENGLISH_NAME[toLang(body.lang)]}.`)
    load()
  }

  const markSent = async (assignment: Assignment) => {
    setBusy(assignment.id)
    await fetch(`/api/admin/assignments/${assignment.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'sent' }),
    })
    setBusy(null)
    load()
  }

  const release = async (assignment: Assignment) => {
    setBusy(assignment.id)
    await fetch(`/api/admin/assignments/${assignment.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'assigned' }),
    })
    setBusy(null)
    load()
  }

  const copyLink = async (assignment: Assignment) => {
    const link = `${window.location.origin}/questionnaire/${assignment.id}`
    try {
      await navigator.clipboard.writeText(link)
      setNotice('Link copied.')
    } catch {
      prompt('Copy this link:', link)
    }
  }

  const view = async (assignment: Assignment) => {
    setBusy(assignment.id)
    const res = await fetch(`/api/admin/assignments/${assignment.id}`, { headers: adminHeaders })
    setBusy(null)
    if (res.ok) {
      setViewTranslated(null)
      setViewOriginal(false)
      setViewing((await res.json()).assignment)
    }
  }

  const remove = async (assignment: Assignment) => {
    if (!confirm(`Remove "${assignment.questionSetName}" from ${clientName}?\n\nTheir answers to this set are deleted. Other questionnaires are not affected.`)) return
    setBusy(assignment.id)
    await fetch(`/api/admin/assignments?id=${assignment.id}`, { method: 'DELETE', headers: adminHeaders })
    setBusy(null)
    load()
  }

  const download = (assignment: Assignment) => {
    // Same admin key the other admin downloads use, passed as a header via fetch.
    fetch(`/api/admin/assignments/${assignment.id}/pdf`, { headers: adminHeaders })
      .then(async res => {
        if (!res.ok) { setNotice('Could not build the PDF.'); return }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${clientName.replace(/[^a-z0-9]+/gi, '-')}-${assignment.questionSetName.replace(/[^a-z0-9]+/gi, '-')}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      })
  }

  const defaultStatus = defaultState.submitted
    ? { label: 'Completed', cls: 'bg-green-100 text-green-700' }
    : defaultState.completedSections.length > 0
    ? { label: 'In Progress', cls: 'bg-amber-100 text-amber-700' }
    : { label: 'Not Started', cls: 'bg-gray-100 text-gray-500' }

  return (
    <div className="p-5 space-y-3">
      {notice && (
        <div className="bg-gold/10 border border-gold/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-700">{notice}</p>
          <button onClick={() => setNotice('')} className="text-gray-400 hover:text-black text-sm">✕</button>
        </div>
      )}

      {/* Built-in onboarding questionnaire */}
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900 text-sm">Default Onboarding</p>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Built in</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {defaultQuestionCount} questions · every client receives this
            </p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${defaultStatus.cls}`}>
            {defaultStatus.label}
          </span>
        </div>
      </div>

      {/* Assigned question sets */}
      {loading ? (
        <div className="animate-shimmer h-20 rounded-xl" />
      ) : assignments.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No question sets assigned yet.</p>
      ) : (
        assignments.map(a => {
          const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.assigned
          return (
            <div key={a.id} className={`border border-gray-200 rounded-xl p-4 ${busy === a.id ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{a.questionSetName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.questionCount} questions · {a.answeredCount} answered
                    {a.sentAt && ` · sent ${shortDate(a.sentAt)}`}
                    {a.completedAt && ` · completed ${shortDate(a.completedAt)}`}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {a.status === 'draft' ? (
                  <button
                    onClick={() => release(a)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold hover:text-white transition-colors"
                  >
                    Release to client
                  </button>
                ) : (
                  <button
                    onClick={() => openSend(a)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold hover:text-white transition-colors"
                  >
                    {a.sentAt ? 'Send again' : 'Send to Client'}
                  </button>
                )}
                <button
                  onClick={() => copyLink(a)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  Copy Link
                </button>
                {(a.answeredCount > 0 || a.status === 'in_progress' || a.status === 'completed') && (
                  <>
                    <button
                      onClick={() => view(a)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      View Answers
                    </button>
                    <button
                      onClick={() => download(a)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      Download
                    </button>
                  </>
                )}
                {a.status === 'assigned' && (
                  <button
                    onClick={() => markSent(a)}
                    className="text-xs font-medium px-2 py-1.5 text-gray-400 hover:text-black transition-colors"
                    title="Mark as sent if you delivered the link yourself"
                  >
                    Mark sent
                  </button>
                )}
                <button
                  onClick={() => remove(a)}
                  className="ml-auto p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                  aria-label="Remove assignment"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })
      )}

      {/* Assign */}
      {picking ? (
        <div className="border-2 border-gold/40 rounded-xl p-4 bg-gold/5">
          <p className="text-sm font-semibold text-black mb-2">Select Question Set</p>
          {assignable.length === 0 ? (
            <p className="text-sm text-gray-500">No active question sets yet — create one under Question Sets.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {assignable.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleAssign(s.id)}
                  className="w-full flex items-center justify-between gap-3 text-left px-3 py-2.5 rounded-lg bg-white border border-gray-200 hover:border-gold transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800 truncate">{s.name}</span>
                    <span className="block text-xs text-gray-400">{s.questionCount} questions</span>
                  </span>
                  <span className="text-gold text-xs font-semibold shrink-0">Assign →</span>
                </button>
              ))}
            </div>
          )}
          {banks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gold/20">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Suggested for {caseType}
              </p>
              <div className="space-y-1.5">
                {banks.map(bank => (
                  <button
                    key={bank.key}
                    onClick={() => assignRecommended(bank)}
                    disabled={busy === bank.key}
                    className="w-full flex items-center justify-between gap-3 text-left px-3 py-2.5 rounded-lg bg-white border border-dashed border-gold/50 hover:border-gold transition-colors disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-800 truncate">{bank.setName}</span>
                      <span className="block text-xs text-gray-400">
                        {bank.questions.length} suggested questions · creates a new set
                      </span>
                    </span>
                    <span className="text-gold text-xs font-semibold shrink-0">
                      {busy === bank.key ? 'Working…' : 'Build & assign →'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 mt-3 text-xs text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={asDraft} onChange={e => setAsDraft(e.target.checked)} className="w-4 h-4 accent-gold" />
            Save as draft — do not show it to the client yet
          </label>
          <button onClick={() => setPicking(false)} className="mt-3 text-sm text-gray-500 hover:text-black">
            Cancel
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          <button
            onClick={() => setPicking(true)}
            className="border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-500 hover:border-gold hover:text-gold transition-colors"
          >
            + Assign Question Set
          </button>
          {/* The other half of the job: questions written for this client alone,
              which no reusable set covers. */}
          <button
            onClick={() => setPasting(true)}
            className="border-2 border-dashed border-gold/40 rounded-xl py-3 text-sm font-semibold text-gold hover:border-gold hover:bg-gold/5 transition-colors"
          >
            + Paste Extra Questions
          </button>
        </div>
      )}

      {pasting && (
        <PasteQuestionsDialog
          clientId={clientId}
          clientName={clientName}
          onClose={() => setPasting(false)}
          onCreated={async (assignmentId, name) => {
            setPasting(false)
            await load()
            if (!assignmentId) { setNotice(`"${name}" was built and assigned.`); return }
            // Straight into the existing send dialog, so the email, the address
            // and the language all go through one reviewed path.
            const res = await fetch(`/api/admin/assignments/${assignmentId}/send`, { headers: adminHeaders })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) { setNotice(`"${name}" was assigned. Use Send when you are ready.`); return }
            setSending({
              assignment: { id: assignmentId, questionSetName: name } as Assignment,
              email: body.email ?? '',
              link: body.link ?? '',
              lang: toLang(body.lang),
            })
          }}
        />
      )}

      {/* Send dialog */}
      {sending && (
        <ModalPortal>
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => { setSending(null); setSendError('') }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl animate-modal-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-black">Send “{sending.assignment.questionSetName}”</h3>
            <p className="text-xs text-gray-400 mt-0.5 mb-4">To {clientName}. This link opens only this question set.</p>

            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Client email</label>
            <input
              value={sending.email}
              onChange={e => setSending({ ...sending, email: e.target.value })}
              placeholder="client@example.com"
              className="input-field text-sm"
            />
            {!sending.email && (
              <p className="text-xs text-amber-600 mt-1.5">
                No email on file — type one, or use Copy Link and send it yourself.
              </p>
            )}

            <label className="block text-xs font-semibold text-gray-500 mt-3 mb-1.5">Language</label>
            <select
              value={sending.lang}
              onChange={e => setSending({ ...sending, lang: toLang(e.target.value) })}
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

            <p className="mt-3 text-[11px] text-gray-400 break-all bg-gray-50 rounded-lg p-2">{sending.link}</p>

            {sendError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                <p className="text-sm text-red-700 font-semibold">The email was not sent.</p>
                <p className="text-xs text-red-600 mt-1">{sendError}</p>
                <p className="text-xs text-red-500 mt-2">
                  The questionnaire itself is still assigned. Use Copy Link and send it yourself in
                  the meantime.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setSending(null); setSendError('') }}
                className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-black"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sendingNow || !sending.email.includes('@')}
                className="bg-gold text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {sendingNow && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {sendingNow ? 'Sending…' : sendError ? 'Try again' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Answers */}
      {viewing && (
        <ModalPortal>
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => { setViewing(null); setViewTranslated(null) }}>
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-modal-in overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-black px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-white font-bold">{viewing.questionSetName}</h3>
                <p className="text-white/40 text-xs mt-0.5">
                  {viewing.clientName} · {viewing.answeredCount}/{viewing.questionCount} answered
                </p>
              </div>
              <button onClick={() => { setViewing(null); setViewTranslated(null) }} className="text-white/40 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {viewAnsweredIn && (
              <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-gold/5 border-b border-gold/20 shrink-0">
                <span className="text-xs text-gray-500">
                  {viewTranslating
                    ? `Detected ${LANG_ENGLISH_NAME[viewAnsweredIn]} — translating…`
                    : viewTranslated && !viewOriginal
                    ? `Auto-translated from ${LANG_ENGLISH_NAME[viewAnsweredIn]}`
                    : `${LANG_ENGLISH_NAME[viewAnsweredIn]} detected`}
                </span>
                <button
                  onClick={() => setViewOriginal(v => !v)}
                  disabled={viewTranslating || !viewTranslated}
                  className="text-xs font-semibold text-gold hover:underline disabled:opacity-40 disabled:no-underline shrink-0"
                >
                  {viewOriginal ? 'Show English' : 'Show original'}
                </button>
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
              {viewing.questions.map(q => {
                const val = viewing.answers[q.id]
                // The translated text is already flattened, so a multiselect
                // loses its bullets — worth it to read the file in English.
                // An empty translation falls through to the original rather
                // than blanking an answer the client did give.
                const english = viewOriginal ? '' : viewTranslated?.[q.id]
                const shown = english || formatAnswer(val)
                return (
                  <div key={q.id} className="px-5 py-3">
                    <p className="text-xs text-gray-400 mb-1">{q.label}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-line font-medium">{shown}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  )
}

function formatAnswer(val: AnswerValue | undefined): string {
  if (val === undefined || val === null) return '—'
  if (Array.isArray(val)) return val.length ? val.map(v => `• ${v}`).join('\n') : '—'
  const s = String(val).trim()
  if (!s) return '—'
  if (s === 'yes') return '✓ Yes'
  if (s === 'no') return '✗ No'
  if (s === 'not_sure') return '? Not Sure'
  return s
}
