'use client'

/**
 * Admin → Cases. The folder a client sits in.
 *
 * The office was writing a case name on each client one at a time, as free
 * text, which labelled a person rather than grouping them: two clients on the
 * same case had to be spelled the same by hand, and correcting the name meant
 * editing every client on it. A folder is one row, so a rename is one write and
 * everyone in it follows.
 *
 * Deleting a folder never deletes anybody. The people in it land back in
 * Unassigned, which is a real place here rather than an error state — a client
 * can be added before anyone has decided which case they are on.
 */

import { useCallback, useEffect, useState } from 'react'
import { MOCK_ADMIN_PASSWORD } from '@/lib/mockData'
import { ClientWork, STATUS_LABEL, clientProgressPercent, clientStatus } from '@/lib/clientProgress'

export interface CaseFolder {
  id: string
  name: string
  clientCount: number
  createdAt?: string
  updatedAt?: string
}

/** What this panel needs of a client; the admin page's row is a superset. */
export interface PanelClient extends ClientWork {
  id: string
  name: string
  phone: string
  caseType: string
  caseFolderId: string | null
}

const KEY = { 'x-admin-key': MOCK_ADMIN_PASSWORD }
const JSON_KEY = { 'Content-Type': 'application/json', ...KEY }

/** The id used for the folder that is not a folder. */
const UNASSIGNED = '__unassigned__'

