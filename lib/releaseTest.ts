/**
 * What must be true before a document leaves the building.
 *
 * The office already has one of these for questions: vet() refuses a
 * follow-up containing "meal period" or "regular rate", and a test asserts it
 * refuses them. The comment on that file is the whole argument — instructing a
 * model to write simply is a hope, and refusing the output is a mechanism.
 *
 * Analysis had no such mechanism. Its schemas check shape, so a citation to a
 * statute that does not exist, a fact id nothing in the ledger holds, or an
 * estimate written as a certainty all pass. This is the missing half: the
 * readings produce, and this refuses.
 *
 * WHAT IT DOES NOT DO, AND THE LIMIT MATTERS. This is a mechanical check with
 * a deliberately narrow scope, not a warrant that a document is sound. It
 * answers only questions that can be settled by looking something up: is this
 * provision in the text the office holds, is this fact id in this client's
 * ledger, did an adverse fact survive into the document, is a figure the
 * reading marked as estimated also written as one.
 *
 * A citation that passes has been found in `lib/authority`. That is all it
 * means. It does not mean the provision is current law, that it has not been
 * amended or repealed since FETCHED_ON, that it governs this employer's
 * industry, or that it applies to this client's period or classification.
 * Those are legal judgements and they belong to an attorney. Passing this
 * test is the floor, not the ceiling, and nothing here should be read as
 * having checked a document's reasoning.
 *
 * SEVERITY. An internal working draft may identify gaps; an external document
 * may not carry them. The same problem is therefore a flag on one and a block
 * on the other, and nothing here decides which a document is — the caller says.
 */

import { Brief, shortFact } from '@/lib/caseBrief'
import { available } from '@/lib/authority'

export type Audience = 'internal' | 'external'
export type Severity = 'block' | 'flag'

export interface Problem {
  /** Which clause of the standard this is. */
  rule:
    | 'citation not on file'
    | 'fact not in ledger'
    | 'hidden contrary evidence'
    | 'allegation as proof'
    | 'unsupported certainty'
    | 'deadline without inputs'
    | 'no relief requested'
  severity: Severity
  /** What is wrong, in a sentence somebody can act on. */
  what: string
  /** Where in the document to look. */
  where: string
}

/** What the document is allowed to refer to. */
export interface KnownSources {
  /** Every fact id in this client's ledger. */
  factIds: ReadonlySet<string>
}

/**
 * A citation as it appears in prose, reduced to what can be looked up.
 *
 * The readings write citations the way a lawyer does — "Lab. Code sec. 512",
 * "Wage Order 5, sec. 11", "CACI No. 2766A" — so this finds those shapes and
 * nothing else. Prose that cites no authority raises nothing here; a document
 * with no citations at all is a different problem and not this one.
 */
