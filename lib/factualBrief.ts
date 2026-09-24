/**
 * The record, marshalled — and not argued.
 *
 * The corpus separates two documents and the separation is the point. The
 * Factual Brief "develops the record without arguing legal conclusions" (sec.
 * 5) and "stores damage facts only; the Legal/Living Brief determines
 * entitlement and applies the proper formulas" (sec. 12). Its job is to know
 * the facts better than either side does, before any of them are turned into
 * a pleading or a demand.
 *
 * So there are no claim standings here, no element states, no figures and no
 * formulas. A reader who wants to know whether the meal-period claim stands
 * reads the other document. A reader who wants to know what this client
 * actually said, who saw it, what corroborates it and what cuts against it
 * reads this one.
 *
 * The rhythm is the corpus's, in its order: core story, strongest proof,
 * weaknesses and contradictions, chronology, issue by issue, evidence,
 * Who's Who, damages facts, and what is still open.
 *
 * ASSEMBLED, NOT GENERATED. Every field it reads — provenance, status,
 * corroboration, contrary evidence, period, actors, legal tags, damages tags,
 * open loop — is already on each fact in the ledger. On a real file 204 of 204
 * carry their tags, 60 carry corroboration and 20 carry a contrary fact. This
 * groups them.
 */

import { Cited, SpineRecord } from '@/lib/evidenceSpine'
import { Person, whosWho } from '@/lib/whosWho'

/** A fact as the ledger stores it. */
export interface LedgerFact {
  id: string
  proposition: string
  /** The client's own words. Evidence; never replaced by the paraphrase. */
  verbatim: string
  /** The same sentence in English when hers was not. '' when it already was. */
  verbatimEnglish?: string
  status: string
  provenance: { kind: string; pinpoint: string; on: string }
  period?: string
  actors?: string[]
  location?: string
  corroboration?: string[]
  /** The best known fact that cuts the other way. */
  contrary?: string
  legalTags?: string[]
  damagesTags?: string[]
  /** The exact missing fact or document, and the best next source. */
  openLoop?: string
  supersededBy?: string | null
}

export interface IssueFacts {
  issue: string
  /** What the client said, in her words where the ledger kept them. */
  account: LedgerFact[]
  /** Facts something other than her account supports. */
  corroborated: LedgerFact[]
  /** Facts her own other answers agree with. Consistency, not corroboration. */
  consistentWith: LedgerFact[]
  /** What cuts against, kept with the issue rather than in a separate file. */
  harmful: { fact: LedgerFact; contrary: string }[]
  /** Answers that disagree and were both kept. */
  disputed: LedgerFact[]
  /** The exact missing facts this issue is waiting on. */
  open: string[]
}

export interface DamagesFact {
  /** rate · hours per day · weeks worked · frequency · period · final pay date */
  input: string
  facts: LedgerFact[]
  /** True when nothing on file settles this input. */
  unresolved: boolean
}

export interface FactualBrief {
  clientName: string
  caseType: string
  factCount: number
  readOn: string | null
  /** Sections with nothing in them, and why. Never silently dropped. */
  absent: { key: string; why: string }[]
  coreStory: Cited[]
  strongestProof: LedgerFact[]
  weaknesses: { what: string; from: string; kind: string; against?: string }[]
  chronology: { when: string; what: string }[]
  issues: IssueFacts[]
  evidence: SpineRecord[]
  people: Person[]
  damages: DamagesFact[]
  /** The open loops, deduplicated — what the record is waiting on. */
  development: string[]
}

export interface FactualBriefInput {
  clientName: string
  caseType: string
  ledger: LedgerFact[]
  spine: {
    events?: { when?: string; event?: string; what?: string }[]
    coreStory?: Cited[]
    records?: SpineRecord[]
    restingOnTestimonyAlone?: Cited[]
    anomalies?: { what?: string }[]
    dateConflicts?: { what?: string }[]
  } | null
  readOn: string | null
  /** Names the client is known by, so she stays off her own witness map. */
  clientNames?: string[]
}

const live = (f: LedgerFact) => !f.supersededBy

/** The client id is on every fact reference and identical on every one. */
export const shortIds = (s: string) => s.replace(/\bclient-\d+:/g, '')

