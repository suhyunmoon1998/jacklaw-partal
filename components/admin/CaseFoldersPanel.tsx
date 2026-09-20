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
import { formatPhone } from '@/lib/auth'
import { ModuleId, moduleById } from '@/lib/modules'
import { LANGUAGES, LANG_ENGLISH_NAME } from '@/lib/langs'
import { ModuleProgress, ModuleSend, stepViews } from '@/lib/moduleSteps'

export interface CaseFolder {
  id: string
  name: string
  /** Free-text name tags — what the office calls this case. */
  tags: string[]
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
  caseName: string
  caseFolderId: string | null
  /** This client's own name tags, on top of whatever the case carries. */
  tags: string[]
  /** The language the portal writes to them in; empty until one is known. */
  portalLang: string
  documentCount: number
  createdAt: string
  questionnaire: { submitted: boolean; completedSections: number[]; lastSaved: string }
  /** Which steps have been handed over, and how far each one has got. */
  moduleSends: Partial<Record<ModuleId, ModuleSend>>
  moduleProgress: Partial<Record<ModuleId, ModuleProgress>>
}

/**
 * What can be done to one client from inside a case.
 *
 * These are the admin page's own handlers, passed down rather than
 * reimplemented: opening a client is what leads to the questionnaires, the
 * answers, the documents and sending Module 1, 2 and 3, and there should be
 * exactly one of each of those in the codebase.
 */
export interface ClientActions<C extends PanelClient = PanelClient> {
  onView: (client: C) => void
  /** Opens the same window at the AI reading of this client's answers. */
  onAnalyze: (client: C) => void
  onShare: (client: C) => void
  onPrint: (client: C) => void
  onDelete: (clientId: string) => void
  /** Opens the add-client dialog, already filed into this case. */
  onAddClient: (folderId: string | null) => void
  onRetagClient: (clientId: string, tags: string[]) => void
  onSetLang: (clientId: string, lang: string) => void
}

const KEY = { 'x-admin-key': MOCK_ADMIN_PASSWORD }
const JSON_KEY = { 'Content-Type': 'application/json', ...KEY }

/** The id used for the folder that is not a folder. */
const UNASSIGNED = '__unassigned__'

