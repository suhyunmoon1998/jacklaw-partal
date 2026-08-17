'use client'

/**
 * Admin → Question Sets. Manages the reusable templates only; who they were
 * assigned to lives on each client's profile.
 */

import { useCallback, useEffect, useState } from 'react'
import { MOCK_ADMIN_PASSWORD } from '@/lib/mockData'
import { QuestionSet } from '@/types'
import QuestionSetEditor from './QuestionSetEditor'

export default function QuestionSetsPanel({ onChanged }: { onChanged?: () => void }) {
  const [sets, setSets] = useState<QuestionSet[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{ id: string | null } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/question-sets', {
      headers: { 'x-admin-key': MOCK_ADMIN_PASSWORD },
    })
    if (res.ok) {
      const { sets } = await res.json()
      setSets(sets ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const refresh = () => { load(); onChanged?.() }

  const handleDuplicate = async (set: QuestionSet) => {
    setBusy(set.id)
    await fetch(`/api/admin/question-sets/${set.id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': MOCK_ADMIN_PASSWORD },
      body: JSON.stringify({}),
    })
    setBusy(null)
    refresh()
  }

  const handleDelete = async (set: QuestionSet) => {
    if (!confirm(`Remove "${set.name}"?\n\nIf it has already been assigned to a client it will be archived instead, so their answers stay intact.`)) return
    setBusy(set.id)
    const res = await fetch(`/api/admin/question-sets/${set.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': MOCK_ADMIN_PASSWORD },
    })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    if (body.archived) {
      alert(`"${set.name}" is archived — it is assigned to ${body.assignments} client${body.assignments === 1 ? '' : 's'}, and those assignments still work.`)
    }
    refresh()
  }

  const handleRestore = async (set: QuestionSet) => {
    setBusy(set.id)
    await fetch(`/api/admin/question-sets/${set.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': MOCK_ADMIN_PASSWORD },
      body: JSON.stringify({ status: 'active' }),
    })
    setBusy(null)
    refresh()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <div key={i} className="animate-shimmer h-24 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-black">Question Sets</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {sets.filter(s => s.status === 'active').length} active · reusable across clients
            </p>
          </div>
          <button
            onClick={() => setEditing({ id: null })}
            className="flex items-center gap-2 bg-gold text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gold-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Question Set
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {sets.map(set => {
            const badge = set.isDefault
              ? { label: 'Default', cls: 'bg-blue-100 text-blue-700' }
              : set.status === 'archived'
              ? { label: 'Archived', cls: 'bg-gray-100 text-gray-400' }
              : { label: 'Active', cls: 'bg-green-100 text-green-700' }

            return (
              <div key={set.id} className={`px-6 py-4 flex items-start gap-4 ${busy === set.id ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{set.name}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {set.questionCount} question{set.questionCount === 1 ? '' : 's'}
                  </p>
                  {set.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{set.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!set.isDefault && (
                    <button
                      onClick={() => setEditing({ id: set.id })}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDuplicate(set)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-700 hover:text-white transition-colors"
                    title={set.isDefault ? 'Make an editable copy of the built-in questionnaire' : 'Duplicate'}
                  >
                    Duplicate
                  </button>
                  {!set.isDefault && (
                    set.status === 'archived' ? (
                      <button
                        onClick={() => handleRestore(set)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-colors"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(set)}
                        className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                        aria-label="Archive or delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3 px-1">
        The default onboarding questionnaire is built into the portal, so it is shown here for reference and can be
        duplicated, but not edited or deleted. Assign sets to a client from their profile.
      </p>

      {editing && (
        <QuestionSetEditor
          setId={editing.id}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh() }}
        />
      )}
    </>
  )
}
