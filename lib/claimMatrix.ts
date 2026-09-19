/**
 * Maps the facts on file onto the elements of each claim.
 *
 * The corpus calls this the law-to-fact translation engine, and its output is
 * "an applied proof capsule, not a generic legal memo" (sec. 7). What that
 * means concretely: for each element, which facts bear on it, whether they
 * establish it, and — where they do not — the one thing that would.
 *
 * The design that makes this checkable rather than fluent:
 *
 *   The ELEMENTS come from lib/authority/claims.ts, not from the model. The
 *   model is never asked what a claim requires.
 *
 *   The STATUTE TEXT is quoted into the prompt from lib/authority, in full. The
 *   model is never asked what a section says.
 *
 *   The FACTS come from the ledger, each with its id. Every finding must cite
 *   the fact ids it rests on, so a reader can follow any conclusion back to a
 *   client's own words and the question that produced them.
 *
 * What is left to the model is the judgement it is actually good at: does this
 * proposition, in this client's words, satisfy this element, in the statute's
 * words. Everything else is data.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { CLAIMS, Claim } from '@/lib/authority/claims'
import { cite, quote } from '@/lib/authority'
import { LedgerEntry, standing } from '@/lib/factLedger'
import { plainly } from '@/lib/modelErrors'

export const MATRIX_MODEL = 'claude-opus-5'

/**
 * How an element stands on the present record.
 *
 * The corpus's four, plus one it implies: an element the office cannot answer
 * because the governing authority is not on file is not "unknown" — the facts
 * may be perfectly clear. It is unresolved for a different reason, and the fix
 * is different too.
 */
const ElementState = z.enum([
  'supported',
  'partially supported',
  'contradicted',
  'unknown',
  'needs authority',
])
export type ElementState = z.infer<typeof ElementState>

const ElementFinding = z.object({
  key: z.string(),
  state: ElementState,
  /**
   * Fact ids from the ledger, and nothing else.
   *
   * A finding that cites no fact is a finding about nothing. Where the state is
   * 'unknown' this may legitimately be empty — that IS the finding.
   */
  facts: z.array(z.string()),
  /** How those facts meet, or fail to meet, the element's own words. */
  reasoning: z.string(),
  /** The single fact that would most change this element's state. */
  wouldSettleIt: z.string(),
})

const ClaimFinding = z.object({
  claimId: z.string(),
  /**
   * Whether the office can presently make out the claim.
   *
   * Not a prediction and not a recommendation — a reading of the elements as
   * they currently stand.
   */
  standing: z.enum(['elements met', 'gaps to close', 'blocked', 'not raised by these facts']),
  elements: z.array(ElementFinding),
  /** The defence these particular facts invite, and what in the record answers it. */
  defense: z.string(),
  /** Facts that cut against the claim. Stated here, not buried. */
  adverse: z.array(z.string()),
  /** Damages inputs this claim needs that the ledger already supplies, by fact id. */
  damagesInputs: z.array(z.string()),
  /** Damages inputs it needs and the ledger does not have. */
  damagesMissing: z.array(z.string()),
})
export type ClaimFinding = z.infer<typeof ClaimFinding>

const SYSTEM = `You map established facts onto the elements of a claim for a California employment
law office. You are not deciding what the law is — the elements are given to you, and the text
of every section they are read from is quoted in full. Your job is the matching.

RULES

1. CITE FACTS BY ID. Every element finding lists the fact ids it rests on. A reader must be
   able to follow any conclusion back to the client's own words. Never cite a fact id that is
   not in the list you were given.

2. DO NOT RESTATE THE LAW. The element says what must be true. You say whether these facts
   make it true. Do not explain the statute back; the reader has it.

3. THE STATES MEAN DIFFERENT THINGS.
   supported            the facts establish the element.
   partially supported  they establish part of it, or establish it for some periods only.
   contradicted         a fact on file cuts against it. Name the fact.
   unknown              the facts on file do not reach it. This is common and is a real
                        answer — say what is missing rather than reaching.
   needs authority      the element is marked as needing an authority the office does not
                        have. Use this state, say what facts you DO have, and stop. Do not
                        supply the missing rule from memory. This is the single most important
                        rule on this page.

4. A DISPUTED FACT IS NOT PROOF. Where the facts you are given are marked DISPUTED, an element
   resting on them is at best 'partially supported', and the reasoning says which side of the
   dispute it depends on.

5. ADVERSE FACTS GO IN THE FINDING. If something in this client's own answers hurts the claim,
   it goes in 'adverse' — not omitted, not softened. The corpus requires the strongest defence
   to be stated before opposing counsel states it.

6. NEVER SUPPLY A FIGURE. Rates, caps, penalty amounts and minimum wages are read off the
   statute or they are not stated. If the section in front of you gives a figure, you may use
   it. If it does not, say the figure has to be read off the provision.

You are producing internal work product for a lawyer. Be direct and specific. No hedging
language, no reassurance, and nothing that reads as advice to a client.`