export function citationsIn(text: string): string[] {
  const out: string[] = []
  const push = (s: string) => {
    if (s && !out.includes(s)) out.push(s)
  }

  // Plain exec loops rather than matchAll: this file is imported by the admin
  // panel, whose tsconfig target predates the iterator.
  const each = (re: RegExp, take: (m: RegExpExecArray) => void) => {
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) take(m)
  }

  // Lab. Code § 512 · Labor Code section 512 · Lab Code sec. 226.7
  each(
    // A comma after "Code" is the California Style Manual form ("Lab. Code,
    // § 226.7"); the number must start with a digit, or "the Labor Code." at
    // the end of a sentence reads as a citation to nothing.
    /\b(Lab(?:or)?\.?\s*Code|Bus\.?\s*&\s*Prof\.?\s*Code|Code\s*Civ\.?\s*Proc\.?),?\s*(?:§+|sec(?:tion)?s?\.?)?\s*(\d[\d.]*[a-zA-Z]?)/gi,
    m => {
      const law = /^lab/i.test(m[1]) ? 'LAB' : /^bus/i.test(m[1]) ? 'BPC' : 'CCP'
      push(`${law} ${m[2].replace(/\.$/, '')}`)
    }
  )

  // Gov. Code § 12940 · Government Code section 12940(m)
  each(/\bGov(?:ernment|\.)?\s*Code,?\s*(?:§+|sec(?:tion)?s?\.?)?\s*(\d[\d.]*[a-zA-Z]?)/gi, m =>
    push(`GOV ${m[1].replace(/\.$/, '')}`)
  )

  // Cal. Code Regs., tit. 2, § 11068
  each(/\bCal(?:ifornia|\.)?\s*Code\s*(?:of\s*)?Regs?\.?(?:ulations)?,?\s*tit(?:le|\.)?\s*2,?\s*(?:§+|sec(?:tion)?s?\.?)\s*(\d[\d.]*)/gi, m =>
    push(`CCR2 ${m[1].replace(/\.$/, '')}`)
  )

  // L.A. Mun. Code § 187.02 · LAMC section 187.02
  each(/\b(?:L\.?\s*A\.?\s*Mun(?:icipal|\.)?\s*Code|LAMC),?\s*(?:§+|sec(?:tion)?s?\.?)?\s*(\d[\d.]*)/gi, m =>
    push(`LAMC ${m[1].replace(/\.$/, '')}`)
  )

  // Wage Order 5, § 12 · IWC Wage Order 5 section 11
  each(
    /\bWage\s*Order\s*(\d+)(?:\s*[-–—]\s*\d+)?\s*(?:,)?\s*(?:§+|sec(?:tion)?s?\.?)\s*(\d+)/gi,
    m => push(`IWC ${m[1]} sec ${m[2]}`)
  )

  // CACI No. 2766A
  each(/\bCACI\s*(?:No\.?|Instruction)?\s*(\d+[A-Z]?)/gi, m => push(`CACI ${m[1]}`))

  return out
}

/**
 * A fact id with the client off the front.
 *
 * The ledger stores ids as `client-1789103134380:f001` and the readings cite
 * them both ways — whole in an element's `facts`, bare in prose. The client id
 * is identical on every one of them and carries nothing, so both sides are
 * reduced to the part that identifies the fact before they are compared.
 */
export function bareFactId(id: string): string {
  const at = id.lastIndexOf(':')
  return at < 0 ? id : id.slice(at + 1)
}

/** Fact ids as the readings write them: f068, or client-123:f068. */
export function factIdsIn(text: string): string[] {
  const out: string[] = []
  const re = /\b(?:[\w-]+:)?(f\d{2,})\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (!out.includes(m[1])) out.push(m[1])
  }
  return out
}

/** Everything on file, as keys this can test membership against. */
function onFile(): Set<string> {
  return new Set(available().map(a => `${a.law} ${a.num}`))
}

/**
 * Whether a figure still reads as an estimate on the page.
 *
 * A number the reading itself marked ESTIMATE or ASSUMPTION has to arrive as
 * one, because a bare number is what gets quoted into a demand letter.
 *
 * The first version of this only knew words — "about", "roughly" — and a
 * dollar range, so it objected to every figure in a real brief, all four of
 * which were carefully qualified: "34.6 / 43.4 / 52.0 unpaid hours", "10.9 -
 * 32.6 straight-time hours, most likely ~21.7", "327R to 545R; at a rate still
 * to be pulled from pay stubs". An office told four times that its own hedged
 * arithmetic is unsafe stops reading the box, and then it is not a check at
 * all. So the shapes count too: a range, a low/likely/high triple, a tilde,
 * and a figure that names the input it is still missing.
 */
const HEDGE_WORDS =
  /\b(about|approx|approximately|roughly|estimat|around|range|between|at least|up to|assum|unconfirmed|preliminary|subject to|most likely|likely|if |cannot be (stated|computed)|not (yet )?(established|known|fixed)|still to be|to be (pulled|confirmed|established)|pending)/i

