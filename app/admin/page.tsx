'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  getAdminSession,
  setAdminSession,
  clearAdminSession,
  getSubmissionNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
  formatPhone,
  type SubmissionNotification,
} from '@/lib/auth'
import { MOCK_ADMIN_PASSWORD } from '@/lib/mockData'

interface AdminClient {
  id: string
  name: string
  phone: string
  caseType: string
  onboardingStatus: string
  createdAt: string
  questionnaire: { completedSections: number[]; submitted: boolean; lastSaved: string }
  documentCount: number
}
import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import { QuestionnaireState, UploadedDocument } from '@/types'

// ─── Admin Login ──────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    if (password === MOCK_ADMIN_PASSWORD) {
      setAdminSession()
      onLogin()
    } else {
      setError('Incorrect password.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="866 JACK LAW" width={100} height={100} className="rounded-sm mb-4" />
          <span className="bg-gold text-white text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase">
            Admin Portal
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-white font-semibold text-lg mb-1">Sign In</p>
          <p className="text-white/40 text-xs mb-5">Internal access only · Law Offices of Jack D. Josephson, APC</p>


          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30
                           focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                autoFocus
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-gold text-white py-3 rounded-xl font-semibold hover:bg-gold-dark transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Law Offices of Jack D. Josephson, APC · California Employment Law
        </p>
      </div>
    </div>
  )
}