/** One claim's elements and the sections behind them, ready to hand to the model. */
function brief(claim: Claim): string {
  const sections = Array.from(new Set([...claim.sections, ...claim.elements.map(e => e.from)]))
  const quoted = quote(
    sections.map(s => {
      const [law, num] = s.split(' ')
      return { law, num }
    })
  )
  const elements = claim.elements
    .map(
      e =>
        `- key: ${e.key}\n  must be true: ${e.says}\n  read from: ${cite(
          ...(e.from.split(' ') as [string, string])
        )}` + (e.needsAuthority ? `\n  AUTHORITY NOT ON FILE: ${e.needsAuthority}` : '')
    )
    .join('\n\n')

  return `CLAIM: ${claim.name}
REMEDY THE STATUTE GIVES: ${claim.remedy}
DEFENCE THE OFFICE EXPECTS: ${claim.expectedDefense}

ELEMENTS (these are the elements; do not add or remove any):

${elements}

=== THE SECTIONS, IN FULL ===

${quoted}`
}

/** The ledger as the model sees it: id, status, proposition, and where it came from. */
export function factSheet(entries: LedgerEntry[]): string {
  return standing(entries)
    .map(
      e =>
        `${e.id} [${e.status}] ${e.proposition}` +
        (e.period ? ` (period: ${e.period})` : '') +
        (e.contrary ? `\n    CUTS AGAINST: ${e.contrary}` : '') +
        `\n    from: ${e.provenance.pinpoint}`
    )
    .join('\n')
}

async function mapWithLimit<T, R>(items: T[], limit: number, run: (i: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      out[i] = await run(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

/** Claims read at the same time — each one is independent of the others. */
const CLAIM_CONCURRENCY = 5

/**
 * Reads the ledger against every claim.
 *
 * One call per claim rather than one call for all of them: each needs its own
 * sections quoted in full, and a single call carrying ten claims' worth of
 * statute text would spend most of its budget on law the claim in hand does not
 * need.
 */
export async function buildMatrix(
  entries: LedgerEntry[],
  claims: Claim[] = CLAIMS
): Promise<ClaimFinding[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured, so the matrix cannot be built.')
  }
  const facts = factSheet(entries)
  if (!facts.trim()) return []

  const client = new Anthropic({ maxRetries: 2 })

  return mapWithLimit(claims, CLAIM_CONCURRENCY, async claim => {
    let response
    try {
      response = await client.messages
        .stream({
          model: MATRIX_MODEL,
          max_tokens: 24000,
          system: SYSTEM,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium', format: zodOutputFormat(ClaimFinding) },
          messages: [
            {
              role: 'user',
              content: `${brief(claim)}\n\n=== FACTS ON FILE ===\n\n${facts}`,
            },
          ],
        })
        .finalMessage()
    } catch (err) {
      throw plainly(err, `${claim.name} matrix`)
    }
    if (response.stop_reason === 'max_tokens') {
      throw new Error(`The ${claim.name} matrix ran out of room. Run it again.`)
    }
    const parsed = response.parsed_output
    if (!parsed) throw new Error(`The ${claim.name} matrix came back unreadable.`)
    // The model is told to use the claim's own id; make certain of it, because
    // everything downstream joins on it.
    return { ...parsed, claimId: claim.id }
  })
}

/** Claims worth a lawyer's attention first. */
export function ranked(findings: ClaimFinding[]): ClaimFinding[] {
  const order: ClaimFinding['standing'][] = [
    'elements met',
    'gaps to close',
    'blocked',
    'not raised by these facts',
  ]
  return [...findings].sort((a, b) => order.indexOf(a.standing) - order.indexOf(b.standing))
}

/** Every element the office cannot answer, and why — the development plan. */
export function unresolved(findings: ClaimFinding[]) {
  return findings.flatMap(f =>
    f.elements
      .filter(e => e.state === 'unknown' || e.state === 'needs authority')
      .map(e => ({ claimId: f.claimId, element: e.key, state: e.state, need: e.wouldSettleIt }))
  )
}
