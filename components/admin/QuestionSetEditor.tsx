'use client'

/**
 * Build or edit one reusable question set.
 *
 * Questions use the same shape the portal already renders (id, label, type,
 * options, showIf), so anything built here behaves like the default
 * questionnaire — including skip logic.
 */

import { useEffect, useState } from 'react'
import { MOCK_ADMIN_PASSWORD } from '@/lib/mockData'
import { Question, QuestionSetDetail, QuestionType } from '@/types'
import { LANGUAGES, TRANSLATED_LANGS, TranslatedLang } from '@/lib/langs'
import { machineTranslate } from '@/lib/machineTranslate'
import type { RecommendedBank } from '@/lib/recommendedQuestions'

/** The non-English languages, in the order the tabs show them. */
const TRANSLATION_TABS = LANGUAGES.filter(l => l.code !== 'en') as {
  code: TranslatedLang
  label: string
  short: string
}[]

const TYPE_LABELS: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'yes_no_unsure', label: 'Yes / No / Not sure' },
  { value: 'select', label: 'Choose one' },
  { value: 'multiselect', label: 'Choose many' },
  { value: 'date', label: 'Date' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
]

const NEEDS_OPTIONS: QuestionType[] = ['select', 'multiselect']

/** A set name as it would read in each language, so the field shows its shape. */
const NAME_PLACEHOLDER: Record<TranslatedLang, string> = {
  es: 'p. ej. Quién es Quién',
  zh: '例如：谁是谁',
  ko: '예: 관련자 확인',
}

/**
 * Language picker shared by the set name and every question panel, so the
 * editor is only ever writing one language at a time and the Draft button has
 * an unambiguous target. `done` marks the languages already filled in.
 */
