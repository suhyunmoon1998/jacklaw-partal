'use client'

/**
 * The record on paper, in the corpus's order — and not arguing.
 *
 * Core story, strongest proof, what cuts against, chronology, issue by issue,
 * evidence, Who's Who, damages facts, and what is still open (sec. 5). No
 * claim standings, no element states, no figures: a reader who wants to know
 * whether a claim stands reads the other sheet.
 *
 * Status is shown on every fact, because the difference between what a record
 * confirms and what the client remembers is the difference between a brief
 * somebody can rely on and one they have to re-derive.
 */

import { FactualBrief, LedgerFact } from '@/lib/factualBrief'
import { assumptionLog, evidenceStatusMap, submissionDigest } from '@/lib/submissionPackage'
// Types only: the module reads the questionnaire definitions, which this sheet has no use for.
import type { SearchRecord, SourceCategory } from '@/lib/sourceSearch'

const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 mt-10 mb-3 break-after-avoid">
    {children}
  </h3>
)

const Sub = ({ children }: { children: React.ReactNode }) => (
  <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 mt-5">
    {children}
  </p>
)

/** CONFIRMED · REPORTED · INFERRED · DISPUTED · UNKNOWN — never hidden. */
function Status({ status }: { status: string }) {
  const s = status.toUpperCase()
  const tone =
    s === 'CONFIRMED'
      ? 'text-green-700'
      : s === 'DISPUTED'
        ? 'text-red-600'
        : s === 'UNKNOWN'
          ? 'text-gray-400'
          : 'text-gray-500'
  return (
    <span className={`font-sans text-[10px] font-bold uppercase tracking-wider ${tone}`}>{s}</span>
  )
}

function Fact({ f }: { f: LedgerFact }) {
  return (
    <li className="mb-2">
      {f.proposition} <Status status={f.status} />
      {/* Her own words are evidence; the paraphrase above is the reusable
          object. The corpus is explicit that one never erases the other — so
          where she answered in Korean the English rides alongside it and does
          not replace it. The office reads case files in English; a deposition
          quotes what she actually said. */}
      {f.verbatimEnglish ? (
        <>
          <span className="block text-[13px] text-gray-700">
            &ldquo;{f.verbatimEnglish}&rdquo;
            <span className="font-sans text-[10px] uppercase tracking-wider text-gray-400">
              {' '}
              translated
            </span>
          </span>
          <span className="block text-[13px] text-gray-500">
            &ldquo;{f.verbatim}&rdquo;
            <span className="font-sans text-[10px] uppercase tracking-wider text-gray-400">
              {' '}
              her words
            </span>
          </span>
        </>
      ) : (
        f.verbatim && (
          <span className="block text-[13px] text-gray-600">&ldquo;{f.verbatim}&rdquo;</span>
        )
      )}
      <span className="block text-[12px] text-gray-400">
        {f.provenance.pinpoint}
        {f.period ? ` · ${f.period}` : ''}
        {f.corroboration && f.corroboration.length > 0
          ? ` · corroborated by ${f.corroboration.join(', ')}`
          : ''}
      </span>
    </li>
  )
}

