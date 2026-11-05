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

/** Each Order's industry, as the Orders title themselves. For a person choosing one. */
export const ORDER_NAMES: Record<string, string> = {
  '1': 'Manufacturing',
  '2': 'Personal Service',
  '3': 'Canning, Freezing and Preserving',
  '4': 'Professional, Technical, Clerical, Mechanical and Similar Occupations',
  '5': 'Public Housekeeping',
  '6': 'Laundry, Linen Supply, Dry Cleaning and Dyeing',
  '7': 'Mercantile',
  '8': 'Handling Products After Harvest',
  '9': 'Transportation',
  '10': 'Amusement and Recreation',
  '11': 'Broadcasting',
  '12': 'Motion Picture',
  '13': 'Preparing Agricultural Products for Market, on the Farm',
  '14': 'Agricultural Occupations',
  '15': 'Household Occupations',
  '16': 'On-Site Construction, Drilling, Logging and Mining',
  '17': 'Miscellaneous Employees',
}

/** Carried into every finding that rests on the choice. */
export function wageOrderCaveat(order: string, chosenByAttorney = false): string {
  if (!order) return 'No Wage Order proposed. The rest-period duty cannot be stated until one is settled.'
  return chosenByAttorney
    ? `IWC Wage Order ${order}, chosen by an attorney. Every rest-period and hours finding below depends on it.`
    : `Proposed IWC Wage Order ${order}, not confirmed by an attorney. Every rest-period and hours finding below depends on it.`
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
    caveat: wageOrderCaveat(order, choice.confirmed === true),
  } as unknown as T
}

/** Whether the pamphlet's entry for this business lists this Order. */
function withAgreement(dlse: WageOrderChoice['dlse'], order: string): WageOrderChoice['dlse'] {
  return dlse && { ...dlse, agrees: dlse.orders.split(/[^0-9]+/).filter(Boolean).includes(order) }
}

/**
 * An attorney's answer, laid over what the model proposed.
 *
 * This is the decision the whole module defers to, so nothing checks it: an
 * attorney may choose an Order the model ruled out. What the model said is kept
 * beside it, so the choice can be taken back and the reasoning still reads.
 */
export function chooseOrder(choice: WageOrderChoice, order: string, at: string): WageOrderChoice {
  const chosen = orderNumber(order)
  if (!chosen) throw new Error(`"${order}" is not one of the seventeen Wage Orders.`)
  return {
    ...choice,
    proposal: { ...choice.proposal, order: chosen },
    dlse: withAgreement(choice.dlse, chosen),
    confirmed: true,
    chosen: { at, modelSaid: choice.chosen ? choice.chosen.modelSaid : orderNumber(choice.proposal.order) },
    caveat: wageOrderCaveat(chosen, true),
  }
}

/** Back to what the model proposed. */
export function takeBackOrder(choice: WageOrderChoice): WageOrderChoice {
  if (!choice.chosen) return choice
  const { chosen, ...rest } = choice
  return {
    ...rest,
    proposal: { ...rest.proposal, order: chosen.modelSaid },
    dlse: withAgreement(rest.dlse, chosen.modelSaid),
    confirmed: false,
    caveat: wageOrderCaveat(chosen.modelSaid),
  }
}

/**
 * The question that would settle the Order, while none is settled.
 *
 * Handed to the round of questions, so that when the office asks the client,
 * this is among what gets asked. Empty once there is an Order to read under.
 */
export function openOrderQuestion(stored: unknown): string {
  const choice = stored as WageOrderChoice | null | undefined
  if (!choice?.proposal || orderNumber(choice.proposal.order)) return ''
  return String(choice.proposal.whatWouldSettleIt ?? '').trim()
}
