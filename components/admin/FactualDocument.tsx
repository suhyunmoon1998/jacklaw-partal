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
import type { FactualByTemplate } from '@/lib/factualTemplate'
import TemplateChecks from '@/components/admin/TemplateChecks'

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

/** A part the template asks for and nothing on file supplies — said, never left blank. */
const Gap = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[14px] leading-[1.7] text-gray-400 italic mb-2">{children}</p>
)

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5 space-y-1 mb-2">
    {items.map((x, i) => (
      <li key={i}>{x}</li>
    ))}
  </ul>
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
  view,
  ledger = [],
  searched,
}: {
  brief: FactualBrief
  /** The same brief, arranged by Factual Brief Template 1.0. */
  view: FactualByTemplate
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
  const t = view.template
  // Numbered exactly as the template numbers them, so the two read side by side.
  const title = (n: string) => `${n}. ${t.sections.find(x => x.n === n)!.title}`

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
          <p className="font-sans text-[11px] text-gray-400 mt-1">
            Laid out to the firm’s {t.name} {t.version}. Assembled from the record on file; nothing
            below is written by a model.
          </p>
        </header>

        {/* ── I ─────────────────────────────────────────────────────────── */}
        <H>{title('I')}</H>
        <table className="w-full text-[14px] leading-[1.6] text-gray-800 mb-3">
          <tbody>
            {view.snapshot.map(f => (
              <tr key={f.field} className="border-b border-gray-100 last:border-0">
                <td className="py-1.5 pr-4 align-top text-gray-500 w-56">{f.field}</td>
                <td className="py-1.5 align-top">
                  {f.onFile ? (
                    <>
                      {f.value}
                      <span className="block text-[12px] text-gray-400">{f.source}</span>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">{f.source}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Where the record stands, in the firm standard's own vocabulary.
            The template's first rule is to keep these five apart. */}
        {ledger.length > 0 && (
          <>
            <Sub>Evidence status</Sub>
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

        {/* ── II ────────────────────────────────────────────────────────── */}
        <H>{title('II')}</H>
        <Sub>A. The Core Story</Sub>
        {brief.coreStory.length > 0 ? (
          brief.coreStory.map((c, i) => (
            <p key={i} className="text-[15px] leading-[1.75] text-gray-800 mb-3">
              {c.note}
            </p>
          ))
        ) : (
          <Gap>{missing('chronology') ?? 'The spine has not named a core story yet.'}</Gap>
        )}

        <Sub>B. Strongest Proof</Sub>
        {brief.strongestProof.length > 0 ? (
          <ul className="text-[15px] leading-[1.7] text-gray-800 list-disc pl-5">
            {brief.strongestProof.map(f => (
              <Fact key={f.id} f={f} />
            ))}
          </ul>
        ) : (
          <Gap>{missing('proof') ?? missing('facts')}</Gap>
        )}

        <Sub>C. Strongest Admissions or Defense-Generated Evidence</Sub>
        {view.theory.admissions.length > 0 ? (
          <ul className="text-[15px] leading-[1.7] text-gray-800 list-disc pl-5">
            {view.theory.admissions.map(f => (
              <Fact key={f.id} f={f} />
            ))}
          </ul>
        ) : (
          <Gap>
            Nothing from the employer’s own documents, discovery or testimony is on file. Statements a
            manager made, as she reported them, would appear here.
          </Gap>
        )}

        <Sub>D. Biggest Weaknesses / Contradictions</Sub>
        {/* The template: "Include unfavorable evidence and contradictions. Do
            not bury them." */}
        {brief.weaknesses.length > 0 ? (
          <ul className="text-[15px] leading-[1.7] text-gray-800 list-disc pl-5 space-y-1">
            {brief.weaknesses.map((w, i) => (
              <li key={i}>
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  {w.kind}
                </span>
                {w.against && <span className="block text-gray-900">{w.against}</span>}
                <span className="block text-gray-700">{w.what}</span>
                {w.from && <span className="block text-[12px] text-gray-400">{w.from}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <Gap>Nothing on file cuts against the account yet.</Gap>
        )}

        <Sub>E. What Must Be Proven Next</Sub>
        {view.theory.provenNext.length > 0 ? (
          <Bullets items={view.theory.provenNext} />
        ) : (
          <Gap>No open loop is recorded on any fact.</Gap>
        )}

        {/* ── III ───────────────────────────────────────────────────────── */}
        <H>{title('III')}</H>
        <Sub>A. Employer / Business</Sub>
        {view.parties.employer.length ? <Bullets items={view.parties.employer} /> : <Gap>Nothing on file describes the business.</Gap>}
        <Sub>B. Plaintiff’s Actual Job</Sub>
        {view.parties.job.length ? <Bullets items={view.parties.job} /> : <Gap>No job title or duties in the employment baseline.</Gap>}
        <Sub>C. Supervision and Control</Sub>
        {view.parties.control.length ? (
          <Bullets
            items={view.parties.control.map(
              p => `${p.name} — in ${p.knows} fact${p.knows === 1 ? '' : 's'}${p.about.length ? ` · ${p.about.join(', ')}` : ''}`
            )}
          />
        ) : (
          <Gap>No supervisor or manager is named in her answers.</Gap>
        )}
        <Sub>D. Classification / Pay Structure Facts</Sub>
        {view.parties.pay.length ? <Bullets items={view.parties.pay} /> : <Gap>No pay structure in the employment baseline.</Gap>}

        {/* ── IV ────────────────────────────────────────────────────────── */}
        <H>{title('IV')}</H>
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
          <Gap>{missing('chronology')}</Gap>
        )}

        {/* ── V ─────────────────────────────────────────────────────────── */}
        <H>{title('V')}</H>
        {view.issues.length === 0 && <Gap>No fact carries an issue tag yet.</Gap>}
        {view.issues.map(issue => (
          <div key={issue.issue} className="mb-8">
            <p className="font-sans text-[15px] font-bold text-gray-900">ISSUE: {issue.issue}</p>

            <Sub>1. Plaintiff’s Account</Sub>
            <ul className="text-[15px] leading-[1.7] text-gray-800 list-disc pl-5">
              {issue.account.slice(0, 6).map(f => (
                <Fact key={f.id} f={f} />
              ))}
            </ul>
            {issue.account.length > 6 && (
              <p className="text-[12px] text-gray-400 mb-2">and {issue.account.length - 6} more on file</p>
            )}

            <Sub>2. Documentary Record</Sub>
            {issue.documentary.length ? (
              <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5">
                {issue.documentary.map(f => <Fact key={f.id} f={f} />)}
              </ul>
            ) : (
              <Gap>No record on file bears on this issue. Everything above is her account.</Gap>
            )}

            <Sub>3. Defendant’s Account</Sub>
            {issue.defendant.length ? (
              <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5">
                {issue.defendant.map(f => <Fact key={f.id} f={f} />)}
              </ul>
            ) : (
              <Gap>Nothing from the employer is on file for this issue.</Gap>
            )}

            <Sub>4. Corroboration</Sub>
            {issue.corroboration.length ? (
              <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5">
                {issue.corroboration.map(f => (
                  <li key={f.id}>
                    {f.proposition}
                    <span className="block text-[12px] text-gray-400">{(f.corroboration ?? []).join(', ')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Gap>Nothing other than her own account supports this issue yet.</Gap>
            )}
            {issue.consistentWith.length > 0 && (
              <>
                {/* Consistency with her other answers, which is worth seeing
                    and is not corroboration. */}
                <p className="text-[12px] font-semibold text-gray-600 mt-2">Consistent with her other answers — not corroboration</p>
                <ul className="text-[14px] leading-[1.7] text-gray-700 list-disc pl-5">
                  {issue.consistentWith.slice(0, 5).map(f => (
                    <li key={f.id}>{f.proposition}</li>
                  ))}
                </ul>
              </>
            )}

            <Sub>5. Contrary / Harmful Evidence</Sub>
            {issue.contrary.length || issue.disputed.length ? (
              <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5">
                {issue.contrary.map((h, i) => (
                  <li key={`c${i}`}>{h.contrary}</li>
                ))}
                {issue.disputed.map(f => (
                  <li key={f.id}>
                    {f.proposition} <Status status={f.status} />
                    {(f.verbatimEnglish || f.verbatim) && (
                      <span className="block text-[13px] text-gray-600">&ldquo;{f.verbatimEnglish || f.verbatim}&rdquo;</span>
                    )}
                    <span className="block text-[12px] text-gray-400">Answers that disagree — both kept.</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Gap>Nothing on file cuts against this issue yet.</Gap>
            )}

            <Sub>6. Record Anomalies</Sub>
            {issue.anomalies.length ? <Bullets items={issue.anomalies} /> : <Gap>None found in the facts under this issue.</Gap>}

            <Sub>7. Best Factual Nugget</Sub>
            {issue.nugget ? (
              <>
                <ul className="text-[15px] leading-[1.7] text-gray-800 list-disc pl-5">
                  <Fact f={issue.nugget.fact} />
                </ul>
                {!issue.nugget.proof && (
                  <p className="text-[12px] text-gray-500 -mt-1 mb-2">
                    The strongest thing she says on this issue. Nothing corroborates it yet.
                  </p>
                )}
              </>
            ) : (
              <Gap>No fact on file.</Gap>
            )}

            <Sub>8. What Is Still Missing</Sub>
            {issue.missing.length ? <Bullets items={issue.missing} /> : <Gap>No open loop recorded for this issue.</Gap>}
          </div>
        ))}

        {view.otherIssues.length > 0 && (
          <>
            <Sub>Other issues — fewer facts on file, not developed above</Sub>
            <p className="text-[13px] leading-[1.7] text-gray-600 mb-2">
              {view.otherIssues.map(o => `${o.issue} (${o.facts})`).join(' · ')}
            </p>
          </>
        )}

        {/* ── VI ────────────────────────────────────────────────────────── */}
        <H>{title('VI')}</H>
        {view.records.map(r => (
          <div key={r.key} className="mb-4">
            <Sub>
              {r.key}. {r.title}
            </Sub>
            {r.inHand.length === 0 && r.toObtain.length === 0 && r.facts.length === 0 ? (
              <Gap>Nothing on file, and nothing named to obtain.</Gap>
            ) : (
              <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5 space-y-1">
                {r.inHand.map((x, i) => (
                  <li key={`h${i}`}>
                    <strong className="font-semibold">{x.record}</strong>{' '}
                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-green-700">in hand</span>
                    {x.proves?.note && <span className="block text-[13px] text-gray-500">{x.proves.note}</span>}
                  </li>
                ))}
                {r.facts.map(f => (
                  <li key={f.id}>
                    {f.proposition} <Status status={f.status} />
                    <span className="block text-[12px] text-gray-400">
                      {f.provenance.kind} · {f.provenance.pinpoint}
                    </span>
                  </li>
                ))}
                {r.toObtain.map((x, i) => (
                  <li key={`o${i}`}>
                    <strong className="font-semibold">{x.record}</strong>{' '}
                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400">to obtain</span>
                    {x.proves?.note && <span className="block text-[13px] text-gray-500">{x.proves.note}</span>}
                    {x.howToGetIt && <span className="block text-[13px] text-gray-500">{x.howToGetIt}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {searched !== undefined && (
          <>
            <Sub>Sources this reading searched</Sub>
            <Searched record={searched} />
          </>
        )}

        {/* ── VII ───────────────────────────────────────────────────────── */}
        <H>{title('VII')}</H>
        {brief.people.length === 0 ? (
          <Gap>{missing('people') ?? 'Nobody is named in her answers yet.'}</Gap>
        ) : (
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
        )}

        {/* ── VIII ──────────────────────────────────────────────────────── */}
        <H>{title('VIII')}</H>
        <Sub>A. Expected Defense Narrative</Sub>
        {view.defense.narrative.length ? (
          <ul className="text-[15px] leading-[1.7] text-gray-800 list-disc pl-5">
            {view.defense.narrative.map(f => <Fact key={f.id} f={f} />)}
          </ul>
        ) : (
          <Gap>
            No statement by the employer is on file, so its position is not developed here. The case
            brief carries the defences the reading predicts.
          </Gap>
        )}
        <Sub>B. Evidence Supporting the Defense</Sub>
        {view.defense.supporting.length ? (
          <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5 space-y-1">
            {view.defense.supporting.map((w, i) => (
              <li key={i}>
                {w.what}
                {w.against && <span className="block text-[12px] text-gray-400">against: {w.against}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <Gap>Nothing on file supports the defence yet.</Gap>
        )}
        <Sub>C. Plaintiff’s Best Contrary Evidence</Sub>
        {view.defense.rebuttal.length ? (
          <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5">
            {view.defense.rebuttal.map(f => <Fact key={f.id} f={f} />)}
          </ul>
        ) : (
          <Gap>Nothing on file is corroborated beyond her account, so nothing yet rebuts a defence with proof.</Gap>
        )}
        <Sub>D. Unresolved Conflicts</Sub>
        {view.defense.unresolved.length ? <Bullets items={view.defense.unresolved} /> : <Gap>None recorded.</Gap>}

        {/* ── IX ────────────────────────────────────────────────────────── */}
        <H>{title('IX')}</H>
        {/* Inputs only. What they come to is the living brief's question. */}
        {brief.damages.length === 0 ? (
          <Gap>No fact carries a damages input yet.</Gap>
        ) : (
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
        )}
        <Sub>Missing Inputs</Sub>
        {view.damagesMissing.length ? <Bullets items={view.damagesMissing} /> : <Gap>Every input on file has a fact behind it.</Gap>}
        <Sub>Assumption log</Sub>
        {/* What each input rests on, and the record that would replace it. */}
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
                      <span className="block text-gray-400 italic">No record named that would settle it.</span>
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
          <Gap>No damages input to log.</Gap>
        )}

        {/* ── X ─────────────────────────────────────────────────────────── */}
        <H>{title('X')}</H>
        {view.plan.length ? (
          <ol className="text-[15px] leading-[1.7] text-gray-800 list-decimal pl-5 space-y-1">
            {view.plan.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ol>
        ) : (
          <Gap>No open loop is recorded on any fact.</Gap>
        )}

        {/* ── XI ────────────────────────────────────────────────────────── */}
        <H>{title('XI')}</H>
        {view.summary.paragraphs.length ? (
          view.summary.paragraphs.map((p, i) => (
            <p key={i} className="text-[15px] leading-[1.75] text-gray-800 mb-3">
              {p}
            </p>
          ))
        ) : (
          <Gap>There is no core story on file to assemble from yet.</Gap>
        )}
        <p className="text-[12px] text-gray-400 mb-3">{view.summary.how}</p>
        {digest.length > 0 && (
          <>
            <Sub>Her words, and where she said them</Sub>
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
          </>
        )}

        {/* ── XII ───────────────────────────────────────────────────────── */}
        <H>{title('XII')}</H>
        <TemplateChecks checks={view.checks} />
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
