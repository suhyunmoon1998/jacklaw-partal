/**
 * The decided cases, and the passages the office relies on.
 *
 * A statute can be quoted whole. A case cannot: Brinker is a hundred and
 * twenty thousand characters and the sentence that decides what "provide"
 * means is one of them. So this file does what claims.ts does for elements —
 * it names, in the repository, the passage that carries each rule, and the
 * matrix quotes that passage rather than asking a model what the case held.
 *
 * The reason is the same one and it is worth restating. A model asked "what
 * does Brinker hold" produces a fluent paragraph that is usually right, is
 * sometimes subtly wrong, and is never checkable. A model handed forty words
 * the Supreme Court actually wrote, and asked whether these facts satisfy
 * them, is doing something a lawyer can verify in a minute.
 *
 * WHAT MAKES THIS SAFE RATHER THAN MERELY CAREFUL
 *
 * Every `quote` below must appear, character for character, in the opinion
 * stored in cases.json. A test asserts it. A quotation that drifted — a tidied
 * ellipsis, a fixed typo, a remembered phrasing — fails the build. That is the
 * mechanism; the rest is discipline, and discipline is not a mechanism.
 *
 * WHAT THIS FILE DOES NOT DO
 *
 * It does not decide anything. `appliedTo` is the office's reading of what the
 * passage means for an element, written here to be argued with, and every
 * holding carries `limits` — what the passage does not decide — because the
 * way a case does damage is by being read past its holding.
 *
 * None of it is a substitute for an attorney reading the case. The corpus:
 * "no material legal conclusion should rely only on an old brief, AI output,
 * summary, or secondary source without checking the current controlling
 * authority."
 *
 * PINPOINTS
 *
 * The six opinions taken from the court's own PDFs carry slip-opinion pages,
 * marked in the stored text, and those are real and checkable. None of them
 * carries official reporter pages, and neither does Brinker, whose stored text
 * has no page markers of any kind. So no holding here states a reporter page.
 * A brief needs one, and a person has to add it. Saying nothing is the honest
 * option; the alternative is a citation that looks right and is not.
 */

import caseData from './cases.json'

type CaseRecord = {
  name: string
  citation: string
  decided: string
  docket: string
  court: string
  source: string
  fetchedOn: string
  pagination: string
  text: string
}
const CASES = (caseData as unknown as { cases: Record<string, CaseRecord> }).cases

export interface Holding {
  /** Stable, as 'brinker-provide-means-relieve'. */
  id: string
  /** The key in cases.json. */
  case: string
  /** What the office relies on it for, in one plain sentence. */
  proposition: string
  /** Verbatim from the opinion. Tested against the stored text. */
  quote: string
  /** 'slip op. p. 14', or empty where the stored text carries no pages. */
  pinpoint: string
  /** majority, concurrence, or dissent. A concurrence is not a holding. */
  opinionPart: 'majority' | 'concurrence' | 'dissent'
  /** Element keys this settles, as 'claim-id:element-key'. */
  bearsOn: string[]
  /** What the passage does NOT decide. Required, and not a formality. */
  limits: string
  /** The office's reading, for an attorney to argue with. */
  appliedTo: string
}

/** The cases held in full. */
export function caseNames(): { key: string; name: string; citation: string }[] {
  return Object.entries(CASES).map(([key, c]) => ({ key, name: c.name, citation: c.citation }))
}

export function caseRecord(key: string): CaseRecord | null {
  return CASES[key] ?? null
}

/** How the office cites it. */
export function citeCase(key: string): string {
  const c = CASES[key]
  return c ? `${c.name} ${c.citation}` : `[unknown case: ${key}]`
}

/** Does this quotation actually appear in the opinion? The whole guarantee. */
export function isVerbatim(h: Holding): boolean {
  const text = CASES[h.case]?.text
  if (!text) return false
  // Whitespace is the one thing allowed to differ: the stored text is wrapped
  // at the width of a printed page, so a passage spanning a line break carries
  // newlines a quotation would not. Nothing else is normalized away.
  const flat = (s: string) => s.replace(/\s+/g, ' ').trim()
  return flat(text).includes(flat(h.quote))
}

/**
 * A holding as the matrix hands it to the model.
 *
 * The quote leads, because the quote is the authority. Everything else is the
 * office talking, and it is labelled as such.
 */
export function render(h: Holding): string {
  const where = h.pinpoint ? `, ${h.pinpoint}` : ''
  return `=== ${citeCase(h.case)}${where} (${h.opinionPart}) ===
"${h.quote}"

WHAT IT DOES NOT DECIDE: ${h.limits}
THE OFFICE READS THIS AS: ${h.appliedTo}`
}

/**
 * The holdings the office relies on.
 *
 * Written here rather than produced by a model, reviewed by nobody yet. Every
 * quote is checked verbatim against cases.json by test/cases.test.ts.
 */
export const HOLDINGS: Holding[] = []

/** Every holding bearing on an element, as 'claim-id:element-key'. */
export function holdingsFor(elementKey: string): Holding[] {
  return HOLDINGS.filter(h => h.bearsOn.includes(elementKey))
}
