/**
 * The authorities the office's readings are allowed to cite.
 *
 * Full text, fetched from the issuing body rather than retyped from memory or
 * quoted out of a treatise. That distinction is the corpus's, and it is the
 * difference between an analysis a lawyer can file behind and one they have to
 * check line by line: "no material legal conclusion should rely only on an old
 * brief, AI output, summary, or secondary source without checking the current
 * controlling authority."
 *
 * Four bodies of authority are on file, and they answer different questions:
 *
 *   STATUTES (Lab. Code, Bus. & Prof. Code, Code Civ. Proc.) — what is owed,
 *   what the remedy is, and how long there is to sue. From the Legislature.
 *
 *   WAGE ORDERS — the duties the Labor Code points at without stating. Rest
 *   periods are section 12 of an Order, not a section of the Code, and section
 *   226.7 supplies only the premium. From the Department of Industrial
 *   Relations. Which Order applies depends on the employer's industry, which
 *   is a legal classification and is not decided here.
 *
 *   CACI — the Judicial Council's statement of what a jury must find, with the
 *   controlling cases collected under each instruction. Not itself authority:
 *   it is the office's index into the cases, and the "Sources and Authority"
 *   notes are why it is worth holding.
 *
 * Kept as files in the repository so a citation is traceable to a version that
 * can be read and diffed, and so a reading is reproducible — the same answers
 * against the same text give the same result next month.
 *
 * None of it is eternal. FETCHED_ON records when each body was pulled, and
 * anything material should still be checked against the current text before it
 * goes into a filing, which is what the corpus's verification log is for.
 */

import statuteData from './statutes.json'
import wageOrderData from './wageOrders.json'
import caciData from './caci.json'

/** When each body of authority was pulled, and from where. */
export const FETCHED_ON: Record<string, { on: string; from: string }> = {
  statutes: { on: '2026-09-19', from: 'leginfo.legislature.ca.gov — California Legislative Information' },
  wageOrders: { on: '2026-09-18', from: 'dir.ca.gov — Industrial Welfare Commission Wage Orders' },
  caci: { on: '2026-09-18', from: "Judicial Council of California Civil Jury Instructions 2026 — the firm's own copy" },
  // The firm's copy is byte-identical to the Judicial Council's 2026 PDF. The
  // July 2026 supplement then revised eleven of the instructions held here —
  // 2740–2742 in the words the jury hears — and those are held as revised.
  caciSupplement: { on: '2026-09-24', from: 'Judicial Council of California Civil Jury Instructions (July 2026 supp.) — courts.ca.gov' },
  feha: { on: '2026-09-24', from: 'leginfo.legislature.ca.gov — Gov. Code §§ 12923, 12926, 12926.1, 12940, 12960, 12965' },
  // Opened in a real browser: the host serves the text only after JavaScript
  // runs, which is why an automated fetch saw an error page. Current through
  // Register 2026, No. 37 (9/11/26), as the page itself states.
  // Opened in a real browser from the City's official code host (American
  // Legal Publishing), "2026 Rev. 9 — current through legislation effective
  // June 30, 2026". The 2016 enacting ordinance the first fetch used had been
  // amended twice since (Ord. 187,456 in 2022, Ord. 188,111 in 2024), and its
  // scan carried OCR errors; neither is in the text held here.
  laMinimumWage: { on: '2026-09-24', from: 'codelibrary.amlegal.com — LAMC §§ 187.01, 187.02 (2026 Rev. 9); wagesla.lacity.gov — 2024–2026 rate notices' },
  fehaRegs: { on: '2026-09-24', from: 'govt.westlaw.com/calregs — Barclays Official California Code of Regulations, 2 CCR §§ 11065, 11068, 11069' },
  // Wage Order 5 § 4(E) sets the fast food minimum "in accordance with Labor
  // Code Section 1475", and the readings, told fast food carries its own
  // minimum, cited a section that was not here.
  fastFood: { on: '2026-09-25', from: 'leginfo.legislature.ca.gov — Lab. Code §§ 1474–1477 (Div. 2, Part 4.5.5, Fast Food)' },
}