// ─── Client Detail Modal ──────────────────────────────────────────────────────
function ClientDetailModal({
  client,
  qState,
  documents,
  onClose,
}: {
  client: AdminClient
  qState: QuestionnaireState
  documents: UploadedDocument[]
  onClose: () => void
}) {
  const [tab, setTab] = useState<'progress' | 'answers' | 'documents'>('progress')
  const [expandedSection, setExpandedSection] = useState<number | null>(null)
  const totalSections = QUESTIONNAIRE_SECTIONS.length
  const completedPct = qState.submitted
    ? 100
    : Math.round((qState.completedSections.length / totalSections) * 100)

  const hasAnyAnswers = Object.keys(qState.answers).length > 0

  const statusBadge = qState.submitted
    ? { label: 'Submitted', cls: 'bg-green-100 text-green-700' }
    : qState.completedSections.length > 0
    ? { label: 'In Progress', cls: 'bg-amber-100 text-amber-700' }
    : { label: 'Not Started', cls: 'bg-gray-100 text-gray-500' }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-black px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/20 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold">{client.name}</h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge.cls}`}>
                  {statusBadge.label}
                </span>
              </div>
              <p className="text-white/40 text-xs mt-0.5">{client.caseType} · {formatPhone(client.phone)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${completedPct === 100 ? 'bg-green-400' : 'bg-gold'}`} style={{ width: `${completedPct}%` }} />
              </div>
              <span className="text-white/50 text-xs">{completedPct}%</span>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 bg-gray-50">
          {([
            { key: 'progress', label: 'Progress' },
            { key: 'answers', label: 'Answers' },
            { key: 'documents', label: `Documents (${documents.length})` },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-b-2 border-gold text-gold bg-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Progress tab ── */}
          {tab === 'progress' && (
            <div className="p-5 space-y-3">
              {/* Summary bar */}
              <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4 border border-gray-100">
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                    <circle
                      cx="28" cy="28" r="24" fill="none"
                      stroke={completedPct === 100 ? '#22c55e' : '#E07820'}
                      strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 24}`}
                      strokeDashoffset={`${2 * Math.PI * 24 * (1 - completedPct / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-black">{completedPct}%</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-black text-sm">{client.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {qState.submitted
                      ? 'Questionnaire fully submitted'
                      : `${qState.completedSections.length} of ${totalSections} sections completed`}
                  </p>
                  {qState.lastSaved && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last saved: {new Date(qState.lastSaved).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Section checklist */}
              <div className="space-y-2">
                {QUESTIONNAIRE_SECTIONS.map((section, idx) => {
                  const isCompleted = qState.completedSections.includes(idx)
                  const answeredQs = section.questions.filter(q => {
                    const v = qState.answers[q.id]
                    return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
                  })
                  const isCurrent = !isCompleted && answeredQs.length > 0
                  return (
                    <div
                      key={section.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer
                        ${isCompleted ? 'bg-green-50 border-green-200' : isCurrent ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}
                      onClick={() => { setExpandedSection(expandedSection === idx ? null : idx); setTab('answers') }}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                        ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isCompleted ? 'text-green-800' : isCurrent ? 'text-amber-800' : 'text-gray-400'}`}>
                          {section.title}
                        </p>
                        <p className="text-xs text-gray-400">{answeredQs.length}/{section.questions.length} questions answered</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0
                        ${isCompleted ? 'bg-green-100 text-green-700' : isCurrent ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                        {isCompleted ? 'Done' : isCurrent ? 'In Progress' : 'Not Started'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Answers tab ── */}
          {tab === 'answers' && (
            <div className="p-5">
              {!hasAnyAnswers ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-gray-500 text-sm">No answers yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {QUESTIONNAIRE_SECTIONS.map((section, idx) => {
                    const filled = section.questions.filter(q => {
                      const v = qState.answers[q.id]
                      return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
                    })
                    if (!filled.length) return null
                    const isCompleted = qState.completedSections.includes(idx)
                    const isOpen = expandedSection === idx

                    return (
                      <div key={section.id} className="border border-gray-100 rounded-xl overflow-hidden">
                        {/* Section header — clickable to expand */}
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                          onClick={() => setExpandedSection(isOpen ? null : idx)}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                            ${isCompleted ? 'bg-green-500 text-white' : 'bg-amber-400 text-white'}`}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <span className="flex-1 text-sm font-semibold text-black">{section.title}</span>
                          <span className="text-xs text-gray-400">{filled.length} answers</span>
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Section answers — collapsible */}
                        {isOpen && (
                          <div className="divide-y divide-gray-50">
                            {filled.map(q => {
                              const val = qState.answers[q.id]
                              const display = Array.isArray(val)
                                ? val.map(v => `• ${v}`).join('\n')
                                : val === 'yes' ? '✓ Yes' : val === 'no' ? '✗ No' : String(val)
                              return (
                                <div key={q.id} className="px-4 py-3">
                                  <p className="text-xs text-gray-400 mb-1">{q.label}</p>
                                  <p className="text-sm text-gray-800 whitespace-pre-line font-medium">{display}</p>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Documents tab ── */}
          {tab === 'documents' && (
            <div className="p-5">
              {documents.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">📁</p>
                  <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc, i) => {
                    const d = doc as UploadedDocument & { id?: number; hasFile?: boolean }
                    return (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="w-9 h-9 bg-gold/10 rounded-lg flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                        <p className="text-xs text-gray-400">{doc.category}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-xs text-gray-400">
                          {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {d.hasFile && d.id && (
                          <a
                            href={`/api/documents/${d.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 bg-gold text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-gold-dark transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

const CASE_TYPES = [
  'Wage & Hour',
  'Wrongful Termination',
  'Harassment / Discrimination',
  'Retaliation',
  'FMLA / Leave Violation',
  'Other',
]

// ─── Add Client Modal ─────────────────────────────────────────────────────────
function AddClientModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [caseType, setCaseType] = useState(CASE_TYPES[0])
  const [error, setError] = useState('')

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(formatPhone(digits))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (!name.trim()) { setError('Name is required.'); return }
    if (digits.length < 7) { setError('Enter a valid phone number.'); return }

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': MOCK_ADMIN_PASSWORD },
      body: JSON.stringify({ name: name.trim(), phone: digits, caseType }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to add client.'); return }
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-black px-5 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold">Add New Client</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Client Name</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Full name"
              className="input-field"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(310) 555-0000"
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-1">This is what the client will use to log in.</p>
          </div>
          <div>
            <label className="label">Case Type</label>
            <select
              value={caseType}
              onChange={e => setCaseType(e.target.value)}
              className="input-field appearance-none bg-white"
            >
              {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-semibold text-sm hover:border-gray-300 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-3 bg-gold text-white rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors">
              Add Client
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Notification Panel ───────────────────────────────────────────────────────
function NotificationPanel({ onClose }: { onClose: () => void }) {
  const notifications = getSubmissionNotifications()

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-black px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gold text-lg">🔔</span>
            <h3 className="text-white font-bold">Submission Notifications</h3>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-400 text-sm">No submissions yet.</p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="px-5 py-4 flex items-start gap-3">
                <div className="w-9 h-9 bg-gold/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-black">{n.clientName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.caseType}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.submittedAt).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full shrink-0">
                  Submitted
                </span>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<AdminClient | null>(null)
  const [clientData, setClientData] = useState<{ qState: QuestionnaireState; documents: UploadedDocument[] } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAddClient, setShowAddClient] = useState(false)
  const [allClients, setAllClients] = useState<AdminClient[]>([])
  const router = useRouter()

  const fetchClients = async () => {
    const res = await fetch('/api/admin/clients', {
      headers: { 'x-admin-key': MOCK_ADMIN_PASSWORD },
    })
    if (res.ok) {
      const { clients } = await res.json()
      setAllClients(clients ?? [])
    }
  }

  useEffect(() => {
    const isAuth = getAdminSession()
    setAuthenticated(isAuth)
    if (isAuth) {
      setUnreadCount(getUnreadNotificationCount())
      fetchClients()
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => {
    clearAdminSession()
    setAuthenticated(false)
  }

  const handleOpenNotifications = () => {
    setShowNotifications(true)
    markNotificationsRead()
    setUnreadCount(0)
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Remove this client? Their questionnaire data will also be deleted.')) return
    await fetch(`/api/admin/clients?id=${clientId}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': MOCK_ADMIN_PASSWORD },
    })
    fetchClients()
  }

  const handleViewClient = async (client: AdminClient) => {
    const [qRes, docsRes] = await Promise.all([
      fetch(`/api/admin/questionnaire?clientId=${client.id}`, { headers: { 'x-admin-key': MOCK_ADMIN_PASSWORD } }),
      fetch(`/api/admin/documents?clientId=${client.id}`, { headers: { 'x-admin-key': MOCK_ADMIN_PASSWORD } }),
    ])
    const { state } = await qRes.json()
    const { documents } = await docsRes.json()
    setClientData({
      qState: state ?? { answers: {}, completedSections: [], submitted: false, lastSaved: '' },
      documents: documents ?? [],
    })
    setSelectedClient(client)
  }

  const getStatus = (client: AdminClient) => {
    if (client.questionnaire.submitted) return { label: 'Submitted', cls: 'bg-green-100 text-green-700' }
    if (client.questionnaire.completedSections.length > 0) return { label: 'In Progress', cls: 'bg-amber-100 text-amber-700' }
    return { label: 'Not Started', cls: 'bg-gray-100 text-gray-500' }
  }

  if (loading) return null
  if (!authenticated) return <AdminLogin onLogin={() => { setAuthenticated(true); fetchClients() }} />

  const submitted = allClients.filter(c => c.questionnaire.submitted).length
  const inProgress = allClients.filter(c => !c.questionnaire.submitted && c.questionnaire.completedSections.length > 0).length
  const totalDocs = allClients.reduce((acc, c) => acc + c.documentCount, 0)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-black border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="866 JACK LAW" width={40} height={40} className="rounded-sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">JACKLAW</span>
                <span className="bg-gold text-white text-xs font-bold px-2 py-0.5 rounded">ADMIN</span>
              </div>
              <p className="text-white/40 text-xs">Internal Management Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              onClick={handleOpenNotifications}
              className="relative p-2 text-white/50 hover:text-white transition-colors"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gold text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-white/40 hover:text-white text-sm transition-colors hidden sm:block"
            >
              Portal ↗
            </button>
            <button
              onClick={handleLogout}
              className="text-white/40 hover:text-red-400 text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>


      <main className="flex-1 px-4 py-6 max-w-6xl mx-auto w-full">
        {/* New submission alert banner */}
        {unreadCount > 0 && (
          <button
            onClick={handleOpenNotifications}
            className="w-full mb-5 flex items-center gap-3 bg-gold/10 border border-gold/30 rounded-2xl px-5 py-4 text-left hover:bg-gold/15 transition-colors"
          >
            <span className="text-2xl">🔔</span>
            <div className="flex-1">
              <p className="font-semibold text-black text-sm">
                {unreadCount} new submission{unreadCount > 1 ? 's' : ''} since your last visit
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Tap to view details</p>
            </div>
            <svg className="w-5 h-5 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Client Overview</h1>
          <p className="text-gray-500 text-sm mt-1">{allClients.length} registered clients</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Clients', value: allClients.length, color: 'text-black' },
            { label: 'Submitted', value: submitted, color: 'text-green-600' },
            { label: 'In Progress', value: inProgress, color: 'text-amber-600' },
            { label: 'Documents', value: totalDocs, color: 'text-gold' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Client table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-black">Clients</h2>
              <p className="text-xs text-gray-400 mt-0.5">{allClients.length} registered</p>
            </div>
            <button
              onClick={() => setShowAddClient(true)}
              className="flex items-center gap-2 bg-gold text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gold-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Client
            </button>
          </div>

          {allClients.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">👤</p>
              <p className="text-gray-500 text-sm">No clients yet.</p>
              <button onClick={() => setShowAddClient(true)} className="mt-3 text-gold text-sm font-semibold hover:underline">
                Add your first client →
              </button>
            </div>
          )}

          {/* Mobile cards */}
          <div className="divide-y divide-gray-50 sm:hidden">
            {allClients.map(client => {
              const status = getStatus(client)
              const pct = client.questionnaire.submitted ? 100 : Math.round((client.questionnaire.completedSections.length / QUESTIONNAIRE_SECTIONS.length) * 100)
              return (
                <div key={client.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{client.name}</p>
                      <p className="text-xs text-gray-400">{client.caseType}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{pct}%</span>
                    <span className="text-xs text-gray-400">· {client.documentCount} docs</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewClient(client)}
                      className="flex-1 text-center text-sm font-medium text-gold hover:text-gold-dark transition-colors py-2 border border-gold/30 rounded-xl hover:bg-gold/5"
                    >
                      View Details →
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="px-3 py-2 border border-red-200 text-red-400 rounded-xl hover:bg-red-50 transition-colors"
                      aria-label="Delete client"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  {['Client', 'Case Type', 'Status', 'Progress', 'Docs', 'Last Active', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allClients.map(client => {
                  const status = getStatus(client)
                  const pct = client.questionnaire.submitted ? 100 : Math.round((client.questionnaire.completedSections.length / QUESTIONNAIRE_SECTIONS.length) * 100)

                  return (
                    <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">{client.name}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatPhone(client.phone)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700">{client.caseType}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-gray-700">{client.documentCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-400">
                          {client.questionnaire.lastSaved
                            ? new Date(client.questionnaire.lastSaved).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : new Date(client.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleViewClient(client)} className="text-gold hover:text-gold-dark text-sm font-semibold transition-colors">
                            View →
                          </button>
                          <button onClick={() => handleDeleteClient(client.id)} className="text-gray-300 hover:text-red-400 transition-colors" aria-label="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          JACKLAW Admin Panel · All client data is attorney-client privileged · Internal use only
        </p>
      </main>

      {/* Add client modal */}
      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onAdded={fetchClients}
        />
      )}

      {/* Notification panel */}
      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}

      {/* Client detail modal */}
      {selectedClient && clientData && (
        <ClientDetailModal
          client={selectedClient}
          qState={clientData.qState}
          documents={clientData.documents}
          onClose={() => { setSelectedClient(null); setClientData(null) }}
        />
      )}
    </div>
  )
}
