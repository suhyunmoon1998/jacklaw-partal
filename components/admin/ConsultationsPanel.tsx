'use client'

/**
 * Admin → Consultations. The free consultations booked on /book, with the
 * conflict check for each, and the people who take them.
 *
 * The conflict check is shown as what it is: names that matched, for an
 * attorney to look at and mark reviewed. "No matches" is an automated name
 * match, not a cleared check, and the panel says so.
 *
 * Imports only the pure modules (hours, conflicts) — never the store or the
 * Google client, which would pull server code into the browser bundle.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { LANG_ENGLISH_NAME, toLang } from '@/lib/langs'
import { CONFLICT_LABEL, ConflictHit, NEEDS_REVIEW, needsReview } from '@/lib/consultations/conflicts'
import { WEEKDAY_KEYS, WEEKDAY_NAMES, formatDayLine, readWeeklyHours } from '@/lib/consultations/hours'

interface Host {
  id: string
  name: string
  email: string
  weekly_hours: unknown
  active: boolean
}

interface Consultation {
  id: string
  host_id: string
  starts_at: string
  ends_at: string
  status: 'held' | 'booked' | 'cancelled'
  name: string
  email: string
  phone: string
  lang: string
  adverse_party: string
  other_parties: string
  summary: string
  conflicts: ConflictHit[] | null
  conflicts_reviewed_at: string | null
  meet_url: string | null
  cancelled_at: string | null
  cancelled_by: 'client' | 'office' | null
  created_at: string
  consultation_hosts?: { name: string; email: string } | null
}

interface Data {
  calendar: { configured: boolean; serviceAccount: string | null; scopes: string[] }
  bookingUrl: string
  hosts: Host[]
  booked: Consultation[]
  cancelled: Consultation[]
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const phoneText = (d: string) => (d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d)

function ConflictPill({ c }: { c: Consultation }) {
  const pill = (cls: string, text: string) => (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{text}</span>
  )
  if (c.conflicts === null) return pill('bg-amber-50 text-amber-700', 'Not checked')
  const urgent = c.conflicts.filter(h => NEEDS_REVIEW.includes(h.kind)).length
  if (c.conflicts_reviewed_at) return pill('bg-gray-100 text-gray-600', 'Reviewed')
  if (urgent) return pill('bg-red-50 text-red-700', `${urgent} possible conflict${urgent === 1 ? '' : 's'}`)
  if (c.conflicts.length) return pill('bg-amber-50 text-amber-700', `${c.conflicts.length} to note`)
  return pill('bg-green-50 text-green-700', 'No matches')
}

export default function ConsultationsPanel() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [view, setView] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming')
  const [showHosts, setShowHosts] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/consultations', { cache: 'no-store' }).catch(() => null)
    if (!res?.ok) {
      setError(res?.status === 401 ? 'Your session ended. Sign in again.' : 'Could not load consultations.')
      return
    }
    setError('')
    setData(await res.json())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(() => {
    if (!data) return []
    const now = Date.now()
    if (view === 'cancelled') return data.cancelled
    if (view === 'past') return data.booked.filter(c => Date.parse(c.ends_at) < now).reverse()
    return data.booked.filter(c => Date.parse(c.ends_at) >= now)
  }, [data, view])

  const toReview = data?.booked.filter(c => Date.parse(c.ends_at) >= Date.now() && !c.conflicts_reviewed_at && (c.conflicts === null || needsReview(c.conflicts))).length ?? 0

  async function act(id: string, action: 'review' | 'unreview' | 'cancel') {
    if (action === 'cancel' && !window.confirm('Cancel this consultation? The client is emailed and the time opens again.')) return
    setBusy(id)
    setNotice('')
    const res = await fetch('/api/admin/consultations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    }).catch(() => null)
    const body = await res?.json().catch(() => ({}))
    setBusy(null)
    if (!res?.ok) {
      setNotice(body?.error ?? 'That did not go through.')
      return
    }
    setNotice(action === 'cancel' ? 'Cancelled. The client has been emailed.' : '')
    await load()
  }

  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>

  const activeHosts = data.hosts.filter(h => h.active).length

  return (
    <div className="space-y-6">
      {/* Setup status: what stops /book from working, said first */}
      {(!data.calendar.configured || activeHosts === 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900 space-y-1">
          <p className="font-semibold">Online booking is closed until this is done:</p>
          {!data.calendar.configured && (
            <p>• Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_WORKLOAD_IDENTITY_PROVIDER on this deployment (docs/consultations.md).</p>
          )}
          {activeHosts === 0 && <p>• Add at least one host below.</p>}
          <p className="text-amber-800/80 pt-1">Until then /book tells clients to call the office.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-3xl font-bold text-black">{data.booked.filter(c => Date.parse(c.ends_at) >= Date.now()).length}</p>
          <p className="text-xs text-gray-400 mt-1">Upcoming</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className={`text-3xl font-bold ${toReview ? 'text-red-600' : 'text-green-600'}`}>{toReview}</p>
          <p className="text-xs text-gray-400 mt-1">Need conflict review</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Booking link</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-gray-800 truncate flex-1">{data.bookingUrl}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(data.bookingUrl).then(() => setNotice('Booking link copied.'))}
              className="text-xs font-semibold text-gold-dark hover:text-gold shrink-0"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {notice && <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700">{notice}</div>}

      {/* Bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex gap-4 px-5 pt-4 border-b border-gray-100">
          {(['upcoming', 'past', 'cancelled'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`pb-3 text-sm font-semibold capitalize ${view === v ? 'border-b-2 border-gold text-black' : 'text-gray-500 hover:text-black'}`}
            >
              {v}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">Nothing here.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map(c => (
              <li key={c.id}>
                <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} className="w-full text-left px-5 py-4 hover:bg-gray-50 flex items-center gap-4">
                  <div className="w-36 shrink-0">
                    <p className={`text-sm font-semibold text-gray-900 ${c.status === 'cancelled' ? 'line-through text-gray-400' : ''}`}>{when(c.starts_at)}</p>
                    <p className="text-xs text-gray-400">{c.consultation_hosts?.name ?? '—'}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">vs. {c.adverse_party} · {LANG_ENGLISH_NAME[toLang(c.lang)]}</p>
                  </div>
                  <ConflictPill c={c} />
                </button>

                {open === c.id && (
                  <div className="px-5 pb-5 space-y-4 bg-gray-50/60">
                    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm pt-2">
                      <div><dt className="text-xs text-gray-400">Phone</dt><dd className="text-gray-900">{phoneText(c.phone)}</dd></div>
                      <div><dt className="text-xs text-gray-400">Email</dt><dd className="text-gray-900 break-all">{c.email}</dd></div>
                      <div><dt className="text-xs text-gray-400">Employer / other side</dt><dd className="text-gray-900">{c.adverse_party}</dd></div>
                      <div><dt className="text-xs text-gray-400">Others involved</dt><dd className="text-gray-900">{c.other_parties || '—'}</dd></div>
                      <div className="sm:col-span-2"><dt className="text-xs text-gray-400">What happened</dt><dd className="text-gray-900 whitespace-pre-wrap">{c.summary || '—'}</dd></div>
                      {c.meet_url && c.status === 'booked' && (
                        <div className="sm:col-span-2"><dt className="text-xs text-gray-400">Video</dt><dd><a href={c.meet_url} target="_blank" rel="noopener noreferrer" className="text-gold-dark font-medium break-all">{c.meet_url}</a></dd></div>
                      )}
                      {c.status === 'cancelled' && (
                        <div className="sm:col-span-2"><dt className="text-xs text-gray-400">Cancelled</dt><dd className="text-gray-900">by the {c.cancelled_by} · {c.cancelled_at ? when(c.cancelled_at) : ''}</dd></div>
                      )}
                    </dl>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Conflict check</p>
                      {c.conflicts === null ? (
                        <p className="text-sm text-amber-700">The check did not run for this booking. Check the names by hand.</p>
                      ) : c.conflicts.length === 0 ? (
                        <p className="text-sm text-gray-600">No names matched a client or an earlier consultation. This is an automated name match, not a cleared conflict check.</p>
                      ) : (
                        <ul className="space-y-1.5 text-sm">
                          {c.conflicts.map((h, i) => (
                            <li key={i} className={NEEDS_REVIEW.includes(h.kind) ? 'text-red-700' : 'text-gray-700'}>
                              <span className="font-semibold">{CONFLICT_LABEL[h.kind]}:</span> “{h.ours}” ↔ “{h.theirs}”{' '}
                              <span className="text-gray-500">({h.role}, {h.source === 'client' ? 'client file' : 'consultation'} of {h.recordLabel})</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {c.status === 'booked' && (
                        <div className="mt-3 flex items-center gap-3">
                          {c.conflicts_reviewed_at ? (
                            <>
                              <span className="text-xs text-gray-500">Reviewed {when(c.conflicts_reviewed_at)}</span>
                              <button type="button" disabled={busy === c.id} onClick={() => act(c.id, 'unreview')} className="text-xs font-semibold text-gray-500 hover:text-black">
                                Undo
                              </button>
                            </>
                          ) : (
                            <button type="button" disabled={busy === c.id} onClick={() => act(c.id, 'review')} className="text-sm font-semibold bg-black text-white rounded-lg px-3 py-1.5 hover:bg-gray-800 disabled:opacity-50">
                              Mark reviewed
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {c.status === 'booked' && Date.parse(c.starts_at) > Date.now() && (
                      <button type="button" disabled={busy === c.id} onClick={() => act(c.id, 'cancel')} className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">
                        Cancel consultation and email the client
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Hosts */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <button type="button" onClick={() => setShowHosts(s => !s)} className="w-full flex items-center justify-between px-5 py-4">
          <span className="text-sm font-semibold text-gray-900">Hosts and hours ({activeHosts} taking bookings)</span>
          <span className="text-xs text-gray-500">{showHosts ? 'Hide' : 'Show'}</span>
        </button>
        {showHosts && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 leading-relaxed">
              A time is offered when at least one active host has it inside their hours and free on their Google calendar. Each booking goes to the free host with the fewest upcoming consultations.
              {data.calendar.serviceAccount && <> Service account: <code className="text-gray-700">{data.calendar.serviceAccount}</code>.</>}
            </p>
            {data.hosts.map(h => (
              <HostEditor key={h.id} host={h} onSaved={load} />
            ))}
            <AddHost onAdded={load} />
          </div>
        )}
      </div>
    </div>
  )
}

function HostEditor({ host, onSaved }: { host: Host; onSaved: () => void }) {
  const initial = useMemo(() => {
    const hours = readWeeklyHours(host.weekly_hours)
    return Object.fromEntries(WEEKDAY_KEYS.map(k => [k, formatDayLine(hours[k])])) as Record<string, string>
  }, [host.weekly_hours])
  const [lines, setLines] = useState(initial)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const dirty = WEEKDAY_KEYS.some(k => lines[k] !== initial[k])

  async function send(method: 'PATCH' | 'PUT', body: Record<string, unknown>) {
    setSaving(true)
    setMessage(null)
    const res = await fetch('/api/admin/consultations/hosts', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: host.id, ...body }),
    }).catch(() => null)
    const json = await res?.json().catch(() => ({}))
    setSaving(false)
    return { res, json }
  }

  async function saveHours() {
    const { res, json } = await send('PATCH', { hours: lines })
    if (!res?.ok) return setMessage({ ok: false, text: json?.error ?? 'Not saved.' })
    setMessage({ ok: true, text: 'Hours saved.' })
    onSaved()
  }

  async function toggle() {
    const { res, json } = await send('PATCH', { active: !host.active })
    if (!res?.ok) return setMessage({ ok: false, text: json?.error ?? 'Not saved.' })
    onSaved()
  }

  async function check() {
    const { res, json } = await send('PUT', {})
    setMessage({ ok: Boolean(res?.ok && json?.ok), text: json?.message ?? json?.error ?? 'No answer.' })
  }

  return (
    <div className={`rounded-xl border p-4 ${host.active ? 'border-gray-200' : 'border-dashed border-gray-200 opacity-70'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{host.name}</p>
          <p className="text-xs text-gray-500">{host.email}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button type="button" onClick={check} disabled={saving} className="text-xs font-semibold text-gray-600 hover:text-black">
            Check calendar
          </button>
          <button type="button" onClick={toggle} disabled={saving} className={`text-xs font-semibold ${host.active ? 'text-red-600' : 'text-green-700'}`}>
            {host.active ? 'Stop bookings' : 'Take bookings'}
          </button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
        {WEEKDAY_KEYS.map(k => (
          <label key={k} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-gray-500 shrink-0">{WEEKDAY_NAMES[Number(k)]}</span>
            <input
              value={lines[k]}
              onChange={e => setLines(l => ({ ...l, [k]: e.target.value }))}
              placeholder="off"
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-gold"
            />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button type="button" onClick={saveHours} disabled={!dirty || saving} className="text-xs font-semibold bg-black text-white rounded-lg px-3 py-1.5 disabled:opacity-40">
          Save hours
        </button>
        <span className="text-[11px] text-gray-400">Pacific time, like 09:00-12:00, 13:00-17:00. Empty = off.</span>
      </div>
      {message && <p className={`text-xs mt-2 ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
    </div>
  )
}

function AddHost({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function add() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/consultations/hosts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    }).catch(() => null)
    const json = await res?.json().catch(() => ({}))
    setSaving(false)
    if (!res?.ok) return setError(json?.error ?? 'Not added.')
    setName('')
    setEmail('')
    onAdded()
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-4">
      <p className="text-xs font-semibold text-gray-700 mb-2">Add a host (Mon–Fri 9–12, 1–5 to start)</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold" />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@jacklaw.com" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold" />
        <button type="button" onClick={add} disabled={saving} className="text-sm font-semibold bg-gold text-white rounded-lg px-4 py-2 hover:bg-gold-dark disabled:opacity-50">
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
