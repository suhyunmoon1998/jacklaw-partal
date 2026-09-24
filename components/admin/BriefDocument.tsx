'use client'

/**
 * The brief, on one sheet, in the order the methodology asks for.
 *
 * Seven headings and no accordions. An attorney reads this top to bottom
 * before a call with a client or a demand letter, and anything folded shut is
 * a thing they will not have read. Same typography as the claims reading it
 * absorbs — a measure of about ninety characters, a serif face, an inch of
 * margin — because it prints, and the print is the point.
 *
 * Every heading appears even when its section is empty. A brief that silently
 * drops "Damages" reads as a case with no damages; one that says the damages
 * reading has not been run reads as a job still to do.
 */

import { Brief, SECTION_ORDER, SECTION_TITLE, SectionKey } from '@/lib/caseBrief'
import { Problem } from '@/lib/releaseTest'
import { Changes, nothingChanged } from '@/lib/briefChanges'
import { missingInformation } from '@/lib/missingInformation'

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 mt-10 mb-3 break-after-avoid">
      {children}
    </h3>
  )
}

function Absent({ why }: { why: string }) {
  return <p className="text-[15px] leading-[1.75] text-gray-400 italic">{why}</p>
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 mt-5">
      {children}
    </p>
  )
}

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[15px] leading-[1.75] text-gray-800 mb-3">{children}</p>
)

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="text-[15px] leading-[1.75] text-gray-800 list-disc pl-5 space-y-1 mb-3">
    {items.map((t, i) => (
      <li key={i}>{t}</li>
    ))}
  </ul>
)