/** 10.9 - 32.6 · $700–$850 · 327R to 545R */
const RANGE = /\d[\d,.]*\s*(?:[–—-]|\bto\b)\s*[$]?\d/i
/** 34.6 / 43.4 / 52.0 — the low, likely and high the methodology asks for. */
const TRIPLE = /\d[\d,.]*\s*\/\s*\d[\d,.]*\s*\/\s*\d/
/** ~21.7 */
const TILDE = /~\s*\d/
/** A formula standing in for a number it does not have: hours x $R */
const UNRESOLVED_SYMBOL = /[x*]\s*\$?[A-Z]\b|\b\d+R\b/

export function readsAsEstimated(text: string): boolean {
  return (
    HEDGE_WORDS.test(text) ||
    RANGE.test(text) ||
    TRIPLE.test(text) ||
    TILDE.test(text) ||
    UNRESOLVED_SYMBOL.test(text)
  )
}

/** Everything in the document that might carry a citation or a fact id. */
function proseOf(brief: Brief): { text: string; where: string }[] {
  const bits: { text: string; where: string }[] = []
  const add = (text: string | undefined | null, where: string) => {
    if (text && text.trim()) bits.push({ text, where })
  }

  add(brief.overview.summary, 'Case overview')
  for (const b of brief.overview.baseline) add(`${b.label} ${b.value}`, 'Employment baseline')
  for (const c of brief.chronology.coreStory) add(c.note, 'Chronology')
  for (const c of brief.chronology.conflicts) add(c, 'Conflicts and anomalies')
  for (const f of brief.claims) {
    add(f.standing, `Claim — ${f.claimId}`)
    add(f.defense, `Claim — ${f.claimId}`)
    for (const e of f.elements) {
      add(e.reasoning, `Claim — ${f.claimId} · ${e.key}`)
      add(e.wouldSettleIt, `Claim — ${f.claimId} · ${e.key}`)
    }
    for (const a of f.adverse) add(a, `Claim — ${f.claimId}`)
  }
  for (const i of brief.damages.issues) {
    add(`${i.headline} ${i.law} ${i.why} ${i.math} ${i.estimate}`, `Damages — ${i.category}`)
  }
  add(brief.damages.drivers, 'Damages')
  for (const m of brief.damages.missingInputs) add(m, 'Missing inputs')
  for (const r of brief.evidence) add(`${r.record} ${r.proves?.note ?? ''}`, 'Records to obtain')

  return bits
}

/** Fact ids the readings attached structurally, rather than wrote in prose. */
function citedFactIds(brief: Brief): { id: string; where: string }[] {
  const out: { id: string; where: string }[] = []
  for (const c of brief.chronology.coreStory) {
    for (const id of c.facts ?? []) out.push({ id, where: 'Chronology' })
  }
  for (const f of brief.claims) {
    for (const e of f.elements) {
      for (const id of e.facts ?? []) out.push({ id, where: `Claim — ${f.claimId} · ${e.key}` })
    }
  }
  for (const r of brief.evidence) {
    for (const id of r.proves?.facts ?? []) out.push({ id, where: 'Records to obtain' })
  }
  return out
}

/**
 * The test itself.
 *
 * Returns everything it found. Ordering is by severity so a caller that shows
 * only the first few shows the ones that stop a document going out.
 */
