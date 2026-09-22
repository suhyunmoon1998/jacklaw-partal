'use client'

/**
 * The case reading, set as a page rather than as a panel.
 *
 * What was here before was accurate and unreadable: eleven-pixel type, every
 * claim folded into an accordion, and each supporting fact printed as
 * "client-1789099693038:f068 — …" so that the identifier was longer than the
 * sentence it introduced. The office was being handed a reference table and
 * asked to read it like a memo.
 *
 * So: one sheet, a measure of about ninety characters, a serif face, and the
 * claims set as running prose under headings. The summary is computed here in
 * the browser from the reading already on file — it costs nothing and asks
 * nothing of a model, because everything in it is arithmetic over findings
 * that have already been paid for.
 *
 * It prints. An attorney who wants this on paper should get the page, not a
 * screenshot of a modal, which is the other half of why it is shaped this way.
 */

export type Element = {
  key: string
  state: string
  reasoning: string
  wouldSettleIt: string
  facts?: string[]
}

export type Finding = {
  claimId: string
  standing: string
  elements: Element[]
  adverse: string[]
  defense: string
  damagesInputs?: string[]
  damagesMissing?: string[]
}

export type Choice = {
  proposal: { order: string; industry: string; businessIs: string; reliedOn: string; because: string }
  dlse: { entry: string; orders: string; agrees: boolean } | null
  caveat: string
}

/**
 * "client-1789099693038:f068 — he did no work" → "f068 — he did no work".
 *
 * The client id is on every one of them and identical on every one of them,
 * so it carries no information and costs a third of the line.
 */
export function shortRef(s: string): string {
  return s.replace(/client-\d+:/g, '')
}