export default function CaseFoldersPanel({
  clients,
  onChanged,
}: {
  clients: PanelClient[]
  onChanged: () => void
}) {
  const [folders, setFolders] = useState<CaseFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/case-folders', { headers: KEY })
    if (res.ok) setFolders((await res.json()).folders ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Counts come from the clients the page already holds, so moving someone
  // shows up immediately instead of waiting for the folder list to be re-read.
  const countOf = (id: string) =>
    id === UNASSIGNED
      ? clients.filter(c => !c.caseFolderId).length
      : clients.filter(c => c.caseFolderId === id).length

  const refresh = () => { load(); onChanged() }

  const create = async () => {
    const name = newName.trim()
    if (!name) return
    setBusy(true); setError('')
    const res = await fetch('/api/admin/case-folders', {
      method: 'POST', headers: JSON_KEY, body: JSON.stringify({ name }),
    })
    setBusy(false)
    if (!res.ok) { setError((await res.json()).error ?? 'Could not create the case.'); return }
    setNewName(''); setCreating(false)
    refresh()
  }

  const rename = async (id: string, name: string) => {
    setError('')
    const res = await fetch('/api/admin/case-folders', {
      method: 'PATCH', headers: JSON_KEY, body: JSON.stringify({ id, name }),
    })
    if (!res.ok) { setError((await res.json()).error ?? 'Rename failed.'); load(); return }
    refresh()
  }

  const remove = async (folder: CaseFolder) => {
    const n = countOf(folder.id)
    const warning = n
      ? `Delete "${folder.name}"? The ${n} client${n === 1 ? '' : 's'} in it move to Unassigned — nobody is removed.`
      : `Delete "${folder.name}"?`
    if (!confirm(warning)) return
    setError('')
    const res = await fetch(`/api/admin/case-folders?id=${encodeURIComponent(folder.id)}`, {
      method: 'DELETE', headers: KEY,
    })
    if (!res.ok) { setError('Delete failed.'); return }
    if (openId === folder.id) setOpenId(null)
    refresh()
  }

  /**
   * Fold this case into another. The same employer arrived spelled several ways
   * because the case names it grew from were free text, and putting that right
   * by hand is move-every-client-then-delete.
   */
  const merge = async (from: CaseFolder, intoId: string) => {
    const into = folders.find(f => f.id === intoId)
    if (!into) return
    const n = countOf(from.id)
    if (!confirm(
      `Merge "${from.name}" into "${into.name}"?\n\n` +
      `${n === 1 ? '1 client moves' : `${n} clients move`} across and "${from.name}" is deleted. Nobody is removed.`
    )) return

    setError('')
    const res = await fetch('/api/admin/case-folders/merge', {
      method: 'POST', headers: JSON_KEY, body: JSON.stringify({ fromId: from.id, intoId }),
    })
    const body = await res.json()
    if (!res.ok) { setError(body.error ?? 'Merge failed.'); return }
    if (body.warning) setError(body.warning)
    setOpenId(intoId)
    refresh()
  }

  const move = async (clientId: string, caseFolderId: string | null) => {
    setError('')
    const res = await fetch('/api/admin/clients', {
      method: 'PATCH', headers: JSON_KEY, body: JSON.stringify({ id: clientId, caseFolderId }),
    })
    if (!res.ok) { setError((await res.json()).error ?? 'Could not move that client.'); return }
    refresh()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  const open = openId === UNASSIGNED
    ? { id: UNASSIGNED, name: 'Unassigned', clientCount: countOf(UNASSIGNED) }
    : folders.find(f => f.id === openId)

  if (open) {
    return (
      <FolderDetail
        folder={open}
        isUnassigned={open.id === UNASSIGNED}
        clients={clients}
        error={error}
        onBack={() => { setOpenId(null); setError('') }}
        onRename={rename}
        onMove={move}
        onMerge={merge}
        folders={folders}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {folders.length} case{folders.length === 1 ? '' : 's'} · {countOf(UNASSIGNED)} unassigned
        </p>
        <button
          onClick={() => { setCreating(true); setError('') }}
          className="flex items-center gap-2 bg-gold text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gold-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Case
        </button>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
      )}

      {creating && (
        <div className="mb-3 bg-white rounded-2xl border border-gold/30 p-4 shadow-sm">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5" htmlFor="new-case-name">
            Case name
          </label>
          <div className="flex gap-2">
            <input
              id="new-case-name"
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') create()
                if (e.key === 'Escape') { setCreating(false); setNewName(''); setError('') }
              }}
              placeholder="Smith v. Acme Corp"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30"
            />
            <button
              onClick={create}
              disabled={busy || !newName.trim()}
              className="px-4 py-2 rounded-xl bg-gold text-white text-sm font-semibold disabled:opacity-40 hover:bg-gold-dark transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => { setCreating(false); setNewName(''); setError('') }}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {folders.length === 0 && !creating && (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📁</p>
          <p className="text-gray-500 text-sm">No cases yet.</p>
          <button onClick={() => setCreating(true)} className="mt-3 text-gold text-sm font-semibold hover:underline">
            Create your first case →
          </button>
        </div>
      )}

      <div className="space-y-2">
        {folders.map(folder => (
          <FolderRow
            key={folder.id}
            folder={folder}
            count={countOf(folder.id)}
            onOpen={() => setOpenId(folder.id)}
            onRename={rename}
            onDelete={() => remove(folder)}
          />
        ))}

        {countOf(UNASSIGNED) > 0 && (
          <button
            onClick={() => setOpenId(UNASSIGNED)}
            className="w-full flex items-center gap-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-4 text-left hover:bg-gray-100 transition-colors"
          >
            <span className="text-xl">🗂️</span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-gray-600">Unassigned</span>
              <span className="block text-xs text-gray-400 mt-0.5">Not on a case yet</span>
            </span>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {countOf(UNASSIGNED)} client{countOf(UNASSIGNED) === 1 ? '' : 's'}
            </span>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── One folder in the list ───────────────────────────────────────────────────
function FolderRow({
  folder, count, onOpen, onRename, onDelete,
}: {
  folder: CaseFolder
  count: number
  onOpen: () => void
  onRename: (id: string, name: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-gold/40 transition-colors">
      <span className="text-xl">📁</span>

      <div className="flex-1 min-w-0">
        {editing ? (
          <NameInput
            value={folder.name}
            onCancel={() => setEditing(false)}
            onSave={name => { setEditing(false); if (name !== folder.name) onRename(folder.id, name) }}
          />
        ) : (
          <button onClick={onOpen} className="block w-full text-left">
            <span className="block font-semibold text-black truncate">{folder.name}</span>
            <span className="block text-xs text-gray-400 mt-0.5">
              {count} client{count === 1 ? '' : 's'}
            </span>
          </button>
        )}
      </div>

      {!editing && (
        <>
          <button
            onClick={() => setEditing(true)}
            title="Rename this case"
            aria-label={`Rename ${folder.name}`}
            className="p-2 rounded-lg text-gray-400 hover:text-gold hover:bg-gold/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            title="Delete this case"
            aria-label={`Delete ${folder.name}`}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22" />
            </svg>
          </button>
          <button onClick={onOpen} aria-label={`Open ${folder.name}`} className="p-2 text-gray-300 hover:text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}

/** Rename in place: Enter keeps it, Escape leaves the old name alone. */
function NameInput({
  value, onSave, onCancel,
}: {
  value: string
  onSave: (name: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(value)
  return (
    <input
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { const n = draft.trim(); n ? onSave(n) : onCancel() }}
      onKeyDown={e => {
        if (e.key === 'Enter') { const n = draft.trim(); n ? onSave(n) : onCancel() }
        if (e.key === 'Escape') onCancel()
      }}
      className="w-full px-2 py-1 rounded-lg border border-gold text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-gold/30"
    />
  )
}

// ─── Inside one folder ────────────────────────────────────────────────────────
function FolderDetail({
  folder, isUnassigned, clients, folders, error, onBack, onRename, onMove, onMerge,
}: {
  folder: CaseFolder
  isUnassigned: boolean
  clients: PanelClient[]
  folders: CaseFolder[]
  error: string
  onBack: () => void
  onRename: (id: string, name: string) => void
  onMove: (clientId: string, folderId: string | null) => void
  onMerge: (from: CaseFolder, intoId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)

  const inside = clients.filter(c =>
    isUnassigned ? !c.caseFolderId : c.caseFolderId === folder.id
  )
  const outside = clients.filter(c =>
    isUnassigned ? Boolean(c.caseFolderId) : c.caseFolderId !== folder.id
  )
  /** Every case this one could be folded into — itself excluded. */
  const others = folders.filter(f => f.id !== folder.id)

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-black mb-4 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All cases
      </button>

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-2xl">{isUnassigned ? '🗂️' : '📁'}</span>
          <div className="min-w-0 flex-1">
            {editing && !isUnassigned ? (
              <NameInput
                value={folder.name}
                onCancel={() => setEditing(false)}
                onSave={name => { setEditing(false); if (name !== folder.name) onRename(folder.id, name) }}
              />
            ) : (
              <h2 className="text-xl font-bold text-black truncate">{folder.name}</h2>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {inside.length} client{inside.length === 1 ? '' : 's'}
              {isUnassigned && ' · not on a case yet'}
            </p>
          </div>
          {!isUnassigned && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-gold hover:underline whitespace-nowrap"
            >
              Rename
            </button>
          )}
        </div>

        {!isUnassigned && (
          <div className="flex items-center gap-2">
            {others.length > 0 && (
              <select
                value=""
                onChange={e => { const id = e.target.value; e.target.value = ''; if (id) onMerge(folder, id) }}
                aria-label="Merge this case into another"
                title="Fold this case into another one"
                className="text-xs border border-gray-200 rounded-xl px-2 py-2 text-gray-600 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30"
              >
                <option value="">Merge into…</option>
                {others.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            )}
            <button
              onClick={() => setAdding(a => !a)}
              className="bg-gold text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gold-dark transition-colors whitespace-nowrap"
            >
              {adding ? 'Done' : 'Add client'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
      )}

      {adding && !isUnassigned && (
        <div className="mb-4 bg-white rounded-2xl border border-gold/30 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            Add a client to this case
            {outside.some(c => c.caseFolderId) && ' — one already on another case moves here'}
          </p>
          {outside.length === 0 ? (
            <p className="text-sm text-gray-400">Every client is already on this case.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {outside.map(c => (
                <div key={c.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {c.caseType}
                      {c.caseFolderId && ` · on ${folders.find(f => f.id === c.caseFolderId)?.name ?? 'another case'}`}
                    </p>
                  </div>
                  <button
                    onClick={() => onMove(c.id, folder.id)}
                    className="text-xs font-semibold text-gold hover:underline whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {inside.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-gray-500 text-sm">
            {isUnassigned ? 'Everyone is on a case.' : 'No clients on this case yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {inside.map(c => {
            const status = STATUS_LABEL[clientStatus(c)]
            const pct = clientProgressPercent(c)
            return (
              <div key={c.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{c.caseType}</p>
                  <div className="flex items-center gap-2 mt-2 max-w-xs">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-gold'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{pct}%</span>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${status.cls}`}>
                  {status.label}
                </span>
                {isUnassigned ? (
                  <MoveInto folders={folders} onPick={id => onMove(c.id, id)} />
                ) : (
                  <button
                    onClick={() => onMove(c.id, null)}
                    className="text-xs font-semibold text-gray-400 hover:text-red-600 whitespace-nowrap transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** From Unassigned, the useful action is picking where someone belongs. */
function MoveInto({ folders, onPick }: { folders: CaseFolder[]; onPick: (id: string) => void }) {
  if (folders.length === 0) {
    return <span className="text-xs text-gray-300 whitespace-nowrap">No cases yet</span>
  }
  return (
    <select
      value=""
      onChange={e => e.target.value && onPick(e.target.value)}
      aria-label="Move to a case"
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30"
    >
      <option value="">Move to…</option>
      {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>
  )
}
