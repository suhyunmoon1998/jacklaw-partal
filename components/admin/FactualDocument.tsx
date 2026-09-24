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

export default function FactualDocument({ brief }: { brief: FactualBrief }) {
  const missing = (key: string) => brief.absent.find(a => a.key === key)?.why

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
                {w.what}
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
                <Sub>Still missing</Sub>
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