/**
 * A corroboration entry that points back into the same intake.
 *
 * The extraction fills `corroboration` with whatever supports a fact, and on
 * a file with no records in it that is always another of her own answers: a
 * fact id, or the id of the question she answered. Of 91 entries on Dayeon
 * Kim's ledger, 91 are internal and none names a document, a witness or a
 * record.
 *
 * That is worth having — it is internal consistency, and inconsistency is
 * what the office most needs to see — but the corpus defines corroboration as
 * support from something OTHER than the client's own account, and calling
 * this file 53 facts "SUPPORTED" tells a law office a third of it is backed
 * by evidence when none of it is.
 */
export function isSelfReference(entry: string): boolean {
  const s = entry.trim()
  // f068 · F-SCHED-005 · f_m2p_019 · m2_meal_redone — 'This did not happen'
  return (
    // F-SCHED-005 carries hyphens inside the code, not only after the F.
    /^[fF][-_]?[A-Za-z0-9_-]*\d/.test(s) ||
    /^m2_|^[a-z_]+ (?:—|-) /.test(s) ||
    /^[a-z][a-z0-9_]*$/.test(s)
  )
}

/** Corroboration by something other than her own answers. */
export function independentCorroboration(f: LedgerFact): string[] {
  return (f.corroboration ?? []).filter(c => c.trim() && !isSelfReference(c))
}

/** Her other answers that agree with this one. Consistency, not proof. */
export function selfCorroboration(f: LedgerFact): string[] {
  return (f.corroboration ?? []).filter(c => c.trim() && isSelfReference(c))
}

/**
 * Words that would make this the other document.
 *
 * The corpus's rule is that the factual brief does not argue legal
 * conclusions, and a rule nobody can check is a preference. This is what a
 * conclusion looks like in the text these readings produce.
 */
const LEGAL_CONCLUSION =
  /\b(supported|contradicted|not supported|violat\w+|entitled to|liable|liability|breach\w*|unlawful|prima facie|element (?:is|was)|claim (?:is|fails|succeeds))\b/i

/** Any line in the brief that argues rather than reports. */
export function legalConclusionsIn(brief: FactualBrief): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = []
  const check = (text: string | undefined, where: string) => {
    if (text && LEGAL_CONCLUSION.test(text)) out.push({ where, text })
  }
  for (const c of brief.coreStory) check(c.note, 'Core story')
  for (const w of brief.weaknesses) check(w.what, 'Weaknesses')
  for (const i of brief.issues) {
    for (const f of i.account) check(f.proposition, `Issue — ${i.issue}`)
  }
  return out
}

/**
 * Whether a fact is proof of anything, as opposed to true.
 *
 * "Strongest proof" first listed the client's name, her date of birth and her
 * home address. They are facts, they are on file, and none of them proves
 * anything about the case: with only one fact in the ledger corroborated, the
 * ranking had nothing to sort by and fell back to the order the facts were
 * written in, which begins with the intake's identity questions.
 *
 * So a fact is proof when something other than her own account supports it —
 * corroboration, or the CONFIRMED status the ledger gives exactly that. Where
 * the file has none, the section says so. A law office reading "strongest
 * proof: the client's street address" learns less than one reading "nothing
 * here is corroborated yet".
 */
export function isProof(f: LedgerFact): boolean {
  return independentCorroboration(f).length > 0 || f.status.toUpperCase() === 'CONFIRMED'
}

export function proofWeight(f: LedgerFact): number {
  const status = f.status.toUpperCase()
  const base = status === 'CONFIRMED' ? 40 : status === 'REPORTED' ? 20 : status === 'INFERRED' ? 10 : 0
  return (
    base +
    Math.min(independentCorroboration(f).length * 10, 30) +
    // A fact that carries a damages input or an answer cutting against it is
    // material; an identity answer is not.
    ((f.damagesTags?.length ?? 0) > 0 ? 8 : 0) +
    (f.contrary?.trim() ? 6 : 0)
  )
}