function LangTabs({
  value,
  onChange,
  done,
}: {
  value: TranslatedLang
  onChange: (lang: TranslatedLang) => void
  done: TranslatedLang[]
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {TRANSLATION_TABS.map(tab => {
        const selected = tab.code === value
        return (
          <button
            key={tab.code}
            type="button"
            onClick={() => onChange(tab.code)}
            aria-pressed={selected}
            title={tab.label}
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
              selected
                ? 'bg-gold text-white border-gold'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gold/50 hover:text-gold'
            }`}
          >
            {tab.short}
            {done.includes(tab.code) && <span className={selected ? 'text-white/80' : 'text-blue-500'}> ✓</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Local editing shape — a stable key so React rows do not jump while typing. */
interface Draft extends Question {
  key: string
}

let keySeq = 0
const nextKey = () => `draft-${++keySeq}`

/**
 * Answers are filed under the question id, and skip logic points at it, so a
 * new question gets its id here rather than at save time — otherwise a showIf
 * written in this editor would reference an id the server had not minted yet.
 */
const newQuestionId = () => `q_${++keySeq}_${Math.random().toString(36).slice(2, 7)}`

function toDraft(q: Question): Draft {
  return { ...q, key: nextKey() }
}

function blankDraft(): Draft {
  return { key: nextKey(), id: newQuestionId(), label: '', type: 'text' }
}

/**
 * Accepts either a JSON array of question objects (what an Eleanor-style
 * generator would produce) or one question label per line.
 */
function parsePasted(raw: string): Question[] {
  const text = raw.trim()
  if (!text) return []

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => (typeof item === 'string' ? { label: item, type: 'text' } : item))
        .filter(item => item && typeof item === 'object' && String(item.label ?? '').trim())
        .map(item => ({
          id: String(item.id ?? '').trim() || newQuestionId(),
          label: String(item.label).trim(),
          type: (TYPE_LABELS.some(t => t.value === item.type) ? item.type : 'text') as QuestionType,
          required: item.required === true || undefined,
          options: Array.isArray(item.options) ? item.options.map(String) : undefined,
          helpText: item.helpText ? String(item.helpText) : undefined,
          showIf: item.showIf?.questionId ? item.showIf : undefined,
        })) as Question[]
    }
  } catch {
    // Not JSON — fall through to line-per-question.
  }

  return text
    .split('\n')
    .map(line => line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim())
    .filter(Boolean)
    .map(label => ({ id: newQuestionId(), label, type: 'text' as QuestionType }))
}

export default function QuestionSetEditor({
  setId,
  onClose,
  onSaved,
}: {
  /** null creates a new set. */
  setId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [nameTranslations, setNameTranslations] = useState<Partial<Record<TranslatedLang, string>>>({})
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Draft[]>([])
  const [loading, setLoading] = useState(!!setId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasted, setPasted] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [banks, setBanks] = useState<RecommendedBank[] | null>(null)
  const [bankCaseType, setBankCaseType] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [transOpen, setTransOpen] = useState<Set<string>>(new Set())
  const [translating, setTranslating] = useState(false)
  /**
   * The language the editor is currently being written in. One shared tab
   * rather than one per question: staff translate a set a language at a time,
   * and the Draft button then has an unambiguous target.
   */
  const [transLang, setTransLang] = useState<TranslatedLang>('es')

  useEffect(() => {
    if (!setId) return
    fetch(`/api/admin/question-sets/${setId}`, { headers: { 'x-admin-key': MOCK_ADMIN_PASSWORD } })
      .then(async r => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok || !body?.set) throw new Error(body?.error ?? 'Could not load this question set.')
        const set = body.set as QuestionSetDetail
        setName(set.name)
        setNameTranslations(set.nameTranslations ?? {})
        setDescription(set.description)
        setQuestions(set.questions.map(toDraft))
      })
      // Opening blank on a failed load is how an existing set gets wiped: the
      // editor saves the whole list, so an empty form would replace real
      // questions with nothing. Saving stays blocked until it loads.
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Could not load this question set.'))
      .finally(() => setLoading(false))
  }, [setId])

  useEffect(() => {
    if (!suggestOpen || banks) return
    fetch('/api/admin/recommended-questions', { headers: { 'x-admin-key': MOCK_ADMIN_PASSWORD } })
      .then(r => r.json())
      .then(({ banks }: { banks: RecommendedBank[] }) => {
        setBanks(banks ?? [])
        setBankCaseType(prev => prev || banks?.[0]?.caseType || '')
      })
      .catch(() => setBanks([]))
  }, [suggestOpen, banks])

  const activeTab = TRANSLATION_TABS.find(t => t.code === transLang) ?? TRANSLATION_TABS[0]
  const translatedNames = TRANSLATED_LANGS.filter(l => nameTranslations[l]?.trim())

  const shownBanks = (banks ?? []).filter(b => b.caseType === bankCaseType)
  const caseTypes = Array.from(new Set((banks ?? []).map(b => b.caseType)))

  /** Adds the ticked questions, skipping any whose id is already in the set. */
  const addPicked = () => {
    const existing = new Set(questions.map(q => q.id))
    const chosen = shownBanks.flatMap(b => b.questions).filter(q => picked.has(q.id) && !existing.has(q.id))
    if (chosen.length === 0) return

    // A showIf pointing at a question the admin did not tick would never show,
    // so the condition is dropped rather than leaving a permanently hidden question.
    const added = new Set(chosen.map(q => q.id))
    const cleaned = chosen.map(q =>
      q.showIf && !added.has(q.showIf.questionId) && !existing.has(q.showIf.questionId)
        ? { ...q, showIf: undefined }
        : q
    )

    setQuestions(prev => [...prev, ...cleaned.map(toDraft)])
    setPicked(new Set())
    setSuggestOpen(false)

    // Naming the set is the next thing the admin would do anyway.
    const bank = shownBanks[0]
    if (bank && !name.trim()) setName(bank.setName)
    if (bank) {
      setNameTranslations(prev => {
        const next = { ...prev }
        for (const lang of TRANSLATED_LANGS) {
          if (!next[lang]?.trim() && bank.setNameTranslations[lang]) next[lang] = bank.setNameTranslations[lang]
        }
        return next
      })
    }
    if (bank && !description.trim()) setDescription(bank.description)
  }

  const update = (key: string, patch: Partial<Draft>) =>
    setQuestions(prev => prev.map(q => (q.key === key ? { ...q, ...patch } : q)))

  const updateTranslation = (
    key: string,
    lang: TranslatedLang,
    patch: Partial<NonNullable<Draft['es']>>
  ) =>
    setQuestions(prev =>
      prev.map(q => (q.key === key ? { ...q, [lang]: { ...(q[lang] ?? {}), ...patch } } : q))
    )

  /** Which languages a question already has a translated label in. */
  const translatedIn = (q: Draft) => TRANSLATION_TABS.filter(tab => q[tab.code]?.label?.trim())

  /**
   * Machine translation as a STARTING POINT only, into the language whose tab
   * is open. Staff review and correct it before the set goes out; nothing here
   * reaches a client unreviewed, because saving is still a deliberate click.
   *
   * Only empty fields are filled, so running it again after correcting a
   * translation never overwrites the corrected text.
   */
  const autoTranslate = async () => {
    setTranslating(true)
    const lang = transLang
    const draft = (text: string) => machineTranslate(text, 'en', lang)

    const filled = await Promise.all(
      questions.map(async q => {
        if (!q.label.trim()) return q
        const next = { ...(q[lang] ?? {}) }
        if (!next.label) next.label = (await draft(q.label)) || undefined
        if (q.helpText && !next.helpText) next.helpText = (await draft(q.helpText)) || undefined
        if (q.options?.length && !next.options?.length) {
          const opts = await Promise.all(q.options.map(o => draft(o)))
          // Options are matched to the English by position, so a partial result
          // would pair the wrong label with the wrong stored answer.
          if (opts.every(Boolean)) next.options = opts
        }
        return { ...q, [lang]: next }
      })
    )

    setQuestions(filled)
    setTranslating(false)
    setTransOpen(new Set(filled.map(q => q.key)))
  }

  const move = (index: number, delta: number) =>
    setQuestions(prev => {
      const next = [...prev]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const handleSave = async () => {
    if (loadError) return
    if (!name.trim()) { setError('Give the question set a name.'); return }
    const cleaned = questions.filter(q => q.label.trim())
    if (cleaned.length === 0) { setError('Add at least one question.'); return }

    setSaving(true)
    setError('')

    const payload = {
      name: name.trim(),
      nameTranslations,
      description: description.trim(),
      // Strip the editor-only React key before it reaches the API.
      questions: cleaned.map(q => ({ ...q, key: undefined })),
    }

    const res = await fetch(
      setId ? `/api/admin/question-sets/${setId}` : '/api/admin/question-sets',
      {
        method: setId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': MOCK_ADMIN_PASSWORD },
        body: JSON.stringify(payload),
      }
    )

    setSaving(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Could not save.')
      return
    }
    onSaved()
  }

  /**
   * Questions above this one that can actually gate another.
   *
   * Visibility is an equality test, so a multiselect — whose answer is a list —
   * can never match and would hide the dependent question from every client.
   */
  const priorQuestions = (index: number) =>
    questions.slice(0, index).filter(q => q.label.trim() && q.type !== 'multiselect')

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl animate-modal-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-black px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-white font-bold">{setId ? 'Edit Question Set' : 'Create Question Set'}</h3>
            <p className="text-white/40 text-xs mt-0.5">
              {questions.length} question{questions.length === 1 ? '' : 's'}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            <div className="animate-shimmer h-10 rounded-xl" />
            <div className="animate-shimmer h-24 rounded-xl" />
          </div>
        ) : loadError ? (
          <div className="p-8 text-center">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-sm text-gray-700">{loadError}</p>
            <p className="text-xs text-gray-400 mt-2">
              Nothing has been changed. Close this and try again.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Question Set Name</label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }}
                  placeholder="e.g. Who's Who"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="block text-xs font-semibold text-gray-500 shrink-0">
                    Name in <span className="text-gold">{activeTab.label}</span>
                    <span className="font-normal text-gray-400"> · optional</span>
                  </label>
                  <LangTabs value={transLang} onChange={setTransLang} done={translatedNames} />
                </div>
                <input
                  value={nameTranslations[transLang] ?? ''}
                  onChange={e =>
                    setNameTranslations(prev => ({ ...prev, [transLang]: e.target.value }))
                  }
                  placeholder={NAME_PLACEHOLDER[transLang]}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Internal Description</label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Only staff see this"
                  className="input-field"
                />
              </div>
            </div>

            {/* Questions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Questions</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setSuggestOpen(v => !v); setPasteOpen(false) }}
                    className="text-xs font-semibold text-gold hover:underline"
                  >
                    {suggestOpen ? 'Hide suggestions' : 'Suggested questions'}
                  </button>
                  <button
                    onClick={() => { setPasteOpen(v => !v); setSuggestOpen(false) }}
                    className="text-xs font-semibold text-gold hover:underline"
                  >
                    {pasteOpen ? 'Hide bulk paste' : 'Paste a list'}
                  </button>
                  <button
                    onClick={autoTranslate}
                    disabled={translating || questions.length === 0}
                    className="text-xs font-semibold text-gold hover:underline disabled:opacity-40"
                    title={`Fills the empty ${activeTab.label} fields with a machine translation for staff to correct`}
                  >
                    {translating ? 'Translating…' : `Draft ${activeTab.label}`}
                  </button>
                </div>
              </div>

              {suggestOpen && (
                <div className="mb-3 bg-gold/5 border border-gold/30 rounded-xl p-3">
                  {banks === null ? (
                    <div className="animate-shimmer h-20 rounded-lg" />
                  ) : banks.length === 0 ? (
                    <p className="text-xs text-gray-500">No suggestions available.</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2.5">
                        <label className="text-xs font-semibold text-gray-600 shrink-0">Case type</label>
                        <select
                          value={bankCaseType}
                          onChange={e => { setBankCaseType(e.target.value); setPicked(new Set()) }}
                          className="input-field text-sm py-2 flex-1"
                        >
                          {caseTypes.map(ct => (
                            <option key={ct} value={ct}>{ct === 'Any' ? 'Any case type' : ct}</option>
                          ))}
                        </select>
                      </div>

                      {shownBanks.map(bank => {
                        const ids = bank.questions.map(q => q.id)
                        const allPicked = ids.every(id => picked.has(id))
                        return (
                          <div key={bank.key} className="mb-3 last:mb-0">
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-black">{bank.setName}</p>
                                <p className="text-xs text-gray-500">{bank.description}</p>
                              </div>
                              <button
                                onClick={() =>
                                  setPicked(prev => {
                                    const next = new Set(prev)
                                    ids.forEach(id => (allPicked ? next.delete(id) : next.add(id)))
                                    return next
                                  })
                                }
                                className="text-xs font-semibold text-gold hover:underline shrink-0"
                              >
                                {allPicked ? 'Clear' : `Select all ${ids.length}`}
                              </button>
                            </div>

                            <div className="max-h-56 overflow-y-auto space-y-1 bg-white border border-gray-200 rounded-lg p-2">
                              {bank.questions.map(q => (
                                <label
                                  key={q.id}
                                  className="flex items-start gap-2 px-1.5 py-1 rounded hover:bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={picked.has(q.id)}
                                    onChange={e =>
                                      setPicked(prev => {
                                        const next = new Set(prev)
                                        if (e.target.checked) next.add(q.id)
                                        else next.delete(q.id)
                                        return next
                                      })
                                    }
                                    className="mt-0.5 w-4 h-4 accent-gold shrink-0"
                                  />
                                  <span className="min-w-0">
                                    <span className="block text-xs text-gray-800 leading-snug">{q.label}</span>
                                    {q.showIf && (
                                      <span className="block text-[10px] text-gray-400">follow-up question</span>
                                    )}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}

                      <button
                        onClick={addPicked}
                        disabled={picked.size === 0}
                        className="mt-1 bg-black text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40"
                      >
                        Add {picked.size} question{picked.size === 1 ? '' : 's'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {pasteOpen && (
                <div className="mb-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-2">
                    One question per line, or paste a JSON array of question objects (e.g. generated follow-ups).
                  </p>
                  <textarea
                    value={pasted}
                    onChange={e => setPasted(e.target.value)}
                    rows={5}
                    placeholder={'Who was your direct supervisor?\nWho witnessed the incident?'}
                    className="input-field resize-none text-sm"
                  />
                  <button
                    onClick={() => {
                      const added = parsePasted(pasted).map(toDraft)
                      if (added.length === 0) return
                      setQuestions(prev => [...prev, ...added])
                      setPasted('')
                      setPasteOpen(false)
                    }}
                    className="mt-2 bg-black text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Add questions
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={q.key} className="border border-gray-200 rounded-xl p-3 bg-white">
                    <div className="flex items-start gap-2">
                      <span className="mt-2.5 text-xs font-bold text-gray-300 tabular-nums w-5 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          value={q.label}
                          onChange={e => update(q.key, { label: e.target.value })}
                          placeholder="Question text the client sees"
                          className="input-field text-sm"
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={q.type}
                            onChange={e => update(q.key, { type: e.target.value as QuestionType })}
                            className="input-field text-sm py-2 w-auto"
                          >
                            {TYPE_LABELS.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>

                          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!!q.required}
                              onChange={e => update(q.key, { required: e.target.checked || undefined })}
                              className="w-4 h-4 accent-gold"
                            />
                            Required
                          </label>

                          <div className="ml-auto flex items-center gap-1">
                            <button
                              onClick={() => move(i, -1)}
                              disabled={i === 0}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                              aria-label="Move up"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => move(i, 1)}
                              disabled={i === questions.length - 1}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                              aria-label="Move down"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setQuestions(prev => prev.filter(x => x.key !== q.key))}
                              className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500"
                              aria-label="Remove question"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {NEEDS_OPTIONS.includes(q.type) && (
                          <input
                            value={(q.options ?? []).join(', ')}
                            onChange={e =>
                              update(q.key, {
                                options: e.target.value.split(',').map(o => o.trim()).filter(Boolean),
                              })
                            }
                            placeholder="Choices, separated by commas"
                            className="input-field text-sm"
                          />
                        )}

                        {/* Translations shown to clients who switch the portal language */}
                        {transOpen.has(q.key) ? (
                          <div className="space-y-2 bg-blue-50/60 border border-blue-200 rounded-lg p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <LangTabs
                                value={transLang}
                                onChange={setTransLang}
                                done={translatedIn(q).map(t => t.code)}
                              />
                              <button
                                onClick={() => setTransOpen(prev => { const n = new Set(prev); n.delete(q.key); return n })}
                                className="text-[11px] text-blue-600 hover:underline shrink-0"
                              >
                                Hide
                              </button>
                            </div>
                            <input
                              value={q[transLang]?.label ?? ''}
                              onChange={e => updateTranslation(q.key, transLang, { label: e.target.value || undefined })}
                              placeholder={`Question in ${activeTab.label}`}
                              className="input-field text-sm"
                            />
                            {q.helpText && (
                              <input
                                value={q[transLang]?.helpText ?? ''}
                                onChange={e => updateTranslation(q.key, transLang, { helpText: e.target.value || undefined })}
                                placeholder={`Help text in ${activeTab.label}`}
                                className="input-field text-xs"
                              />
                            )}
                            {NEEDS_OPTIONS.includes(q.type) && (
                              <>
                                <input
                                  value={(q[transLang]?.options ?? []).join(', ')}
                                  onChange={e => {
                                    const parts = e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                                    updateTranslation(q.key, transLang, { options: parts.length ? parts : undefined })
                                  }}
                                  placeholder={`Choices in ${activeTab.label}, separated by commas`}
                                  className="input-field text-xs"
                                />
                                {(q[transLang]?.options?.length ?? 0) > 0 &&
                                  q[transLang]!.options!.length !== (q.options?.length ?? 0) && (
                                    <p className="text-[11px] text-red-600">
                                      {q[transLang]!.options!.length} {activeTab.label} choices vs {q.options?.length ?? 0} English —
                                      they are matched in order, so the counts must agree or the translation is ignored.
                                    </p>
                                  )}
                              </>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setTransOpen(prev => new Set(prev).add(q.key))}
                            className={`text-xs hover:text-gold ${translatedIn(q).length ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}
                          >
                            {translatedIn(q).length
                              ? `✓ ${translatedIn(q).map(t => t.short).join(' · ')}`
                              : '+ Add translations'}
                          </button>
                        )}

                        {/* Skip logic — same showIf the default questionnaire uses */}
                        {q.showIf ? (
                          <div className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                            <span className="text-xs text-gray-500 shrink-0">Only show if</span>
                            <select
                              value={q.showIf.questionId}
                              onChange={e => update(q.key, { showIf: { ...q.showIf!, questionId: e.target.value } })}
                              className="input-field text-xs py-1.5 flex-1 min-w-[140px]"
                            >
                              <option value="">Choose a question…</option>
                              {priorQuestions(i).map(p => (
                                <option key={p.key} value={p.id}>{p.label.slice(0, 48)}</option>
                              ))}
                            </select>
                            <span className="text-xs text-gray-500">is</span>
                            <input
                              value={q.showIf.value}
                              onChange={e => update(q.key, { showIf: { ...q.showIf!, value: e.target.value } })}
                              placeholder="yes"
                              className="input-field text-xs py-1.5 w-24"
                            />
                            <button
                              onClick={() => update(q.key, { showIf: undefined })}
                              className="text-xs text-gray-400 hover:text-red-500"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          i > 0 && (
                            <button
                              onClick={() => update(q.key, { showIf: { questionId: '', value: 'yes' } })}
                              className="text-xs text-gray-400 hover:text-gold"
                            >
                              + Only show this if an earlier answer matches
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setQuestions(prev => [...prev, blankDraft()])}
                className="mt-3 w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-500 hover:border-gold hover:text-gold transition-colors"
              >
                + Add Question
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <p className="text-sm text-red-600 min-h-[1.25rem]">{error}</p>
          <div className="flex gap-2 shrink-0">
            <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-black transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !!loadError}
              className="bg-gold text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gold-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : setId ? 'Save Changes' : 'Create Question Set'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