type Keyed = { sections: Record<string, string> }
type Statutes = Keyed & {
  chapters: Record<
    string,
    { law: string; label: string; path: Record<string, string>; count: number; range: string[] }
  >
}

// The JSON is inferred with literal keys; the shape is what matters here.
const STATUTES = statuteData as unknown as Statutes
const WAGE_ORDERS = wageOrderData as unknown as Keyed
const CACI = caciData as unknown as Keyed

export const LAW_NAME: Record<string, string> = {
  LAB: 'Lab. Code',
  BPC: 'Bus. & Prof. Code',
  CCP: 'Code Civ. Proc.',
  GOV: 'Gov. Code',
  CCR2: 'Cal. Code Regs., tit. 2,',
  LAMC: 'L.A. Mun. Code',
  LAMW: 'L.A. Office of Wage Standards, minimum wage notice',
  IWC: 'IWC Wage Order',
  CACI: 'CACI No.',
}

/** Which file holds a given body of authority. */
function shelf(law: string): Keyed {
  if (law === 'IWC') return WAGE_ORDERS
  if (law === 'CACI') return CACI
  return STATUTES
}

/**
 * One provision's text, or null.
 *
 * Null rather than a throw, and never a guess: a reading that cannot find the
 * provision it wants must say the authority is missing, not proceed on what it
 * remembers the provision to say.
 *
 * `num` is what follows the body's name in the key — '226.7' for a statute,
 * '5 sec 12' for section 12 of Wage Order 5, '2766A' for an instruction.
 */
export function section(law: string, num: string): string | null {
  return shelf(law).sections[`${law} ${num}`] ?? null
}

/** How the office cites it. */
export function cite(law: string, num: string): string {
  if (law === 'IWC') {
    const [order, , sec] = num.split(' ')
    return sec ? `IWC Wage Order ${order}, § ${sec}` : `IWC Wage Order ${order}`
  }
  if (law === 'CACI') return `CACI No. ${num}`
  if (law === 'LAMW') return `${LAW_NAME.LAMW} (eff. ${num})`
  return `${LAW_NAME[law] ?? law} § ${num}`
}

/** Splits a key like 'IWC 5 sec 12' into the body and the rest. */
export function parseKey(key: string): { law: string; num: string } {
  const at = key.indexOf(' ')
  return at < 0 ? { law: key, num: '' } : { law: key.slice(0, at), num: key.slice(at + 1) }
}

/** Every provision on file, for a reading that needs to know what it may rely on. */
export function available(): { law: string; num: string; cite: string }[] {
  return [STATUTES, WAGE_ORDERS, CACI].flatMap(s =>
    Object.keys(s.sections).map(k => {
      const { law, num } = parseKey(k)
      return { law, num, cite: cite(law, num) }
    })
  )
}

/** The wage orders on file, by number. Which one applies is not decided here. */
export function wageOrders(): string[] {
  const seen: Record<string, true> = {}
  for (const k of Object.keys(WAGE_ORDERS.sections)) seen[parseKey(k).num.split(' ')[0]] = true
  return Object.keys(seen)
}

/** The chapters that were pulled, for the verification log. */
export function chapters() {
  return Object.entries(STATUTES.chapters).map(([key, c]) => ({ key, ...c }))
}

/**
 * The provisions a reading is handed, with their text.
 *
 * Only what was asked for. The library is over two million characters and
 * sending it would cost more than it is worth on every call — the claim decides
 * which provisions are in play, and those are quoted in full.
 */
export function quote(wanted: { law: string; num: string }[]): string {
  const parts: string[] = []
  for (const { law, num } of wanted) {
    const text = section(law, num)
    if (!text) {
      parts.push(`${cite(law, num)} — NOT ON FILE. Do not state what this provision says.`)
      continue
    }
    parts.push(`=== ${cite(law, num)} ===\n${text}`)
  }
  return parts.join('\n\n')
}
