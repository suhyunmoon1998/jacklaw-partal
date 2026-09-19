/**
 * Which Wage Order governs this employer — proposed, never decided.
 *
 * The Labor Code does not state the rest-period duty. Section 226.7 supplies
 * the premium and points at "an applicable statute, or applicable regulation,
 * standard, or order of the Industrial Welfare Commission" for the duty
 * itself, which lives in section 12 of one of seventeen Orders. Until the
 * office knows which Order, the strongest theory in a restaurant case cannot
 * be reached at all — the matrix reports the element as needing an authority
 * that is, in fact, sitting on file seventeen times over.
 *
 * Which one applies turns on the employer's industry. That is a legal
 * classification, so this module does not make it. It reads the Orders' own
 * applicability and definition language against the facts and PROPOSES one,
 * with the provision it relied on, the facts it relied on, and the orders it
 * rejected and why. An attorney confirms it or does not. Nothing downstream
 * treats an unconfirmed proposal as settled, and the proposal travels with
 * every finding that rests on it.
 *
 * Two sources, deliberately unequal:
 *
 *   THE ORDERS THEMSELVES decide it. Each one's section 1 says what industry
 *   it applies to and each one's section 2 defines that industry — Order 5's
 *   definition of the public housekeeping industry names restaurants in its
 *   own text. That is primary and it is what the model is asked to read.
 *
 *   THE DLSE'S CLASSIFICATION PAMPHLET is consulted afterwards, in code, as a
 *   cross-check. It is secondary, it says so itself — "courts are not required
 *   to follow the classifications of occupations listed herein and ...
 *   compliance with the guidelines suggested herein do not establish a 'safe
 *   harbor'" — and the corpus is explicit that no material conclusion rests on
 *   a secondary source. So it never reaches the model that forms the proposal.
 *   It either agrees, or it disagrees and the office has a reason to look
 *   harder.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import dlseData from '@/lib/authority/dlseClassifications.json'
import { section } from '@/lib/authority'
import { LedgerEntry } from '@/lib/factLedger'
import { factSheet } from '@/lib/claimMatrix'
import { plainly } from '@/lib/modelErrors'

export const CHOICE_MODEL = 'claude-opus-5'

/** The seventeen industry orders. MW is the minimum wage order and governs nobody's industry. */
export const ORDERS = Array.from({ length: 17 }, (_, i) => String(i + 1))

type Dlse = {
  guide: string
  index: Record<string, { orders: string; mark: string }>
  meta: Record<string, string>
}
const DLSE = dlseData as unknown as Dlse

export const Proposal = z.object({
  /** The order number, as '5'. Empty when the facts do not reach it. */
  order: z.string(),
  /** The industry, in the Order's own words. */
  industry: z.string(),
  /**
   * What the establishment is, in plain business terms: 'restaurant', 'retail
   * store', 'nursing home'.
   *
   * Separate from `industry` because the DLSE's index is keyed on businesses
   * and not on the Orders' industry names — looking up "public housekeeping
   * industry" in it finds nothing, and a fuzzy match on it finds the wrong
   * thing, which is worse.
   */
  businessIs: z.string(),
  /** The provision relied on, as 'IWC 5 sec 2' — the text that decides it. */
  reliedOn: z.string(),
  /** How that language covers this employer. Not a restatement of the Order. */
  because: z.string(),
  /** Fact ids establishing what this employer does. */
  facts: z.array(z.string()),
  /** Orders that could plausibly apply and the language that rules them out. */
  rejected: z.array(z.object({ order: z.string(), why: z.string() })),
  /**
   * The fact that would settle it, where the facts on file do not.
   *
   * A restaurant inside a department store, a caterer, a business whose main
   * purpose is contested — these are decided by facts nobody has asked for yet.
   */
  whatWouldSettleIt: z.string(),
})
export type Proposal = z.infer<typeof Proposal>

export interface WageOrderChoice {
  proposal: Proposal
  /** What the DLSE pamphlet says for the industry proposed, or null. */
  dlse: { entry: string; orders: string; agrees: boolean } | null
  /** Always false here. Only an attorney sets it, and only elsewhere. */
  confirmed: false
  /** Carried into every finding that rests on the choice. */
  caveat: string
}

const SYSTEM = `You read the Industrial Welfare Commission's Wage Orders against what a California
employer actually does, and propose which Order covers it. You are proposing, not deciding: an
attorney confirms this, and your output is written so they can check it in a minute.

RULES

1. THE ORDERS' OWN WORDS DECIDE IT. Each Order's section 1 states the industry it applies to
   and its section 2 defines that industry. Both are quoted to you in full. Read them. Do not
   reason from what you know about how California classifies businesses.

2. NAME THE PROVISION. 'reliedOn' is the section whose language covers this employer — the
   definition that names this kind of establishment, or the applicability sentence that does.

3. 'businessIs' IS THE PLAIN NAME FOR THE ESTABLISHMENT — 'restaurant', 'retail store',
   'nursing home' — not the Order's industry label. It is looked up afterwards against the
   Labor Commissioner's index of businesses, as a check on this proposal.

4. CITE FACTS BY ID, bare ids only, from the list given. What the employer does is a fact
   question and the proposal has to rest on facts in the ledger, not on the case's flavour.

5. RULE OUT THE NEAR MISSES. A restaurant is not a mercantile business, but a coffee counter
   inside a shop might be either. List the Orders that could plausibly apply and quote what in
   their language excludes this employer. An empty 'rejected' list on a close question is a
   failure to do the work.

6. WHERE THE FACTS DO NOT REACH IT, SAY SO. Leave 'order' empty and put in 'whatWouldSettleIt'
   the exact question that would answer it. An Order proposed on a guess is worse than none:
   it silently changes what duty the employer owed.

7. ONE ORDER. Where a business has genuinely separate operations under separate management,
   say that in 'whatWouldSettleIt' rather than proposing two.

You are producing internal work product for a lawyer. Be direct. No hedging and no reassurance.`