export function releaseTest(
  brief: Brief,
  known: KnownSources,
  audience: Audience = 'internal'
): Problem[] {
  const problems: Problem[] = []
  const strict = audience === 'external'
  const sev = (s: Severity): Severity => (strict ? 'block' : s)

  const authorities = onFile()
  const seenCitation = new Set<string>()
  const seenFact = new Set<string>()
  // Compared bare on both sides — see bareFactId.
  const ledger = new Set(Array.from(known.factIds).map(bareFactId))

  for (const { text, where } of proseOf(brief)) {
    for (const key of citationsIn(text)) {
      if (authorities.has(key) || seenCitation.has(key)) continue
      seenCitation.add(key)
      problems.push({
        rule: 'citation not on file',
        // Always a block. A provision whose text the office does not hold is
        // one nobody can check at all, and the standard's own words are that
        // an unverified rule must not be applied.
        severity: 'block',
        what: `"${key}" is cited but its text is not in the authority on file, so nothing here could check what it says. Whether it is current or applies to this case is a separate question and is not tested.`,
        where,
      })
    }

    // Only when the ledger is known. An empty set means the facts were not
    // loaded, and treating that as "no id is on file" would be noise.
    if (ledger.size > 0) {
      for (const id of factIdsIn(text)) {
        if (ledger.has(id) || seenFact.has(id)) continue
        seenFact.add(id)
        problems.push({
          rule: 'fact not in ledger',
          severity: 'block',
          what: `Fact ${id} is referred to but is not in this client's ledger.`,
          where,
        })
      }
    }
  }

  if (ledger.size > 0) {
    for (const { id, where } of citedFactIds(brief)) {
      const bare = bareFactId(id)
      if (ledger.has(bare) || seenFact.has(bare)) continue
      seenFact.add(bare)
      problems.push({
        rule: 'fact not in ledger',
        severity: 'block',
        what: `Fact ${bare} is cited but is not in this client's ledger.`,
        where,
      })
    }
  }

  // Contrary evidence has to survive the assembly. A claim whose reading
  // recorded an adverse fact, in a document that does not carry it, is the
  // failure this clause exists for.
  //
  // Compared with the client prefix stripped from both sides. buildBrief
  // writes each adverse fact into the weaknesses through shortFact, so
  // `client-1789103134380:f069` arrives as `f069`; matching the raw text
  // against that found none of them, and a real file was marked "not to be
  // sent out" for 91 adverse facts that were all on the page.
  for (const f of brief.claims) {
    for (const adverse of f.adverse) {
      const said = shortFact(adverse)
      if (brief.weaknesses.some(w => shortFact(w).includes(said))) continue
      problems.push({
        rule: 'hidden contrary evidence',
        severity: 'block',
        what: `An adverse fact recorded under ${f.claimId} does not appear in the document: "${adverse}"`,
        where: `Claim — ${f.claimId}`,
      })
    }
  }

  for (const issue of brief.damages.issues) {
    const estimated = issue.basis === 'ESTIMATE' || issue.basis === 'ASSUMPTION'

    if (estimated && issue.estimate && !readsAsEstimated(issue.estimate)) {
      problems.push({
        rule: 'unsupported certainty',
        severity: sev('flag'),
        what: `${issue.category} is marked ${issue.basis} but its figure reads as settled: "${issue.estimate}"`,
        where: `Damages — ${issue.category}`,
      })
    }

    if (estimated && issue.confirm.length === 0) {
      problems.push({
        rule: 'allegation as proof',
        severity: sev('flag'),
        what: `${issue.category} rests on an ${issue.basis.toLowerCase()} and names nothing to confirm it.`,
        where: `Damages — ${issue.category}`,
      })
    }

    // A formula with no inputs is a number nobody can re-derive, and the
    // standard asks for sourced arithmetic with visible assumptions.
    if (issue.estimate && !issue.math) {
      problems.push({
        rule: 'deadline without inputs',
        severity: sev('flag'),
        what: `${issue.category} states a figure with no arithmetic behind it.`,
        where: `Damages — ${issue.category}`,
      })
    }
  }

  // Something to do next. A brief that ends without a question, a record to
  // get, or a step is a document nobody can act on.
  if (
    brief.questions.length === 0 &&
    brief.evidence.length === 0 &&
    brief.damages.missingInputs.length === 0
  ) {
    problems.push({
      rule: 'no relief requested',
      severity: sev('flag'),
      what: 'The document asks for nothing: no question, no record to obtain, no missing input.',
      where: 'Priority questions and evidence requests',
    })
  }

  return problems.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'block' ? -1 : 1))
}

/**
 * Whether anything found here stops the document as it stands.
 *
 * False means nothing in this test's narrow scope objected. It is not a
 * statement that the document is correct, that its law is current, or that it
 * may be filed — an external document still goes to an attorney.
 */
export function blocked(problems: Problem[]): boolean {
  return problems.some(p => p.severity === 'block')
}
