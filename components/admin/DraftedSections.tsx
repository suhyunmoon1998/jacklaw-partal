'use client'

/**
 * The model-written sections, shown as what they are.
 *
 * Every sentence prints with the fact ids it rests on, so a reader can check it
 * in the ledger without asking anyone. An inference is marked as one. A
 * sentence that failed a check is struck through with the reason under it —
 * kept visible rather than removed, because a draft that silently loses a
 * sentence reads as complete when it is not.
 */

import { CheckedSection, DRAFT_KEYS, DRAFT_SECTIONS, DraftKey, StoredDraft } from '@/lib/briefDraftShape'

export function DraftedParagraphs({ section }: { section: CheckedSection }) {
  return (
    <>
      {section.paragraphs.map((p, i) => (
        <p key={i} className="text-[15px] leading-[1.8] text-gray-800 mb-3">
          {p.sentences.map((s, j) => (
            <span key={j}>
              {s.problems.length ? (
                <span className="bg-red-50 print:bg-white">
                  <span className="line-through decoration-red-500 text-gray-500">{s.text}</span>
                  <span className="block font-sans text-[11px] text-red-700 mb-1">
                    {s.problems.join(' ')}
                  </span>
                </span>
              ) : (
                <span className={s.inference ? 'italic' : ''}>{s.text}</span>
              )}
              <sup className="font-sans text-[9px] text-gray-400 ml-0.5">
                {[...s.facts, ...s.authority].join(', ')}
                {s.inference ? ' · inference' : ''}
              </sup>{' '}
            </span>
          ))}
        </p>
      ))}
    </>
  )
}

export default function DraftedSections({
  draft,
  stale,
  keys,
  busy,
  error,
  onWrite,
}: {
  draft: StoredDraft | null
  stale: boolean
  /** Which sections this sheet shows. */
  keys: DraftKey[]
  busy?: boolean
  error?: string
  /** Absent, the sheet only shows; present, it offers to write. */
  onWrite?: () => void
}) {
  const sections = keys.map(k => ({ key: k, meta: DRAFT_SECTIONS[k], section: draft?.sections.find(s => s.key === k) ?? null }))
  const skipped = draft?.notWritten.filter(n => (keys as string[]).includes(n.key)) ?? []
  // Sections the model returned under a key no sheet shows — said, not lost.
  const setAside = draft?.notWritten.filter(n => !(DRAFT_KEYS as string[]).includes(n.key)) ?? []

  return (
    <div className="mx-auto w-full max-w-[52rem] bg-white sm:shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)] sm:rounded-sm px-6 sm:px-14 py-8 sm:py-10 my-6 print:shadow-none print:max-w-none font-serif print:break-before-page">
      <div className="flex items-start gap-3 border-b border-gray-200 pb-4">
        <div className="min-w-0">
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-red-700">
            Draft — written by a model, not by the office. Check every line.
          </p>
          <p className="font-sans text-[12px] text-gray-500 mt-1">
            {draft
              ? `${new Date(draft.writtenAt).toLocaleString()} · ${draft.counts.sentences} sentences, ${draft.counts.flagged} flagged · ${draft.model}`
              : 'No draft has been written for this client.'}
          </p>
          {stale && (
            <p className="font-sans text-[12px] text-amber-700 mt-1">
              What this draft was written from has changed since. It describes the earlier version.
            </p>
          )}
        </div>
        {onWrite && (
          <button
            onClick={onWrite}
            disabled={busy}
            className="print:hidden ml-auto shrink-0 font-sans text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
            title="Calls the model once. Takes a minute or two and costs money."
          >
            {busy ? 'Writing…' : draft ? 'Write a new draft' : 'Write a draft'}
          </button>
        )}
      </div>
      {error && <p className="font-sans text-[12px] text-red-600 mt-3">{error}</p>}

      {draft &&
        sections.map(({ key, meta, section }) => (
          <section key={key}>
            <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 mt-8 mb-3">
              {meta.n}. {meta.title}
            </h3>
            {section ? (
              <DraftedParagraphs section={section} />
            ) : (
              <p className="text-[14px] text-gray-400 italic">
                {skipped.find(s => s.key === key)?.why ?? 'Not written.'}
              </p>
            )}
          </section>
        ))}
      {setAside.length > 0 && (
        <p className="font-sans text-[12px] text-gray-500 mt-6">
          Set aside: {setAside.map(n => n.why).join(' ')}
        </p>
      )}
    </div>
  )
}