export default function CaseFoldersPanel<C extends PanelClient>({
  clients,
  onChanged,
  ...actions
}: {
  clients: C[]
  onChanged: () => void
} & ClientActions<C>) {
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

  const retag = async (id: string, tags: string[]) => {
    setError('')
    // Shown before it is saved: typing a tag and watching it sit still reads as
    // the click not having worked.
    setFolders(fs => fs.map(f => (f.id === id ? { ...f, tags } : f)))
    const res = await fetch('/api/admin/case-folders', {
      method: 'PATCH', headers: JSON_KEY, body: JSON.stringify({ id, tags }),
    })
    if (!res.ok) { setError((await res.json()).error ?? 'Could not save the tags.'); load(); return }
    load()
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
    ? { id: UNASSIGNED, name: 'Unassigned', tags: [], clientCount: countOf(UNASSIGNED) }
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
        onRetag={retag}
        folders={folders}
        actions={actions}
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

      {/* Three across on a desktop, two on a tablet, one on a phone. The office
          scans this list to find a case by name, and a single column put eleven
          of them below the fold on a laptop. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

// ─── One folder in the grid ──────────────────────────────────────────────────
/**
 * A case as a card rather than a row.
 *
 * It was a row: icon, name, then three icon buttons pushed to the right edge.
 * At a third of the width those buttons and the name fight for the same space
 * and the tags wrap into the gap. So the name and count own the card, and the
 * two things you rarely do — rename, delete — sit small at the top, out of the
 * way of the thing you always do, which is open it.
 */
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
    <div className="relative bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-gold/40 transition-colors">
      {!editing && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5">
          <button
            onClick={() => setEditing(true)}
            title="Rename this case"
            aria-label={`Rename ${folder.name}`}
            className="p-1.5 rounded-lg text-gray-300 hover:text-gold hover:bg-gold/10 transition-colors"
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
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22" />
            </svg>
          </button>
        </div>
      )}

      <span className="text-xl block mb-2">📁</span>

      {editing ? (
        <NameInput
          value={folder.name}
          onCancel={() => setEditing(false)}
          onSave={name => { setEditing(false); if (name !== folder.name) onRename(folder.id, name) }}
        />
      ) : (
        <button onClick={onOpen} className="block w-full text-left">
          {/* Two lines, then an ellipsis. A long case name must not push the
              card taller than the ones beside it. */}
          <span className="block font-semibold text-black leading-snug line-clamp-2 pr-2">
            {folder.name}
          </span>
          <span className="block text-xs text-gray-400 mt-1">
            {count} client{count === 1 ? '' : 's'}
          </span>
        </button>
      )}

      {!editing && folder.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {folder.tags.map(tag => (
            <span key={tag} className="text-[10px] font-semibold text-gold bg-gold/10 border border-gold/20 rounded px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
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
function FolderDetail<C extends PanelClient>({
  folder, isUnassigned, clients, folders, error, onBack, onRename, onMove, onMerge, onRetag, actions,
}: {
  folder: CaseFolder
  isUnassigned: boolean
  clients: C[]
  folders: CaseFolder[]
  error: string
  onBack: () => void
  onRename: (id: string, name: string) => void
  onMove: (clientId: string, folderId: string | null) => void
  onMerge: (from: CaseFolder, intoId: string) => void
  onRetag: (id: string, tags: string[]) => void
  actions: ClientActions<C>
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
            {!isUnassigned && (
              <TagEditor tags={folder.tags} onChange={tags => onRetag(folder.id, tags)} />
            )}
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
            <button
              onClick={() => actions.onAddClient(folder.id)}
              className="border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              + New client
            </button>
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
              {adding ? 'Done' : 'Move someone here'}
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
          {!isUnassigned && (
            <button
              onClick={() => actions.onAddClient(folder.id)}
              className="mt-3 text-gold text-sm font-semibold hover:underline"
            >
              Add the first client →
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {inside.map(c => {
            const status = STATUS_LABEL[clientStatus(c)]
            const last = c.questionnaire.lastSaved || c.createdAt
            return (
              <div key={c.id} className="group flex items-center gap-4 p-4 hover:bg-gray-50/70 transition-colors">
                <button onClick={() => actions.onView(c)} className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {[c.caseType, formatPhone(c.phone)].filter(Boolean).join(' · ')}
                  </p>
                  <ModuleBars client={c} />
                </button>

                {/* Their own, not the case's: two people on one matter do not
                    always have the same claim. */}
                <div
                  className="hidden xl:block w-48 shrink-0"
                  onClick={e => e.stopPropagation()}
                >
                  <TagEditor
                    tags={c.tags}
                    onChange={tags => actions.onRetagClient(c.id, tags)}
                    placeholder="Retaliation"
                  />
                  {/* Reminders go out in this. Unset means the portal guesses
                      from their own answers, and falls back to English. */}
                  <select
                    value={c.portalLang}
                    onChange={e => actions.onSetLang(c.id, e.target.value)}
                    aria-label={`Language for ${c.name}`}
                    title="The language texts and calls go out in"
                    className={`mt-1.5 text-[10px] rounded-md px-1.5 py-0.5 border focus:outline-none focus:border-gold ${
                      c.portalLang
                        ? 'border-gray-200 text-gray-600'
                        : 'border-dashed border-amber-300 text-amber-700 bg-amber-50'
                    }`}
                  >
                    <option value="">Language: not set</option>
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{LANG_ENGLISH_NAME[l.code]}</option>
                    ))}
                  </select>
                </div>

                <span className="hidden lg:block text-xs text-gray-400 whitespace-nowrap w-20 text-right">
                  {c.documentCount} doc{c.documentCount === 1 ? '' : 's'}
                </span>
                <span className="hidden lg:block text-xs text-gray-400 whitespace-nowrap w-16 text-right">
                  {last ? new Date(last).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${status.cls}`}>
                  {status.label}
                </span>

                <div className="flex items-center gap-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  {/* Their answers read against California wage-and-hour law.
                      Next to Open because it is a way into the same window —
                      one that starts with what the answers add up to rather
                      than with how much of the form is filled in. */}
                  <button
                    onClick={() => actions.onAnalyze(c)}
                    title="Read these answers against California law"
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-colors"
                  >
                    Analyze
                  </button>
                  <button
                    onClick={() => actions.onShare(c)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    Share
                  </button>
                  <button
                    onClick={() => actions.onPrint(c)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    Print
                  </button>
                  {/* Where the questionnaires, the answers, the documents and
                      sending Module 1, 2 and 3 all live. */}
                  <button
                    onClick={() => actions.onView(c)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold hover:text-white transition-colors"
                  >
                    Open →
                  </button>
                  {isUnassigned ? (
                    <MoveInto folders={folders} onPick={id => onMove(c.id, id)} />
                  ) : (
                    <button
                      onClick={() => onMove(c.id, null)}
                      title="Take off this case — the client is not deleted"
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    onClick={() => actions.onDelete(c.id)}
                    aria-label={`Delete ${c.name}`}
                    title="Delete this client and everything on file for them"
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * One bar per step, rather than one bar for the client.
 *
 * A single figure read 100% both for somebody who finished the intake and was
 * never sent anything else, and for somebody who finished all three — which is
 * the difference the office is actually looking for. The state comes from
 * stepViews(), the same function the client's own dashboard uses, so the two
 * screens cannot disagree about what is done.
 *
 * A step nobody sent is drawn as not sent, not as 0%: the client is not behind
 * on something they were never given. Module 3 has not been built yet, so it
 * says so instead of showing an empty bar that reads as a failure.
 */
function ModuleBars({ client }: { client: PanelClient }) {
  const steps = stepViews(client.moduleSends, client.moduleProgress)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
      {steps.map(step => {
        const built = moduleById(step.id)?.built ?? false
        const sent = Boolean(client.moduleSends[step.id])
        const done = step.percent === 100

        return (
          <div key={step.id} className="flex items-center gap-1.5 w-40">
            <span className="text-[10px] font-semibold text-gray-400 w-5 shrink-0">
              M{step.step}
            </span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              {built && sent && (
                <div
                  className={`h-full rounded-full ${done ? 'bg-green-500' : 'bg-gold'}`}
                  style={{ width: `${step.percent}%` }}
                />
              )}
            </div>
            <span className="text-[10px] text-gray-400 whitespace-nowrap w-14 shrink-0">
              {!built ? 'not built' : !sent ? 'not sent' : `${step.percent}%`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * The name tags on a case, editable in place.
 *
 * Free text rather than a fixed list: the point is a label the office
 * recognises, and a list somebody has to maintain goes stale the first time a
 * matter does not fit it. The tags already in use are offered as suggestions so
 * the same idea does not end up spelled three ways.
 */
function TagEditor({
  tags,
  onChange,
  placeholder = 'Wage & Hour',
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  const add = () => {
    const tag = draft.trim().replace(/\s+/g, ' ')
    setDraft('')
    if (!tag) { setAdding(false); return }
    if (tags.some(t => t.toLowerCase() === tag.toLowerCase())) { setAdding(false); return }
    onChange([...tags, tag])
    setAdding(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {tags.map(tag => (
        <span
          key={tag}
          className="group/tag flex items-center gap-1 text-[11px] font-semibold text-gold bg-gold/10 border border-gold/20 rounded-md pl-2 pr-1 py-0.5"
        >
          {tag}
          <button
            onClick={() => onChange(tags.filter(t => t !== tag))}
            aria-label={`Remove tag ${tag}`}
            className="text-gold/50 hover:text-red-600 transition-colors leading-none text-sm"
          >
            ×
          </button>
        </span>
      ))}

      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={add}
          onKeyDown={e => {
            if (e.key === 'Enter') add()
            if (e.key === 'Escape') { setDraft(''); setAdding(false) }
          }}
          placeholder={placeholder}
          className="text-[11px] w-32 px-2 py-0.5 rounded-md border border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-[11px] font-semibold text-gray-400 hover:text-gold border border-dashed border-gray-300 hover:border-gold rounded-md px-2 py-0.5 transition-colors"
        >
          + tag
        </button>
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