/**
 * Each Order's applicability sentence, before the exemptions begin.
 *
 * Section 1 is thirteen thousand characters, and all but the opening is the
 * executive, administrative and professional exemption tests — which decide
 * whether this employee is covered, a different question asked later.
 */
export function applicability(order: string): string {
  const text = section('IWC', `${order} sec 1`)
  if (!text) return ''
  const flat = text.replace(/\s+/g, ' ').trim()
  const m = flat.match(/This (?:wage )?order shall apply to all persons employed[^]*?(?=, except that|\. \([A-Z]\)|$)/)
  return (m ? m[0] : flat).slice(0, 600)
}

/** What an Order is, as the Order says it: the applicability sentence and every definition. */
function orderBrief(order: string): string {
  const defs = section('IWC', `${order} sec 2`) ?? '(this Order has no definitions section)'
  return `=== IWC WAGE ORDER ${order} ===

SECTION 1, APPLICABILITY (opening; the exemption tests that follow are not reproduced):
${applicability(order) || '(not on file)'}

SECTION 2, DEFINITIONS, in full:
${defs}`
}

/**
 * Words, lowercased and crudely singularized, with the joining words dropped.
 *
 * Dropped by a list and not by length. Filtering out anything under four
 * letters looked tidy and lost the word that decides it: "dry cleaning"
 * became "cleaning", which matched "Sewer cleaning — Order 5" instead of
 * "Dry cleaning — Order 6". The short word is often the whole distinction.
 */
const JOINING = [
  'and', 'or', 'the', 'of', 'for', 'in', 'on', 'at', 'to', 'by', 'with', 'a', 'an',
  'if', 'see', 'etc', 'other', 'than', 'not', 'no', 'any', 'all', 'from', 'when',
  'including', 'include', 'includes', 'its', 'is', 'are', 'order', 'orders',
]
function terms(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map(w => (w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .filter(w => !JOINING.includes(w))
}

/**
 * What the DLSE pamphlet says about this kind of business, looked up afterwards.
 *
 * Every term in the query must appear in the index entry, and the shortest
 * qualifying entry wins. Loose scoring was tried and had to go: it answered
 * "restaurant" with "Fruit and vegetables, preparing for restaurant, bakeries,
 * etc. — Order 1", which is not a weak cross-check but a wrong one, and a
 * wrong cross-check that agrees with nothing is worse than no cross-check at
 * all.
 *
 * Null means the pamphlet has no entry to compare, which is common and is not
 * disagreement. It is reported as null rather than as assent.
 */
export function dlseOn(businessIs: string, order: string): WageOrderChoice['dlse'] {
  const want = terms(businessIs)
  if (!want.length) return null
  let best: [string, string] | null = null
  let bestSize = Infinity
  for (const [name, row] of Object.entries(DLSE.index)) {
    const have = terms(name)
    if (!want.every(w => have.includes(w))) continue
    if (have.length < bestSize) {
      bestSize = have.length
      best = [name, row.orders]
    }
  }
  if (!best) return null
  return {
    entry: best[0],
    orders: best[1],
    agrees: best[1].split(/[^0-9]+/).filter(Boolean).includes(order),
  }
}

/** The pamphlet's own account of how to classify, for a reader who wants it. */
export function dlseGuide(): { text: string; standing: string; source: string } {
  return {
    text: DLSE.guide,
    standing: DLSE.meta.standing,
    source: DLSE.meta.title,
  }
}

/**
 * Proposes the governing Wage Order from the facts on file.
 *
 * One call, with all seventeen Orders' applicability and definitions in front
 * of the model. Seventeen separate calls would each be asked "does this one
 * fit", which is the wrong question — choosing between them is the work, and
 * a model that cannot see Order 7 cannot explain why Order 5 beats it.
 */
export async function proposeWageOrder(entries: LedgerEntry[]): Promise<WageOrderChoice> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured, so the Wage Order cannot be proposed.')
  }
  const client = new Anthropic({ maxRetries: 2 })
  const orders = ORDERS.map(orderBrief).join('\n\n')

  let response
  try {
    response = await client.messages
      .stream({
        model: CHOICE_MODEL,
        max_tokens: 16000,
        system: SYSTEM,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium', format: zodOutputFormat(Proposal) },
        messages: [
          {
            role: 'user',
            // Seventeen Orders' applicability and definitions, about 21,000
            // tokens, and identical for every client this firm will ever have
            // — the best cache prefix in the system. It was being sent whole
            // on every reading. The facts, which differ per client, follow it.
            content: [
              { type: 'text', text: orders, cache_control: { type: 'ephemeral' } },
              { type: 'text', text: `=== FACTS ON FILE ===\n\n${factSheet(entries)}` },
            ],
          },
        ],
      })
      .finalMessage()
  } catch (err) {
    throw plainly(err, 'Wage Order reading')
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('The Wage Order reading ran out of room. Run it again.')
  }
  const proposal = response.parsed_output
  if (!proposal) throw new Error('The Wage Order reading came back unreadable.')

  return {
    proposal,
    dlse: proposal.order ? dlseOn(proposal.businessIs, proposal.order) : null,
    confirmed: false,
    caveat:
      proposal.order
        ? `Proposed IWC Wage Order ${proposal.order}, not confirmed by an attorney. Every rest-period and hours finding below depends on it.`
        : 'No Wage Order proposed. The rest-period duty cannot be stated until one is settled.',
  }
}