/** A claim id as a heading: "meal-periods" → "Meal periods". */
export function claimTitle(id: string): string {
  const words = id.replace(/[-_]/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const ELEMENT_WORD: Record<string, string> = {
  supported: 'Supported',
  'partially supported': 'Partly supported',
  contradicted: 'Contradicted',
  unknown: 'Not yet known',
  'needs authority': 'Needs authority',
}

const ELEMENT_DOT: Record<string, string> = {
  supported: 'bg-green-600',
  'partially supported': 'bg-amber-500',
  contradicted: 'bg-red-600',
  unknown: 'bg-gray-400',
  'needs authority': 'bg-blue-500',
}

/** An element key as a phrase: "over-five-hours" → "over five hours". */
function elementWords(key: string): string {
  return key.replace(/[-_]/g, ' ')
}

export interface Summary {
  claims: number
  byStanding: Record<string, number>
  byState: Record<string, number>
  strongest: Finding[]
  thinnest: { claim: Finding; unknown: number }[]
  wouldSettle: { claim: string; want: string }[]
  damagesMissing: { claim: string; want: string }[]
  adverseCount: number
}

/**
 * What the reading amounts to, worked out from the reading.
 *
 * Deliberately arithmetic and not prose-generation: every number here can be
 * checked against the claims printed below it, which is the property that
 * makes a summary safe to put at the top of a document somebody will act on.
 */
export function summarise(findings: Finding[]): Summary {
  const byStanding: Record<string, number> = {}
  const byState: Record<string, number> = {}
  const wouldSettle: { claim: string; want: string }[] = []
  const damagesMissing: { claim: string; want: string }[] = []
  let adverseCount = 0

  for (const f of findings) {
    byStanding[f.standing] = (byStanding[f.standing] ?? 0) + 1
    adverseCount += f.adverse?.length ?? 0
    for (const e of f.elements ?? []) {
      byState[e.state] = (byState[e.state] ?? 0) + 1
      // Only the elements that are not yet settled: what would settle an
      // element already supported is a document to hold, not a thing to chase.
      if (e.wouldSettleIt && (e.state === 'unknown' || e.state === 'partially supported')) {
        wouldSettle.push({ claim: f.claimId, want: e.wouldSettleIt })
      }
    }
    for (const want of f.damagesMissing ?? []) damagesMissing.push({ claim: f.claimId, want })
  }

  const unknowns = (f: Finding) =>
    (f.elements ?? []).filter(e => e.state === 'unknown' || e.state === 'needs authority').length
  const supported = (f: Finding) => (f.elements ?? []).filter(e => e.state === 'supported').length

  const live = findings.filter(f => f.standing !== 'not raised by these facts')

  return {
    claims: findings.length,
    byStanding,
    byState,
    strongest: [...live].sort((a, b) => supported(b) - supported(a)).slice(0, 3),
    thinnest: [...live]
      .map(claim => ({ claim, unknown: unknowns(claim) }))
      .filter(x => x.unknown > 0)
      .sort((a, b) => b.unknown - a.unknown)
      .slice(0, 3),
    wouldSettle,
    damagesMissing,
    adverseCount,
  }
}

function Tally({ counts, order }: { counts: Record<string, number>; order: string[] }) {
  const shown = order.filter(k => counts[k])
  if (!shown.length) return null
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
      {shown.map(k => (
        <span key={k} className="inline-flex items-center gap-2 text-[15px] text-gray-700">
          <span className={`w-2 h-2 rounded-full shrink-0 ${ELEMENT_DOT[k] ?? 'bg-gray-400'}`} />
          <span className="tabular-nums font-semibold text-gray-900">{counts[k]}</span>
          <span>{ELEMENT_WORD[k] ?? k}</span>
        </span>
      ))}
    </div>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 mt-10 mb-3">
      {children}
    </h3>
  )
}

/** One claim, set as prose. */
function Claim({ f }: { f: Finding }) {
  const quiet = f.standing === 'not raised by these facts'
  return (
    <article className="break-inside-avoid mt-9 first:mt-0">
      <h4 className="font-sans text-[17px] font-bold text-gray-900 flex items-baseline gap-3 flex-wrap">
        {claimTitle(f.claimId)}
        <span
          className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            f.standing === 'elements met'
              ? 'bg-green-100 text-green-800'
              : f.standing === 'gaps to close'
              ? 'bg-amber-100 text-amber-800'
              : f.standing === 'blocked'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {f.standing}
        </span>
      </h4>

      {quiet ? (
        <p className="mt-2 text-[15px] leading-[1.75] text-gray-500 italic">
          Not raised by these facts. The elements were read and none of them found support in the
          ledger.
        </p>
      ) : null}

      {(f.elements ?? []).map(e => (
        <section key={e.key} className="mt-5">
          <p className="font-sans text-[13px] font-semibold text-gray-800 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ELEMENT_DOT[e.state] ?? 'bg-gray-400'}`} />
            {elementWords(e.key)}
            <span className="font-normal text-gray-500">— {ELEMENT_WORD[e.state] ?? e.state}</span>
          </p>
          <p className="mt-1.5 text-[15px] leading-[1.75] text-gray-800">{shortRef(e.reasoning)}</p>
          {e.wouldSettleIt && (
            <p className="mt-2 text-[14px] leading-[1.7] text-gray-600 border-l-2 border-gray-200 pl-4">
              <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                What would settle it
              </span>
              {shortRef(e.wouldSettleIt)}
            </p>
          )}
        </section>
      ))}

      {f.adverse?.length > 0 && (
        <section className="mt-5">
          <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-red-600 mb-1.5">
            Cuts against us
          </p>
          <ul className="space-y-1.5">
            {f.adverse.map((a, i) => (
              <li key={i} className="text-[15px] leading-[1.7] text-gray-800 flex gap-2.5">
                <span className="text-gray-300 shrink-0 select-none">—</span>
                <span>{shortRef(a)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {f.defense && (
        <section className="mt-5">
          <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            The defence to expect
          </p>
          <p className="text-[15px] leading-[1.75] text-gray-800">{shortRef(f.defense)}</p>
        </section>
      )}

      {f.damagesMissing?.length ? (
        <section className="mt-5">
          <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            No figure can be stated until
          </p>
          <ul className="space-y-1.5">
            {f.damagesMissing.map((d, i) => (
              <li key={i} className="text-[15px] leading-[1.7] text-gray-800 flex gap-2.5">
                <span className="text-gray-300 shrink-0 select-none">—</span>
                <span>{shortRef(d)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}

export default function ReadingDocument({
  clientName,
  findings,
  choice,
  facts,
  readOn,
}: {
  clientName: string
  findings: Finding[]
  choice?: Choice
  facts: number
  readOn?: string | null
}) {
  const s = summarise(findings)
  const order = ['supported', 'partially supported', 'contradicted', 'needs authority', 'unknown']

  return (
    // The sheet: a measure of about ninety characters on a grey desk, with
    // the inch of margin a page has. Narrower screens lose the desk and the
    // margin rather than the text.
    <div className="bg-gray-100 px-0 sm:px-6 py-0 sm:py-6 print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-[52rem] bg-white sm:shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)] sm:rounded-sm px-6 sm:px-14 py-10 sm:py-14 print:shadow-none print:max-w-none font-serif">
        <header className="border-b border-gray-200 pb-5">
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
            Claims and evidence — staff reading, never shown to a client
          </p>
          <h2 className="font-sans text-2xl font-bold text-gray-900 mt-1.5">{clientName}</h2>
          <p className="font-sans text-[13px] text-gray-500 mt-1">
            {s.claims} claim{s.claims === 1 ? '' : 's'} read against {facts} fact
            {facts === 1 ? '' : 's'} on file
            {readOn ? ` · ${new Date(readOn).toLocaleDateString()}` : ''}
          </p>
        </header>

        {/* ── Summary ─────────────────────────────────────────────── */}
        <Heading>In short</Heading>

        {choice?.proposal?.order && (
          <p className="text-[15px] leading-[1.75] text-gray-800">
            The employer is read as falling under{' '}
            <strong className="font-semibold">IWC Wage Order {choice.proposal.order}</strong> —{' '}
            {choice.proposal.industry}.{' '}
            <span className="text-amber-800 bg-amber-50 px-1 rounded">
              This is proposed, not confirmed; an attorney settles it.
            </span>{' '}
            Every rest-period and hours finding below depends on it.
          </p>
        )}

        <p className="text-[15px] leading-[1.75] text-gray-800 mt-3">
          Of {s.claims} claims read,{' '}
          {Object.entries(s.byStanding)
            .map(([k, n]) => `${n} ${k}`)
            .join(', ')}
          . Across their elements:
        </p>
        <Tally counts={s.byState} order={order} />

        {s.strongest.length > 0 && (
          <p className="text-[15px] leading-[1.75] text-gray-800 mt-4">
            <strong className="font-semibold">Where the case is strongest:</strong>{' '}
            {s.strongest.map(f => claimTitle(f.claimId)).join(', ')}.
            {s.thinnest.length > 0 && (
              <>
                {' '}
                <strong className="font-semibold">Where it is thinnest:</strong>{' '}
                {s.thinnest.map(t => `${claimTitle(t.claim.claimId)} (${t.unknown} unsettled)`).join(', ')}.
              </>
            )}
          </p>
        )}

        {s.adverseCount > 0 && (
          <p className="text-[15px] leading-[1.75] text-gray-800 mt-3">
            {s.adverseCount} fact{s.adverseCount === 1 ? ' cuts' : 's cut'} against us across the
            claims, set out under each below. Several are the client&rsquo;s own answers.
          </p>
        )}

        {s.wouldSettle.length > 0 && (
          <>
            <Heading>What to get next</Heading>
            <p className="text-[15px] leading-[1.75] text-gray-800">
              {s.wouldSettle.length} element{s.wouldSettle.length === 1 ? ' is' : 's are'} unsettled
              and each names what would settle it:
            </p>
            <ul className="mt-2.5 space-y-2">
              {s.wouldSettle.map((w, i) => (
                <li key={i} className="text-[15px] leading-[1.7] text-gray-800 flex gap-2.5">
                  <span className="text-gray-300 shrink-0 select-none">—</span>
                  <span>
                    <span className="font-sans text-[12px] font-semibold text-gray-500 mr-1.5">
                      {claimTitle(w.claim)}:
                    </span>
                    {shortRef(w.want)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {s.damagesMissing.length > 0 && (
          <>
            <Heading>Before any number is stated</Heading>
            <ul className="space-y-2">
              {s.damagesMissing.map((d, i) => (
                <li key={i} className="text-[15px] leading-[1.7] text-gray-800 flex gap-2.5">
                  <span className="text-gray-300 shrink-0 select-none">—</span>
                  <span>
                    <span className="font-sans text-[12px] font-semibold text-gray-500 mr-1.5">
                      {claimTitle(d.claim)}:
                    </span>
                    {shortRef(d.want)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── The claims themselves ───────────────────────────────── */}
        <Heading>The claims, one by one</Heading>
        {findings.map(f => (
          <Claim key={f.claimId} f={f} />
        ))}

        {choice?.proposal?.reliedOn && (
          <footer className="mt-12 pt-5 border-t border-gray-200">
            <p className="font-sans text-[11px] leading-[1.7] text-gray-400">
              Wage Order read out of: {choice.proposal.reliedOn}
              {choice.dlse && (
                <>
                  {' · '}Labor Commissioner&rsquo;s index: {choice.dlse.entry} → Order{' '}
                  {choice.dlse.orders}
                  {choice.dlse.agrees ? '' : ' (disagrees with the proposal above)'}
                </>
              )}
            </p>
          </footer>
        )}
      </div>
    </div>
  )
}