export default function BriefDocument({
  brief,
  problems = [],
  changes = null,
}: {
  brief: Brief
  /** What moved since the last reading. Null on a first reading. */
  changes?: Changes | null
  /**
   * What the release test found. Shown on the document rather than beside it:
   * a warning on the panel behind a sheet somebody prints is a warning that
   * does not reach the person reading the print.
   */
  problems?: Problem[]
}) {
  const blocks = problems.filter(p => p.severity === 'block')
  const flags = problems.filter(p => p.severity === 'flag')
  const absentOf = (key: SectionKey) => brief.absent.find(s => s.key === key)?.absent ?? null

  return (
    <div className="bg-gray-100 px-0 sm:px-6 py-0 sm:py-6 print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-[52rem] bg-white sm:shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)] sm:rounded-sm px-6 sm:px-14 py-10 sm:py-14 print:shadow-none print:max-w-none font-serif">
        <header className="border-b border-gray-200 pb-5">
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
            Case brief — staff reading, never shown to a client
          </p>
          <h2 className="font-sans text-2xl font-bold text-gray-900 mt-1.5">{brief.clientName}</h2>
          <p className="font-sans text-[13px] text-gray-500 mt-1">
            {brief.caseType ? `${brief.caseType} · ` : ''}
            {brief.factCount} fact{brief.factCount === 1 ? '' : 's'} on file
            {brief.readOn ? ` · read ${new Date(brief.readOn).toLocaleDateString()}` : ''}
          </p>
        </header>

        {/* Failed the release test. Printed with the document on purpose —
            this is the one thing that must not be lost when somebody saves a
            PDF and mails it to a colleague. */}
        {blocks.length > 0 && (
          <div className="mt-6 border-2 border-red-400 bg-red-50 px-4 py-3 print:bg-white">
            <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-red-700 mb-1.5">
              Not to be sent out — {blocks.length} {blocks.length === 1 ? 'problem' : 'problems'}
            </p>
            <ul className="text-[14px] leading-[1.7] text-gray-900 list-disc pl-5 space-y-1">
              {blocks.map((p, i) => (
                <li key={i}>
                  {p.what}
                  <span className="block text-[12px] text-gray-500">
                    {p.where} · {p.rule}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {flags.length > 0 && (
          <div className="mt-4 border-l-4 border-gray-300 bg-gray-50 px-4 py-3 print:bg-white">
            <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Gaps in this draft
            </p>
            <ul className="text-[14px] leading-[1.7] text-gray-700 list-disc pl-5 space-y-1">
              {flags.map((p, i) => (
                <li key={i}>
                  {p.what}
                  <span className="block text-[12px] text-gray-400">{p.where}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Said first, not last: a reader who acts on a figure below should
            know before they reach it that somebody still has to settle the
            wage order or that the facts have moved underneath it. */}
        {brief.review.length > 0 && (
          <div className="mt-6 border-l-4 border-amber-400 bg-amber-50 px-4 py-3 print:bg-white">
            <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1.5">
              Before relying on this
            </p>
            <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5 space-y-1">
              {brief.review.map((r, i) => (
                <li key={i}>
                  <strong className="font-semibold">{r.what}.</strong> {r.why}
                </li>
              ))}
            </ul>
          </div>
        )}

        {SECTION_ORDER.map(key => {
          const missing = absentOf(key)
          return (
            <section key={key}>
              <Heading>{SECTION_TITLE[key]}</Heading>
              {missing ? (
                <Absent why={missing} />
              ) : (
                <Body brief={brief} section={key} changes={changes} />
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Body({
  brief,
  section,
  changes,
}: {
  brief: Brief
  section: SectionKey
  changes: Changes | null
}) {
  if (section === 'overview') {
    return (
      <>
        {brief.overview.summary ? <P>{brief.overview.summary}</P> : null}
        {brief.overview.baseline.length > 0 && (
          <>
            <Label>Employment baseline</Label>
            <table className="w-full text-[14px] leading-[1.6] text-gray-800 mb-3">
              <tbody>
                {brief.overview.baseline.map((b, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 pr-4 align-top text-gray-500 w-56">{b.label}</td>
                    <td className="py-1.5 align-top">
                      {b.value}
                      {/* FACT / ESTIMATE / ASSUMPTION / CONFIRM — the difference
                          between a figure a lawyer can stand behind and one
                          they have to re-derive. */}
                      {b.basis && b.basis !== 'FACT' && (
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-2">
                          {b.basis}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </>
    )
  }

  if (section === 'facts') {
    return (
      <>
        {brief.chronology.coreStory.map((c, i) => (
          <P key={i}>{c.note}</P>
        ))}
        {brief.chronology.events.length > 0 && (
          <table className="w-full text-[14px] leading-[1.6] text-gray-800 mb-3">
            <tbody>
              {brief.chronology.events.map((e, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pr-4 align-top text-gray-500 w-40 tabular-nums">{e.when}</td>
                  <td className="py-1.5 align-top">{e.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {brief.chronology.conflicts.length > 0 && (
          <>
            {/* Kept in, and kept visible. A date that contradicts another date
                is the thing the other side will find first. */}
            <Label>Conflicts and anomalies</Label>
            <Bullets items={brief.chronology.conflicts} />
          </>
        )}
      </>
    )
  }

  if (section === 'claims') {
    return (
      <>
        {brief.claims.map((f, i) => (
          <div key={i} className="mb-6 break-inside-avoid">
            <p className="font-sans text-[15px] font-bold text-gray-900">{f.claimId}</p>
            <p className="text-[14px] leading-[1.7] text-gray-600 italic mb-2">{f.standing}</p>
            {f.elements.map((el, j) => (
              <div key={j} className="mb-2">
                <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  {el.key} — {el.state}
                </span>
                <p className="text-[14px] leading-[1.7] text-gray-800">{el.reasoning}</p>
                {el.wouldSettleIt && (
                  <p className="text-[13px] leading-[1.6] text-gray-500">
                    Would settle it: {el.wouldSettleIt}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </>
    )
  }

  if (section === 'strengths') {
    return (
      <>
        {brief.strengths.length > 0 && (
          <>
            <Label>Where it is strongest</Label>
            <Bullets items={brief.strengths} />
          </>
        )}
        {brief.weaknesses.length > 0 && (
          <>
            <Label>Where it is thinnest</Label>
            <Bullets items={brief.weaknesses} />
          </>
        )}
        {brief.defenses.length > 0 && (
          <>
            <Label>What the employer will say</Label>
            <Bullets items={brief.defenses.map(d => `${d.claimId} — ${d.defense}`)} />
          </>
        )}
        {brief.strengths.length === 0 &&
          brief.weaknesses.length === 0 &&
          brief.defenses.length === 0 && (
            <Absent why="The claims reading found nothing to weigh either way yet." />
          )}
      </>
    )
  }

  if (section === 'damages') {
    return (
      <>
        {brief.damages.drivers ? <P>{brief.damages.drivers}</P> : null}
        {brief.damages.issues.length > 0 && (
          <table className="w-full text-[14px] leading-[1.6] text-gray-800 mb-3">
            <tbody>
              {brief.damages.issues.map((it, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 break-inside-avoid">
                  <td className="py-2 pr-4 align-top w-52">
                    <span className="font-sans font-semibold">{it.category}</span>
                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      {it.strength}
                    </span>
                  </td>
                  <td className="py-2 align-top">
                    {it.headline}
                    {it.math && (
                      <span className="block text-[13px] text-gray-500 tabular-nums">{it.math}</span>
                    )}
                    {it.estimate && (
                      <span className="block text-[13px] font-semibold">{it.estimate}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {brief.damages.doubleCounting.length > 0 && (
          <>
            <Label>Overlaps to resolve before totalling</Label>
            <Bullets items={brief.damages.doubleCounting} />
          </>
        )}
        {brief.damages.missingInputs.length > 0 && (
          <>
            {/* The methodology's rule: say what is missing rather than letting
                an unsupported figure stand in for it. */}
            <Label>Missing inputs</Label>
            <Bullets items={brief.damages.missingInputs} />
          </>
        )}
      </>
    )
  }

  if (section === 'questions') {
    const missing = missingInformation(brief)
    return (
      <>
        {/* The short ranked list, before the long ones. Ten at most, each
            saying what is missing, why it matters, who holds it and how the
            office gets it — the four things somebody needs to act. */}
        {missing.length > 0 && (
          <>
            <Label>Most important missing information</Label>
            <ol className="text-[15px] leading-[1.75] text-gray-800 list-decimal pl-5 space-y-2 mb-5">
              {missing.map((m, i) => (
                <li key={i}>
                  <strong className="font-semibold">{m.what}</strong>
                  {m.why && <span className="block text-[13px] text-gray-600">{m.why}</span>}
                  <span className="block text-[13px] text-gray-500">
                    {m.source || 'Holder not named by the reading'} ·{' '}
                    <span className="font-sans uppercase tracking-wider text-[10px] font-bold">
                      {m.method}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}

        {brief.questions.length > 0 && (
          <>
            <Label>Waiting to be approved and sent</Label>
            <ul className="text-[15px] leading-[1.75] text-gray-800 list-decimal pl-5 space-y-2 mb-3">
              {brief.questions.map((q, i) => (
                <li key={i}>
                  {q.text}
                  {q.why && <span className="block text-[13px] text-gray-500">{q.why}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
        {brief.evidence.length > 0 && (
          <>
            <Label>Records to obtain</Label>
            <ul className="text-[15px] leading-[1.75] text-gray-800 list-disc pl-5 space-y-2">
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
          </>
        )}
      </>
    )
  }

  // review
  return (
    <>
      {brief.review.length > 0 && (
        <ul className="text-[15px] leading-[1.75] text-gray-800 list-disc pl-5 space-y-2 mb-3">
          {brief.review.map((r, i) => (
            <li key={i}>
              <strong className="font-semibold">{r.what}.</strong> {r.why}
              <span className="block text-[13px] text-gray-500">{r.from}</span>
            </li>
          ))}
        </ul>
      )}
      <Label>Changes from the previous reading</Label>
      {!changes ? (
        <Absent why="This is the first reading kept for this client, so there is nothing yet to compare it against. The next one will say what moved." />
      ) : nothingChanged(changes) ? (
        <Absent
          why={`Nothing moved since ${changes.since ? new Date(changes.since).toLocaleDateString() : 'the last reading'}. The facts and every conclusion stand as they did.`}
        />
      ) : (
        <>
          {/* Conclusions first. "Three facts changed" is not the answer to
              "did anything I told the client last week stop being true". */}
          {changes.conclusions.length > 0 && (
            <ul className="text-[15px] leading-[1.75] text-gray-800 list-disc pl-5 space-y-2 mb-4">
              {changes.conclusions.map((c, i) => (
                <li key={i}>
                  <strong className="font-semibold">{c.what}</strong> — was{' '}
                  <em>{c.from}</em>, now <em>{c.to}</em>
                  {c.because.length > 0 && (
                    <span className="block text-[13px] text-gray-500">
                      because {c.because.join(', ')} moved
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {changes.facts.length > 0 && (
            <>
              <Label>What moved in the ledger</Label>
              <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5 space-y-2 mb-4">
                {changes.facts.map((f, i) => (
                  <li key={i}>
                    <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {f.kind} · {f.id}
                    </span>
                    {/* The client's own words on both sides. A change that
                        paraphrases away what she actually said is a change
                        nobody can check. */}
                    {f.kind === 'superseded' && (
                      <>
                        <span className="block">&ldquo;{f.before.verbatim}&rdquo;</span>
                        <span className="block text-[13px] text-gray-500">
                          {f.why || 'No reason recorded.'}
                          {f.by ? ` Replaced by ${f.by}.` : ' Nothing replaced it.'}
                        </span>
                      </>
                    )}
                    {(f.kind === 'status' || f.kind === 'reworded') && (
                      <>
                        <span className="block">&ldquo;{f.before.verbatim}&rdquo;</span>
                        <span className="block">&rarr; &ldquo;{f.after.verbatim}&rdquo;</span>
                        <span className="block text-[13px] text-gray-500">
                          {f.before.status} &rarr; {f.after.status} · {f.after.provenance.pinpoint}
                        </span>
                      </>
                    )}
                    {f.kind === 'added' && (
                      <>
                        <span className="block">&ldquo;{f.after.verbatim}&rdquo;</span>
                        <span className="block text-[13px] text-gray-500">
                          {f.after.provenance.kind} · {f.after.provenance.pinpoint}
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {(changes.affected.claims.length > 0 || changes.affected.damages.length > 0) && (
            <>
              <Label>Read again, because it rests on a fact that moved</Label>
              <Bullets
                items={[...changes.affected.claims, ...changes.affected.damages]}
              />
            </>
          )}

          {changes.unaffected.claims.length > 0 && (
            <>
              <Label>Unchanged, and not read again</Label>
              <Bullets items={changes.unaffected.claims} />
            </>
          )}

          {changes.unresolved.length > 0 && (
            <>
              {/* Both sides, kept. A comparison that resolved a disagreement by
                  taking the newer answer would destroy the thing a lawyer most
                  needs to see. */}
              <Label>Still unresolved</Label>
              <ul className="text-[14px] leading-[1.7] text-gray-800 list-disc pl-5 space-y-2">
                {changes.unresolved.map((u, i) => (
                  <li key={i}>
                    {u.proposition}
                    <span className="block">&ldquo;{u.verbatim}&rdquo;</span>
                    <span className="block text-[13px] text-gray-500">{u.note}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  )
}
