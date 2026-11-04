import type { WageOrderChoice } from '@/lib/wageOrderChoice'

/**
 * A Wage Order's number, however the model wrote it.
 *
 * Every lookup is built from this: 'IWC {order} sec 12' has to come out as
 * 'IWC 5 sec 12' or the provision is not found. The field is free text, because
 * a closed set in an output schema costs the whole call when one value misses
 * (CLAUDE.md), so the number is read out of it here instead.
 *
 * Two real readings came back as "IWC Wage Order 5" and "IWC Wage Order 9". The
 * lookup missed, the matrix was told the Order was NOT ON FILE, and the rest
 * period duty, the overtime exemption and the minimum wage all reported as
 * needing authority on two files whose Order was sitting in the library.
 *
 * Pure and free of the model SDK, so anything can import it.
 */

/** The seventeen industry orders. MW is the minimum wage order and governs nobody's industry. */
export const ORDERS = Array.from({ length: 17 }, (_, i) => String(i + 1))

const LEADS_WITH_ORDER = /^\s*(?:IWC\s+)?(?:Wage\s+)?(?:Order\s+)?(?:No\.?\s*)?(\d{1,2})(?!\d)([^]*)$/i
const NAMES_ANOTHER = /(?:\bor\b|\band\b|[/&,])\s*(?:IWC\s+)?(?:Wage\s+)?(?:Order\s+)?\d/i

/**
 * The bare number, or '' when there is not exactly one Order in the text.
 *
 * "5 or 7" is empty rather than 5: choosing between them is the attorney's, and
 * the field saying no Order is the honest state of that proposal.
 */
export function orderNumber(raw: unknown): string {
  const found = String(raw ?? '').match(LEADS_WITH_ORDER)
  if (!found || NAMES_ANOTHER.test(found[2])) return ''
  const number = String(Number(found[1]))
  return ORDERS.includes(number) ? number : ''
}

/** Carried into every finding that rests on the choice. */
export function wageOrderCaveat(order: string): string {
  return order
    ? `Proposed IWC Wage Order ${order}, not confirmed by an attorney. Every rest-period and hours finding below depends on it.`
    : 'No Wage Order proposed. The rest-period duty cannot be stated until one is settled.'
}

/**
 * A proposal with its Orders written as numbers.
 *
 * New proposals pass through this before they are stored, and stored ones
 * whenever they are read, so a reading already on file is corrected without
 * being paid for again. Its claims then show as stale, because they were read
 * under the old value: that is true, and re-reading them is the office's call.
 */
export function tidyChoice<T>(stored: T): T {
  const choice = stored as unknown as WageOrderChoice | null | undefined
  if (!choice?.proposal) return stored
  const order = orderNumber(choice.proposal.order)
  return {
    ...choice,
    proposal: {
      ...choice.proposal,
      order,
      // A rejected entry that cannot be read as a number keeps its words for
      // the reader. It is never the number of the Order being proposed.
      rejected: (choice.proposal.rejected ?? []).map(r => ({ ...r, order: orderNumber(r.order) || r.order })),
    },
    caveat: wageOrderCaveat(order),
  } as unknown as T
}
