'use client'

/**
 * Admin → Fee Waiver. The three court fee waiver questions (FW-001), sent to a
 * client in their own language, with what each household's answers come to.
 *
 * One row per client, sent or not, because this is where they are sent from
 * as well as read. The questions themselves live in lib/feeWaiver.ts.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { LANG_ENGLISH_NAME, isLang, toLang } from '@/lib/langs'
import type { FeeWaiverAnswers, FeeWaiverVerdict } from '@/lib/feeWaiver'
import SendAssignmentDialog from './SendAssignmentDialog'

interface Row {
  clientId: string
  name: string
  caseLabel: string
  lang: string | null
  assignment: { id: string; status: string; sentAt: string | null; completedAt: string | null } | null
  answers: FeeWaiverAnswers
  verdict: FeeWaiverVerdict
}

type Filter = 'all' | 'not-sent' | 'waiting' | 'answered'

const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')

/** Sent and not yet finished counts as waiting; a draft was never sent. */
function stage(r: Row): Exclude<Filter, 'all'> {
  if (!r.assignment || r.assignment.status === 'draft' || r.assignment.status === 'assigned') return 'not-sent'
  return r.assignment.status === 'completed' ? 'answered' : 'waiting'
}

function statusText(r: Row): string {
  const a = r.assignment
  if (!a || a.status === 'draft' || a.status === 'assigned') return 'Not sent'
  if (a.status === 'completed') return `Answered ${day(a.completedAt)}`
  if (a.status === 'in_progress') return `Started · sent ${day(a.sentAt)}`
  return `Sent ${day(a.sentAt)}`
}

const BENEFITS: Record<string, string> = { yes: 'Yes', no: 'No', not_sure: 'Not sure' }

function Verdict({ v }: { v: FeeWaiverVerdict }) {
  const pill = (cls: string, text: string, title?: string) => (
    <span title={title} className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{text}</span>
  )
  switch (v.kind) {
    case 'benefits':
      return pill('bg-green-100 text-green-700', 'Qualifies · benefits', 'FW-001 item 5a. Confirm the benefit is one the form lists.')
    case 'under':
      return pill('bg-green-100 text-green-700', `Qualifies · under ${money(v.limit)}`, `FW-001 item 5b, household of ${v.size}.`)
    case 'over':
      return pill('bg-red-50 text-red-700', `Over ${money(v.limit)}`, `Household of ${v.size}. The court can still grant it under item 5c.`)
    case 'no-table':
      return pill('bg-amber-50 text-amber-700', 'Income table not entered')
    case 'check':
      return pill('bg-amber-50 text-amber-700', 'Check · more than 10 at home')
    default:
      return <span className="text-gray-300">—</span>
  }
}

export default function FeeWaiverPanel() {
  const [rows, setRows] = useState<Row[]>([])
  const [table, setTable] = useState<{ effective: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [sending, setSending] = useState<{
    row: Row
    assignmentId: string
    email: string
    phone: string
    smsOptOut: boolean
    smsReady: boolean
    link: string
    lang: ReturnType<typeof toLang>
  } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/fee-waiver').catch(() => null)
    const body = res ? await res.json().catch(() => ({})) : {}
    if (res?.ok) {
      setRows(body.rows ?? [])
      setTable(body.table ?? null)
      setError('')
    } else {
      setError(body.error ?? 'Could not load the fee waiver list.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openSend = async (row: Row) => {
    setBusy(row.clientId)
    setNotice('')
    const made = await fetch('/api/admin/fee-waiver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: row.clientId }),
    }).catch(() => null)
    const { id, error: madeError } = made ? await made.json().catch(() => ({})) : {}
    if (!made?.ok || !id) {
      setBusy(null)
      setNotice(madeError ?? `Could not prepare the questions for ${row.name}.`)
      return
    }
    const res = await fetch(`/api/admin/assignments/${id}/send`).catch(() => null)
    const body = res ? await res.json().catch(() => ({})) : {}
    setBusy(null)
    setSending({
      row,
      assignmentId: id,
      email: body.email ?? '',
      phone: body.phone ?? '',
      smsOptOut: Boolean(body.smsOptOut),
      smsReady: body.smsReady !== false,
      link: body.link ?? '',
      lang: toLang(body.lang),
    })
  }

  const counts = useMemo(() => {
    const c = { all: rows.length, 'not-sent': 0, waiting: 0, answered: 0 }
    for (const r of rows) c[stage(r)] += 1
    return c
  }, [rows])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter(r => filter === 'all' || stage(r) === filter)
      .filter(r => !q || r.name.toLowerCase().includes(q) || r.caseLabel.toLowerCase().includes(q))
      .sort((a, b) => a.caseLabel.localeCompare(b.caseLabel) || a.name.localeCompare(b.name))
  }, [rows, filter, query])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <div key={i} className="animate-shimmer h-16 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {notice && (
        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-blue-800">{notice}</p>
          <button onClick={() => setNotice('')} className="text-blue-400 hover:text-blue-700 text-sm shrink-0">✕</button>
        </div>
      )}
      {!table && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          The FW-001 income table has not been entered yet. Clients on benefits show as qualifying; income answers
          are shown as given, without a verdict, until it is.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              ['all', 'All'],
              ['not-sent', 'Not sent'],
              ['waiting', 'Waiting'],
              ['answered', 'Answered'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label} ({counts[key]})
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search client or case"
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-full sm:w-56 focus:outline-none focus:border-gray-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="px-6 py-2.5 font-medium">Client</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Benefits</th>
                <th className="px-3 py-2.5 font-medium">Monthly income</th>
                <th className="px-3 py-2.5 font-medium">Household</th>
                <th className="px-3 py-2.5 font-medium">Result</th>
                <th className="px-6 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shown.map(r => {
                const sent = stage(r) !== 'not-sent'
                return (
                  <tr key={r.clientId} className={busy === r.clientId ? 'opacity-50' : ''}>
                    <td className="px-6 py-3">
                      <p className="font-semibold text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-400">
                        {[r.caseLabel, isLang(r.lang) ? LANG_ENGLISH_NAME[r.lang] : null].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{statusText(r)}</td>
                    <td className="px-3 py-3 text-gray-900">{r.answers.benefits ? BENEFITS[r.answers.benefits] : ''}</td>
                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{r.answers.income !== null ? money(r.answers.income) : ''}</td>
                    <td className="px-3 py-3 text-gray-900">{r.answers.householdAnswer ?? ''}</td>
                    <td className="px-3 py-3"><Verdict v={r.verdict} /></td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => openSend(r)}
                        disabled={busy !== null}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                          sent
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-700 hover:text-white'
                            : 'bg-gold/10 text-gold hover:bg-gold hover:text-white'
                        }`}
                      >
                        {sent ? 'Send again' : 'Send'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {shown.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">No clients here.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3 px-1">
        Three questions, in the client&apos;s language: government benefits, and — if not — the household&apos;s monthly
        income before taxes and how many people live there. {table ? `Income figures from FW-001 (${table.effective}).` : ''}
        {' '}These answers are kept out of the case facts.
      </p>

      {sending && (
        <SendAssignmentDialog
          assignmentId={sending.assignmentId}
          setName="Fee Waiver Questions"
          clientName={sending.row.name}
          link={sending.link}
          initialEmail={sending.email}
          initialPhone={sending.phone}
          smsOptOut={sending.smsOptOut}
          smsReady={sending.smsReady}
          initialLang={sending.lang}
          onClose={() => setSending(null)}
          onSent={message => { setSending(null); setNotice(message); load() }}
        />
      )}
    </>
  )
}