export function buildFactualBrief(input: FactualBriefInput): FactualBrief {
  const facts = input.ledger.filter(live)
  const absent: { key: string; why: string }[] = []
  const note = (key: string, why: string) => absent.push({ key, why })

  if (facts.length === 0) note('facts', 'The answers have not been read into facts for this client yet.')
  else if (!facts.some(isProof)) {
    note(
      'proof',
      'Nothing on file is corroborated by anything other than the client\u2019s own account. ' +
        'No record has been obtained yet, so every proposition below rests on what she said.'
    )
  }
  if (!input.spine) note('chronology', 'The chronology has not been built yet.')

  // ── issue by issue ───────────────────────────────────────────────────────
  const byIssue = new Map<string, IssueFacts>()
  for (const f of facts) {
    for (const tag of f.legalTags ?? []) {
      let issue = byIssue.get(tag)
      if (!issue) {
        issue = {
          issue: tag,
          account: [],
          corroborated: [],
          consistentWith: [],
          harmful: [],
          disputed: [],
          open: [],
        }
        byIssue.set(tag, issue)
      }
      issue.account.push(f)
      if (independentCorroboration(f).length > 0) issue.corroborated.push(f)
      else if (selfCorroboration(f).length > 0) issue.consistentWith.push(f)
      if (f.contrary?.trim()) issue.harmful.push({ fact: f, contrary: f.contrary.trim() })
      if (f.status.toUpperCase() === 'DISPUTED') issue.disputed.push(f)
      // The smallest set the corpus asks for. Sixty lines under one heading
      // is the problem the reader had before anybody wrote it down.
      const loop = f.openLoop?.trim()
      if (loop && !issue.open.includes(loop) && issue.open.length < 8) issue.open.push(loop)
    }
  }

  // ── damages facts, and nothing computed from them ────────────────────────
  const byInput = new Map<string, DamagesFact>()
  for (const f of facts) {
    for (const tag of f.damagesTags ?? []) {
      const row = byInput.get(tag) ?? { input: tag, facts: [], unresolved: true }
      row.facts.push(f)
      // Settled means something other than "I don't know" is on file for it.
      if (f.status.toUpperCase() !== 'UNKNOWN') row.unresolved = false
      byInput.set(tag, row)
    }
  }

  // ── what cuts against, all in one place ──────────────────────────────────
  const weaknesses: { what: string; from: string; kind: string; against?: string }[] = []
  for (const f of facts) {
    if (f.contrary?.trim()) {
      // The field holds the thing that cuts, not the thing it cuts at. Without
      // the proposition beside it the section reads as a list of codes.
      weaknesses.push({
        what: f.contrary.trim(),
        against: f.proposition,
        from: shortIds(f.id),
        kind: 'Contrary fact',
      })
    }
  }
  for (const c of input.spine?.restingOnTestimonyAlone ?? []) {
    // Not all of these are corroboration problems. The spine files a
    // self-contradiction here too, and prefixing every one of them "rests on
    // her word alone" told the office that a contradiction was a proof gap.
    const note = c.note ?? ''
    const kind = /contradict|inconsisten|both|yet also|conflict/i.test(note)
      ? 'Contradiction in her own answers'
      : 'Rests on her word alone'
    weaknesses.push({ what: note, from: shortIds((c.facts ?? []).join(', ')), kind })
  }
  for (const c of input.spine?.dateConflicts ?? []) {
    if (c.what) weaknesses.push({ what: c.what, from: '', kind: 'Date conflict' })
  }
  for (const a of input.spine?.anomalies ?? []) {
    if (a.what) weaknesses.push({ what: a.what, from: '', kind: 'Anomaly' })
  }

  return {
    clientName: input.clientName,
    caseType: input.caseType,
    factCount: facts.length,
    readOn: input.readOn,
    absent,
    coreStory: input.spine?.coreStory ?? [],
    strongestProof: facts.filter(isProof).sort((a, b) => proofWeight(b) - proofWeight(a)).slice(0, 8),
    weaknesses,
    chronology: (input.spine?.events ?? [])
      .map(e => ({ when: e.when ?? '', what: e.event ?? e.what ?? '' }))
      .filter(e => e.what.trim()),
    issues: Array.from(byIssue.values()).sort((a, b) => b.account.length - a.account.length),
    evidence: (input.spine?.records ?? []).filter(r => !r.inHand),
    people: whosWho(
      facts.map(f => ({
        id: f.id,
        proposition: f.proposition,
        status: f.status,
        actors: f.actors ?? [],
        legalTags: f.legalTags ?? [],
      })),
      input.clientNames ?? input.clientName
    ),
    damages: Array.from(byInput.values()).sort((a, b) => b.facts.length - a.facts.length),
    development: Array.from(
      new Set(facts.map(f => f.openLoop?.trim()).filter((s): s is string => Boolean(s)))
    ),
  }
}