export default function FactualDocument({
  brief,
  ledger = [],
  searched,
}: {
  brief: FactualBrief
  /** The facts themselves, for the status map, the log and the digest. */
  ledger?: LedgerFact[]
  /**
   * What the extraction behind these facts searched. Null when the ledger was
   * read before searches were recorded; undefined when not loaded.
   */
  searched?: SearchRecord | null
}) {
  const missing = (key: string) => brief.absent.find(a => a.key === key)?.why
  const statuses = evidenceStatusMap(ledger)
  const assumptions = assumptionLog(ledger)
  const digest = submissionDigest(ledger)

  return (
    <div className="bg-gray-100 px-0 sm:px-6 py-0 sm:py-6 print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-[52rem] bg-white sm:shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)] sm:rounded-sm px-6 sm:px-14 py-10 sm:py-14 print:shadow-none print:max-w-none font-serif">
        <header className="border-b border-gray-200 pb-5">
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
            Factual brief — the record, not the argument
          </p>
          <h2 className="font-sans text-2xl font-bold text-gray-900 mt-1.5">{brief.clientName}</h2>
          <p className="font-sans text-[13px] text-gray-500 mt-1">
            {brief.caseType ? `${brief.caseType} · ` : ''}
            {brief.factCount} fact{brief.factCount === 1 ? '' : 's'} on file
            {brief.readOn ? ` · read ${new Date(brief.readOn).toLocaleDateString()}` : ''}
          </p>
        </header>

        {/* Where the record stands, in the firm standard's own vocabulary.
            The ledger keeps five statuses that mean these five things. */}
        {ledger.length > 0 && (
          <>
            <H>Evidence status</H>
            <table className="w-full text-[14px] text-gray-800 mb-1">
              <tbody>
                {statuses.map(s2 => (
                  <tr key={s2.status} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 pr-4 font-sans text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      {s2.status}
                    </td>
                    <td className="py-1.5 tabular-nums w-16 text-right">{s2.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <H>Core story</H>
        {brief.coreStory.length > 0 ? (
          brief.coreStory.map((c, i) => (
            <p key={i} className="text-[15px] leading-[1.75] text-gray-800 mb-3">
              {c.note}
            </p>
          ))
        ) : (
          <p className="text-[15px] text-gray-400 italic">
            {missing('chronology') ?? 'The spine has not named a core story yet.'}
          </p>
        )}

        <H>Strongest proof</H>
        {brief.strongestProof.length > 0 ? (
          <ul className="text-[15px] leading-[1.7] text-gray-800 list-disc pl-5">
            {brief.strongestProof.map(f => (
              <Fact key={f.id} f={f} />
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-gray-400 italic">
            {missing('proof') ?? missing('facts')}
          </p>
        )}

        <H>What cuts against</H>
        {/* Kept here rather than in a separate file, because the corpus says
            harmful evidence and unresolved conflicts are not to be buried. */}
        {brief.weaknesses.length > 0 ? (
          <ul className="text-[15px] leading-[1.7] text-gray-800 list-disc pl-5 space-y-1">
            {brief.weaknesses.map((w, i) => (
              <li key={i}>
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  {w.kind}
                </span>
                {/* What it cuts at, then what cuts. The field holds only the
                    second, and on its own it reads as a list of codes. */}
                {w.against && (
                  <span className="block text-gray-900">{w.against}</span>
                )}
                <span className="block text-gray-700">{w.what}</span>
                {w.from && <span className="block text-[12px] text-gray-400">{w.from}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-gray-400 italic">
            Nothing on file cuts against the account yet.
          </p>
        )}

        <H>Chronology</H>
        {brief.chronology.length > 0 ? (
          <table className="w-full text-[14px] leading-[1.6] text-gray-800">
            <tbody>
              {brief.chronology.map((e, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pr-4 align-top text-gray-500 w-44">{e.when}</td>
                  <td className="py-1.5 align-top">{e.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[15px] text-gray-400 italic">{missing('chronology')}</p>
        )}

        <H>Issue by issue</H>
        {brief.issues.map(issue => (
          <div key={issue.issue} className="mb-7 break-inside-avoid">
            <p className="font-sans text-[15px] font-bold text-gray-900">{issue.issue}</p>

            <Sub>What she says</Sub>
            <ul className="text-[15px] leading-[1.7] text-gray-800 list-disc pl-5">
              {issue.account.slice(0, 6).map(f => (
                <Fact key={f.id} f={f} />
              ))}
            </ul>

            {issue.consistentWith.length > 0 && (
              <>
                {/* Internal consistency, which is worth seeing and is not
                    corroboration. Nothing in this file is corroborated by a
                    record yet. */}
                <Sub>Consistent with her other answers</Sub>
                <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5">
                  {issue.consistentWith.slice(0, 5).map(f => (
                    <li key={f.id}>{f.proposition}</li>
                  ))}
                </ul>
              </>
            )}

            {issue.corroborated.length > 0 && (
              <>
                <Sub>Corroborated by something other than her account</Sub>
                <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5">
                  {issue.corroborated.map(f => (
                    <li key={f.id}>
                      {f.proposition}
                      <span className="block text-[12px] text-gray-400">
                        {(f.corroboration ?? []).join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {issue.harmful.length > 0 && (
              <>
                <Sub>What cuts against it</Sub>
                <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5">
                  {issue.harmful.map((h, i) => (
                    <li key={i}>{h.contrary}</li>
                  ))}
                </ul>
              </>
            )}

            {issue.disputed.length > 0 && (
              <>
                <Sub>Answers that disagree — both kept</Sub>
                <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5">
                  {issue.disputed.map(f => (
                    <li key={f.id}>
                      {f.proposition}
                      {(f.verbatimEnglish || f.verbatim) && (
                        <span className="block text-[13px] text-gray-600">
                          &ldquo;{f.verbatimEnglish || f.verbatim}&rdquo;
                          {f.verbatimEnglish && (
                            <span className="font-sans text-[10px] uppercase tracking-wider text-gray-400">
                              {' '}
                              translated
                            </span>
                          )}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {issue.open.length > 0 && (
              <>
                <Sub>Still missing — the first {issue.open.length}</Sub>
                <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5">
                  {issue.open.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}

        <H>Records to obtain</H>
        {brief.evidence.length > 0 ? (
          <ul className="text-[15px] leading-[1.7] text-gray-800 list-disc pl-5 space-y-2">
            {brief.evidence.map((r, i) => (
              <li key={i}>
                <strong className="font-semibold">{r.record}</strong>
                {r.proves?.note && (
                  <span className="block text-[13px] text-gray-500">{r.proves.note}</span>
                )}
                {r.howToGetIt && (
                  <span className="block text-[13px] text-gray-500">{r.howToGetIt}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-gray-400 italic">Nothing outstanding on the spine.</p>
        )}

        <H>Who&rsquo;s Who — what each person knows</H>
        <table className="w-full text-[14px] leading-[1.6] text-gray-800">
          <tbody>
            {brief.people.map((p, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0 break-inside-avoid">
                <td className="py-2 pr-4 align-top w-56">
                  <span className="font-sans font-semibold">{p.name}</span>
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    {p.alignment}
                    {p.identified ? '' : ' · not identified'}
                  </span>
                </td>
                <td className="py-2 align-top">
                  <span className="block">
                    Knows {p.facts.length} fact{p.facts.length === 1 ? '' : 's'} firsthand
                    {p.knowsAbout.length > 0 ? ` · ${p.knowsAbout.join(', ')}` : ''}
                  </span>
                  <span className="block text-[13px] text-gray-500">{p.nextStep}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <H>Damages facts</H>
        {/* Inputs only. What they come to is the living brief's question. */}
        <table className="w-full text-[14px] leading-[1.6] text-gray-800">
          <tbody>
            {brief.damages.map((d, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-4 align-top w-44 font-sans font-semibold">
                  {d.input}
                  {d.unresolved && (
                    <span className="block font-sans text-[10px] font-bold uppercase tracking-wider text-red-600">
                      not established
                    </span>
                  )}
                </td>
                <td className="py-2 align-top">
                  <ul className="list-disc pl-4">
                    {d.facts.slice(0, 4).map(f => (
                      <li key={f.id}>
                        {f.proposition} <Status status={f.status} />
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <H>Damages assumption log</H>
        {/* What each input rests on, and the record that would replace it.
            "Estimated" is not a disclosure; "estimated, and the pay stubs
            would settle it" is. */}
        {assumptions.length > 0 ? (
          <table className="w-full text-[14px] leading-[1.6] text-gray-800 mb-3">
            <tbody>
              {assumptions.map((a, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 break-inside-avoid">
                  <td className="py-2 pr-4 align-top w-44">
                    <span className="font-sans font-semibold">{a.input}</span>
                    <span
                      className={`font-sans text-[10px] font-bold uppercase tracking-wider block ${
                        a.basis === 'sourced' ? 'text-green-700' : 'text-gray-400'
                      }`}
                    >
                      {a.basis}
                    </span>
                  </td>
                  <td className="py-2 align-top">
                    {a.wouldReplace ? (
                      <span className="block">Would be replaced by: {a.wouldReplace}</span>
                    ) : (
                      <span className="block text-gray-400 italic">
                        No record named that would settle it.
                      </span>
                    )}
                    <span className="block text-[12px] text-gray-400">
                      {a.facts.length} fact{a.facts.length === 1 ? '' : 's'} on file
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[15px] text-gray-400 italic">
            No fact on file is tagged to a damages input yet.
          </p>
        )}

        <H>What she said</H>
        {/* Her words and where she said them. No proposition, no conclusion —
            the corpus says the digest carries neither. */}
        <table className="w-full text-[14px] leading-[1.6] text-gray-800 mb-3">
          <tbody>
            {digest.map((d, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                <td className="py-1.5 pr-4 align-top text-gray-500 w-72">{d.where}</td>
                <td className="py-1.5 align-top">&ldquo;{d.said}&rdquo;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {searched !== undefined && (
          <>
            <H>What this reading searched</H>
            <Searched record={searched} />
          </>
        )}

        <H>Open development plan</H>
        <ul className="text-[15px] leading-[1.7] text-gray-800 list-disc pl-5 space-y-1">
          {brief.development.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * The sources behind the facts above, and the ones not behind them.
 *
 * Four lists kept apart, because each means something different to a reader
 * weighing "nothing corroborates this": read, looked for and absent, present
 * but outside what this reading reads, and tried and could not be opened.
 */
function Searched({ record }: { record: SearchRecord | null | undefined }) {
  if (record === undefined) return null
  if (record === null) {
    return (
      <p className="text-[15px] leading-[1.75] text-gray-400 italic">
        These facts were read before the portal recorded what each reading searched. Read the
        answers again to record it.
      </p>
    )
  }
  const count = (f: (c: SourceCategory) => number) => record.categories.reduce((n, c) => n + f(c), 0)
  const inaccessible = count(c => c.inaccessible.length)
  return (
    <>
      <p className="text-[13px] text-gray-500 mb-3">
        Read {new Date(record.ranAt).toLocaleString()} · {count(c => c.reviewed.length)} reviewed ·{' '}
        {count(c => c.missing.length)} missing · {count(c => c.notRead.length)} not read ·{' '}
        <span className={inaccessible ? 'text-red-700 font-semibold' : ''}>{inaccessible} could not be opened</span>
      </p>
      {record.categories.map(c => (
        <div key={c.key} className="mb-4">
          <Sub>{c.label}</Sub>
          {c.reviewed.length > 0 && (
            <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5 space-y-0.5">
              {c.reviewed.map((r, i) => (
                <li key={i}>
                  {r.label}{' '}
                  <span className="text-gray-500">
                    — {r.answered} of {r.asked} answered
                  </span>
                </li>
              ))}
            </ul>
          )}
          {c.missing.length > 0 && (
            <>
              <p className="text-[12px] font-semibold text-gray-600 mt-2">Missing</p>
              <ul className="text-[14px] leading-[1.7] text-gray-700 list-disc pl-5 space-y-0.5">
                {c.missing.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </>
          )}
          {c.notRead.length > 0 && (
            <>
              <p className="text-[12px] font-semibold text-gray-600 mt-2">On file, not read</p>
              <ul className="text-[14px] leading-[1.7] text-gray-700 list-disc pl-5 space-y-0.5">
                {c.notRead.map((m, i) => (
                  <li key={i}>
                    {m.label}
                    <span className="block text-[12px] text-gray-500">{m.why}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {c.inaccessible.length > 0 && (
            <>
              <p className="text-[12px] font-semibold text-red-700 mt-2">Could not be opened</p>
              <ul className="text-[14px] leading-[1.7] text-gray-900 list-disc pl-5 space-y-0.5">
                {c.inaccessible.map((m, i) => (
                  <li key={i}>
                    {m.label}
                    <span className="block text-[12px] text-gray-500">{m.why}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ))}
    </>
  )
}
