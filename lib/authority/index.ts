/**
 * The statutes the office's readings are allowed to cite.
 *
 * Full text, fetched from the Legislature's own site rather than retyped from
 * memory or quoted out of a treatise. That distinction is the corpus's, and it
 * is the difference between an analysis a lawyer can file behind and one they
 * have to check line by line: "no material legal conclusion should rely only on
 * an old brief, AI output, summary, or secondary source without checking the
 * current controlling authority."
 *
 * Kept as a file in the repository so a citation is traceable to a version that
 * can be read and diffed, and so a reading is reproducible — the same answers
 * against the same statute text give the same result next month.
 *
 * Statute text is not eternal. FETCHED_ON is when this was pulled; anything
 * material should still be checked against the current section before it goes
 * into a filing, which is what the corpus's verification log is for.
 */

import data from './statutes.json'

/** When the text below was pulled from leginfo.legislature.ca.gov. */
export const FETCHED_ON = '2026-09-19'
export const SOURCE = 'leginfo.legislature.ca.gov — California Legislative Information'

type Statutes = {
  /** Keyed "LAB 226.7", "BPC 17200". */
  sections: Record<string, string>
  chapters: Record<
    string,
    { law: string; label: string; path: Record<string, string>; count: number; range: string[] }
  >
}

// The JSON is inferred with literal keys; the shape is what matters here.
const STATUTES = data as unknown as Statutes

export const LAW_NAME: Record<string, string> = {
  LAB: 'Lab. Code',
  BPC: 'Bus. & Prof. Code',
}

/**
 * One section's text, or null.
 *
 * Null rather than a throw, and never a guess: a reading that cannot find the
 * section it wants must say the authority is missing, not proceed on what it
 * remembers the section to say.
 */
export function section(law: string, num: string): string | null {
  return STATUTES.sections[`${law} ${num}`] ?? null
}

/** How the office cites it. */
export function cite(law: string, num: string): string {
  return `${LAW_NAME[law] ?? law} § ${num}`
}

/** Every section on file, for a reading that needs to know what it may rely on. */
export function available(): { law: string; num: string; cite: string }[] {
  return Object.keys(STATUTES.sections).map(k => {
    const [law, num] = k.split(' ')
    return { law, num, cite: cite(law, num) }
  })
}

/** The chapters that were pulled, for the verification log. */
export function chapters() {
  return Object.entries(STATUTES.chapters).map(([key, c]) => ({ key, ...c }))
}

/**
 * The sections a reading is handed, with their text.
 *
 * Only what was asked for. The whole corpus is eight hundred thousand
 * characters and sending it would cost more than it is worth on every call —
 * the claim decides which provisions are in play, and those are quoted in full.
 */
export function quote(wanted: { law: string; num: string }[]): string {
  const parts: string[] = []
  for (const { law, num } of wanted) {
    const text = section(law, num)
    if (!text) {
      parts.push(`${cite(law, num)} — NOT ON FILE. Do not state what this section says.`)
      continue
    }
    parts.push(`=== ${cite(law, num)} ===\n${text}`)
  }
  return parts.join('\n\n')
}
