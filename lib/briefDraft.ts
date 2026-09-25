/**
 * Drafting the four parts of the firm's templates that cannot be assembled.
 *
 * Trial Brief Template I (introduction), IV (summary of facts) and XII
 * (conclusion), and Factual Brief Template XI (final factual summary). See
 * lib/briefDraftShape.ts for why these four and why only drafted.
 *
 * WHAT THE MODEL IS HANDED, AND WHAT IT IS NOT
 *
 * The fact ledger (as the matrix sees it), the assembled brief — the claims
 * reading with each element's state and the facts it cites, the defences, the
 * damages figures and their arithmetic — and the text of every provision and
 * holding the claims reading relied on, quoted in full, each under the key the
 * model must cite it by. It is not asked what the law is. check() then holds
 * every sentence to the keys it was HANDED — not to the whole library, which
 * would let a provision recalled from memory through because it happens to be
 * on file somewhere.
 *
 * TWO DRAFTS, NOT ONE. The trial sections and the factual summary are written
 * and kept separately, each from its own sheet. The factual summary must carry
 * no law (Factual Brief Template XI: "omit legal argument"), so it never sees
 * the statutes; and redrafting one must not pay for, or replace, the other.
 *
 * CHECKED AFTER, NOT TRUSTED. Problems are attached to the sentence and shown
 * with it; nothing is silently dropped or silently kept.
 */

import { createHash } from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { Brief } from '@/lib/caseBrief'
import { ALL_CLAIMS } from '@/lib/authority/claims'
import { caseRecord, holdingsFor, render } from '@/lib/authority/cases'
import { parseKey, quote, section as sectionText } from '@/lib/authority'
import { LedgerEntry, standing } from '@/lib/factLedger'
import { factSheet } from '@/lib/claimMatrix'
import { bareFactId, citationsIn, factIdsIn, readsAsEstimated } from '@/lib/releaseTest'
import { canonical } from '@/lib/briefHistory'
import { plainly } from '@/lib/modelErrors'
import { Meter } from '@/lib/spend'
import { DRAFT_MODEL, thinkingFor } from '@/lib/models'
import {
  CheckedSection,
  DRAFT_KEYS,
  DraftKind,
  DraftOutput,
  DraftSentence,
  EvidenceLabel,
  KEYS_OF,
  StoredDraft,
} from '@/lib/briefDraftShape'

// ── what the model is handed ────────────────────────────────────────────────

/** A claim the reading found nothing on is not law the draft needs. */
const read = (brief: Brief) => brief.claims.filter(c => !/not raised/i.test(c.standing))

/** The brief, cut to what drafting needs. The ledger travels separately. */
export function briefForDrafting(brief: Brief) {
  return {
    client: brief.clientName,
    caseType: brief.caseType,
    summary: brief.overview.summary,
    baseline: brief.overview.baseline.map(b => `${b.label}: ${b.value} [${b.basis}]`),
    chronology: brief.chronology.events,
    coreStory: brief.chronology.coreStory,
    conflicts: brief.chronology.conflicts,
    wageOrder: brief.wageOrder
      ? { proposed: brief.wageOrder.proposal.order, industry: brief.wageOrder.proposal.industry, caveat: brief.wageOrder.caveat }
      : null,
    claims: brief.claims.map(c => ({
      claimId: c.claimId,
      standing: c.standing,
      elements: c.elements.map(e => ({ key: e.key, state: e.state, reasoning: e.reasoning, facts: (e.facts ?? []).map(bareFactId) })),
      adverse: c.adverse,
      defense: c.defense,
    })),
    strengths: brief.strengths,
    weaknesses: brief.weaknesses,
    damages: {
      issues: brief.damages.issues.map(i => ({
        category: i.category,
        headline: i.headline,
        estimate: i.estimate,
        math: i.math,
        basis: i.basis,
        why: i.why,
      })),
      totals: brief.damages.totals,
      missingInputs: brief.damages.missingInputs.slice(0, 25),
    },
    recordsToObtain: brief.evidence.map(r => r.record),
    reviewItems: brief.review.map(r => `${r.what} — ${r.why}`),
  }
}

/** What the factual summary is written from. No law, no damages. */
export function factualForDrafting(brief: Brief) {
  return {
    client: brief.clientName,
    chronology: brief.chronology.events,
    coreStory: brief.chronology.coreStory,
    conflicts: brief.chronology.conflicts,
    weaknesses: brief.weaknesses,
    baseline: brief.overview.baseline.map(b => `${b.label}: ${b.value} [${b.basis}]`),
  }
}

/**
 * The provisions and holdings the claims reading relied on, quoted in full,
 * each under the key a sentence must cite it by.
 *
 * Only for claims the reading found something on — a claim "not raised by
 * these facts" contributes no law — and a Wage Order duty only when an Order
 * was proposed, the restraint the matrix shows.
 */
export function authorityForDrafting(brief: Brief): { text: string; keys: string[]; cases: string[] } {
  const order = brief.wageOrder?.proposal.order
  const refs = new Set<string>()
  const held = new Map<string, { text: string; caseKey: string }>()
  for (const f of read(brief)) {
    const claim = ALL_CLAIMS.find(c => c.id === f.claimId)
    if (!claim) continue
    for (const r of [...claim.sections, ...claim.elements.map(e => e.from)]) {
      if (r.includes('{order}') && !order) continue
      refs.add(order ? r.replace('{order}', order) : r)
    }
    if (claim.caci) refs.add(`CACI ${claim.caci}`)
    for (const e of claim.elements) {
      for (const h of [...holdingsFor(`${claim.id}:${e.key}`), ...holdingsFor(claim.id)]) {
        held.set(h.id, { text: render(h), caseKey: h.case })
      }
    }
  }
  const keys = Array.from(refs)
  // Keyed: the headers quote() prints are cite forms ("Cal. Code Regs., tit. 2,
  // § 11068"), and a model left to guess the key from them guessed wrong and
  // had a correct sentence struck.
  const statutes = keys.map(k => `[key: ${k}]\n${quote([parseKey(k)])}`).join('\n\n')
  const cases = Array.from(held.entries()).map(([id, h]) => `[holding id: ${id}]\n${h.text}`)
  return {
    text: `${statutes}${cases.length ? `\n\n=== HOLDINGS (cite by holding id) ===\n\n${cases.join('\n\n')}` : ''}`,
    keys: [...keys, ...Array.from(held.keys())],
    cases: Array.from(new Set(Array.from(held.values()).map(h => h.caseKey))),
  }
}

/**
 * What a draft of each kind was written from, as a digest.
 *
 * Only what the call is actually handed. The brief's digest also moves when a
 * follow-up round is written, which the draft never sees, and told the office
 * to pay for a new draft that would say the same thing.
 */
export function draftBasis(kind: DraftKind, brief: Brief, entries: LedgerEntry[]): string {
  const facts = standing(entries).map(e => [bareFactId(e.id), e.status, e.proposition])
  const handed =
    kind === 'trial'
      ? { brief: briefForDrafting(brief), keys: authorityForDrafting(brief).keys, facts }
      : { brief: factualForDrafting(brief), facts }
  return createHash('sha256').update(canonical(handed)).digest('hex').slice(0, 32)
}

const SENTENCE_RULES = `EVERY SENTENCE is an object: text, facts, authority, inference.
- facts: the bare ids (f069) of the ledger facts the sentence rests on. A sentence about the case with no fact id is not allowed.
- authority: the exact key of each provision or holding the sentence states law from, copied from the [key: …] or [holding id: …] line above it ("LAB 226.7", "IWC 5 sec 11", "CACI 2702", a holding id). Empty when the sentence states no law.
- inference: true when the sentence draws a conclusion the facts do not state on their face (motive, pattern, what a record will show). Direct evidence is false.
- Write fact ids and keys ONLY in those arrays, never in the text.
- A dollar figure comes from the damages reading, a fact you cite, or a provision you cite — nowhere else — and an estimate is written as an estimate.
- Never cite a case, statute, regulation or instruction you were not handed, and never add reporter page numbers or "at p." pinpoints.
- Unfavorable facts are not omitted. Where one bears on what a section says, the section addresses it.

HOW THE FIRM WRITES THESE (its own factual summaries are the model):
- Separate what a record establishes from what the client reports. Say "she reports", "she says" for her account; state a thing flatly only where a CONFIRMED fact supports it.
- When you name a piece of proof, say what it establishes AND what it does not ("establishes the dates she worked, not the hours").
- Where answers conflict, set both out and say which is better supported by the evidence and why — never silently pick one or correct it. "Remains an inference until confirmed" is a complete sentence.
- A pleading, a draft complaint or the office's own earlier analysis is not proof of anything it alleges.
- Plain, exact, unadorned. No adjectives the facts do not carry.`

const LEGAL_SYSTEM = `You draft three sections of a California plaintiff-side employment trial brief for an attorney to rewrite: the Introduction, the Brief Summary of Facts and Evidence, and the Conclusion. You are handed the client's fact ledger, the office's claims reading (each element's state and the facts it cites, already read against the quoted law), the defences, the damages reading, and the full text of every provision and holding that reading relied on.

You do not decide the law and you do not change a conclusion. Where the claims reading says an element is contradicted, unknown, or needs authority, the draft says the same or leaves the claim out; it never upgrades one. A claim whose elements are not supported is not presented as established. Where the review items say part of the case was not read or is only proposed, the draft does not present that part as established or as absent — it leaves it out. The sheet already lists those items for the attorney. The brief speaks about the case, never about the office's process: no sentence says what was read, proposed, flagged or recorded.

VOICE. A trial brief is read by a court. Attribute her account to her ("she states", "she will testify"), never to "her intake", "the file", "the ledger" or "the record on file". Where her accounts conflict, say that they conflict and what evidence will show which is right — not that the file does not resolve it.

The firm's Trial Brief Template sets the method:
- Introduction (2–4 short paragraphs): what happened, why it matters legally, the strongest proof, the simple result — and the strongest defense and the fact that answers it. Lead with the strongest fact.
- Brief Summary of Facts and Evidence: a controlled chronology — the employment and actual work; the conduct giving rise to the claims with representative examples; complaints, notice and separation; the few records that make the theory concrete; and the harmful evidence, addressed accurately rather than left for the other side.
- Conclusion: the few facts that drive the result, as a sequence, and what is requested. Do not repeat the brief.
LENGTH. The template says the summary of facts is "shorter and cleaner than the internal factual brief", which already carries every detail: keep section IV to about 25 sentences, the introduction to 2–4 short paragraphs, and the conclusion to about 8 sentences. Choose the representative examples; do not list every answer. A first run on a real file wrote 70 sentences for IV — too many to be read.
Undisputed facts first where possible. Distinguish direct evidence from inference. Damages, if mentioned, are the reading's own figures with their assumptions.

${SENTENCE_RULES}

Return one section per key, exactly "trial-intro", "trial-facts", "trial-conclusion" — all of a section's paragraphs under the one key. If a section cannot honestly be written from what is on file (for example, no claim has a supported element to conclude on), leave it out and say why in notWritten.`

const FACTUAL_SYSTEM = `You draft the Final Factual Summary of a California plaintiff-side employment factual brief for an attorney to rewrite. You are handed the client's fact ledger and the office's chronology, core story, and list of weaknesses and conflicts.

The firm's Factual Brief Template says this narrative must: tell the material story chronologically; state concrete facts rather than conclusions; identify the responsible actors; use the best examples rather than every repetitive example; reflect both documentary and testimonial proof; avoid unsupported adjectives and overstatement; OMIT LEGAL ARGUMENT; preserve important bad facts; and be short enough that a lawyer understands the case quickly. It must distinguish evidence from inference and never present an inference as confirmed fact. Where the client's own answers conflict, say that they conflict.

No law of any kind: no statute, no case, no element, and no word that states a legal conclusion ("violated", "liable", "unlawful", "entitled to", "supported by", "contradicted"). authority is always empty. Words a person actually said may be quoted in quotation marks.

${SENTENCE_RULES}

Shape it as the firm's final factual summaries run, in four to five short paragraphs:
1. Who, for whom, where, in what role, and when — on the better current evidence, with any conflicting date or name said as a conflict.
2. The wage-and-hour account: schedule, hours, breaks, pay, what she says happened and how often.
3. Anything else material — complaints, leave, discipline, separation — in the order it happened.
4. What the record does not yet contain, and what will decide whether this account becomes a documentary case or must be narrowed: the specific records and witnesses, named.
LENGTH. About 20 sentences in all — the firm's own final summaries run about that. The factual brief above it carries the detail; this is the version a lawyer reads to understand the case quickly. Use the best example, not every example.

Return one section with key "factual-summary".`

// ── checking ────────────────────────────────────────────────────────────────

/** What a sentence is checked against. */
export interface CheckContext {
  /** Bare ids of the standing facts, with what each says and its ledger status. */
  facts: ReadonlyMap<string, { proposition: string; status: string }>
  /** The keys and holding ids this call was HANDED. Nothing else passes. */
  authority: ReadonlySet<string>
  /** The text behind each handed key, for finding a figure in it. */
  authorityText: ReadonlyMap<string, string>
  /** Case records whose holdings were handed: every party-name word of each. */
  heldCases: string[][]
  /** Everything the damages reading wrote, and the baseline. */
  damagesText: string
  /** Figures the damages reading marked estimated or assumed, normalized. */
  estimatedFigures: ReadonlySet<string>
}

/** Legal conclusions in the factual summary. Narrow on purpose: "a form entitled …" is a fact. */
const LEGAL_WORDS =
  /\b(violat\w*|liable|liability|unlawful(?:ly)?|illegal(?:ly)?|entitled to|prima facie|breach\w*|supported by|contradicted by|elements?\s+(?:is|are|was|were)\s+(?:met|satisfied))\b/i
/** 49 Cal.4th 35, 64 · 135 Cal.App.4th 314, 321 */
const REPORTER_PINPOINT = /\b\d+\s+Cal\.\s?(?:App\.\s?)?(?:\dd|\d?th|\d?rd|\d?nd)\s+\d+\s*,\s*\d+/
/** 53 Cal.4th at p. 1040 · supra, at p. 12 */
const SHORT_PINPOINT = /(?:\bCal\.\s?(?:App\.\s?)?\d?(?:th|rd|nd|d)|supra,?)\s+at\s+pp?\.\s*\d+/i
/** The run of capitalised words either side of " v. " */
const CASE_NAME = /((?:[A-Z][A-Za-z.'&-]+\s+)+)v\.\s+((?:[A-Z][A-Za-z.'&-]+\s*)+)/g
/** "Kilby, supra" — a short-form cite */
const SUPRA = /\b([A-Z][A-Za-z'&-]+),?\s+supra\b/g
/** $4,200 · $17.28 · $18 — never the comma after it */
const FIGURE = /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?|\$\s?\d+(?:\.\d+)?/g
/** "section 1198.5" or "§ 226.7" with no code named */
const BARE_SECTION = /(?:\bsections?\s+|§+\s*)\d/i

const normalizeFigure = (f: string) => f.replace(/[$\s,]/g, '')
const words = (s: string) => s.split(/[\s,.;:()]+/).map(w => w.toLowerCase()).filter(w => w.length > 2)
/** The office's own file, named in a brief a court reads. */
const OFFICE_VOICE = /\b(?:the file|on file|the ledger|(?:her|his|their|the) intake|the current record)\b/i
/** Strip what a person is quoted as saying; their words are facts, not the draft's argument. */
const unquoted = (s: string) => s.replace(/[“"][^”"]*[”"]/g, ' ')

export function check(sectionKey: string, s: DraftSentence, ctx: CheckContext): string[] {
  const problems: string[] = []
  const facts = s.facts.map(bareFactId)
  const factual = sectionKey === 'factual-summary'

  for (const id of facts) {
    if (!ctx.facts.has(id)) problems.push(`Cites ${id}, which is not a standing fact in this client's ledger.`)
  }
  for (const key of s.authority) {
    if (!ctx.authority.has(key)) problems.push(`States law from ${key}, which was not handed to this draft.`)
  }
  // Law named in the prose must be law the sentence declares, and law it was handed.
  for (const c of citationsIn(s.text)) {
    if (!ctx.authority.has(c)) problems.push(`Names ${c} in its text, which was not handed to this draft.`)
    else if (!s.authority.includes(c)) problems.push(`Names ${c} in its text without declaring it.`)
  }
  if (!s.authority.length && BARE_SECTION.test(s.text)) {
    problems.push('Names a section without declaring the authority it comes from.')
  }
  for (const id of factIdsIn(s.text)) {
    if (!ctx.facts.has(id)) problems.push(`Writes ${id} into its text, which is not in the ledger.`)
  }
  if (!facts.length && !s.authority.length) {
    problems.push('Rests on nothing on file: it names no fact and no authority.')
  }
  const voice = factual ? null : unquoted(s.text).match(OFFICE_VOICE)
  if (voice) problems.push(`Speaks of "${voice[0]}", the office's file, in a brief a court reads.`)
  if (REPORTER_PINPOINT.test(s.text) || SHORT_PINPOINT.test(s.text)) {
    problems.push('Carries a reporter page number. The stored texts carry none, so it cannot have come from them.')
  }

  // A case is held only if a party name on BOTH sides matches a handed case:
  // "Harris v. Superior Court" is not "Harris v. City of Santa Monica".
  let m: RegExpExecArray | null
  const caseRe = new RegExp(CASE_NAME.source, 'g')
  while ((m = caseRe.exec(s.text)) !== null) {
    const left = words(m[1])
    const right = words(m[2])
    const held = ctx.heldCases.some(parties => left.some(w => parties.includes(w)) && right.some(w => parties.includes(w)))
    if (factual) problems.push(`Names a case ("${m[1].trim()} v. …") in the factual summary, which carries no law.`)
    else if (!held) problems.push(`Names a case ("${m[1].trim()} v. ${m[2].trim().split(/\s+/)[0]}…") that was not handed to this draft.`)
  }
  const supraRe = new RegExp(SUPRA.source, 'g')
  while ((m = supraRe.exec(s.text)) !== null) {
    const name = m[1].toLowerCase()
    if (factual || !ctx.heldCases.some(parties => parties.includes(name))) {
      problems.push(`Cites "${m[1]}, supra", a case that was not handed to this draft.`)
    }
  }

  // A figure has to come from somewhere this draft can show: the damages
  // reading, a fact the sentence cites, or a provision it declares.
  const figRe = new RegExp(FIGURE.source, 'g')
  while ((m = figRe.exec(s.text)) !== null) {
    const fig = normalizeFigure(m[0])
    const inFacts = facts.some(id => normalizeFigure(ctx.facts.get(id)?.proposition ?? '').includes(fig))
    const inLaw = s.authority.some(k => normalizeFigure(ctx.authorityText.get(k) ?? '').includes(fig))
    const inDamages = !factual && normalizeFigure(ctx.damagesText).includes(fig)
    if (!inFacts && !inLaw && !inDamages) {
      problems.push(`States ${m[0]}, which is not in a fact it cites${factual ? '' : ', a provision it cites, or the damages reading'}.`)
    } else if (!inFacts && !inLaw && ctx.estimatedFigures.has(fig) && !readsAsEstimated(s.text)) {
      problems.push(`States ${m[0]} without saying it is an estimate.`)
    }
  }

  if (factual) {
    if (s.authority.length) problems.push('States law in the factual summary, which the template says carries none.')
    const w = unquoted(s.text).match(LEGAL_WORDS)
    if (w) problems.push(`Reads as legal argument ("${w[0]}") in the factual summary.`)
  }
  return problems
}

/**
 * Every sentence checked, with sections that share a key merged — a model
 * that split section IV into two objects had the second half silently
 * dropped — and sections under a key this draft does not write set aside with
 * the reason, so they are shown and not lost.
 */
export function checkDraft(
  out: DraftOutput,
  ctx: CheckContext,
  keys: readonly string[]
): { sections: CheckedSection[]; notWritten: { key: string; why: string }[]; counts: StoredDraft['counts'] } {
  let sentences = 0
  let flagged = 0
  const byKey = new Map<string, CheckedSection>()
  const notWritten = [...out.notWritten]
  for (const sec of out.sections) {
    if (!keys.includes(sec.key)) {
      notWritten.push({ key: sec.key, why: `The model returned a section under "${sec.key}", which this draft does not write; it was set aside.` })
      continue
    }
    const into = byKey.get(sec.key) ?? { key: sec.key, paragraphs: [] }
    for (const p of sec.paragraphs) {
      into.paragraphs.push({
        sentences: p.sentences.map(s => {
          const problems = check(sec.key, s, ctx)
          sentences++
          if (problems.length) flagged++
          return { ...s, facts: s.facts.map(bareFactId), problems, label: labelOf(s, ctx) }
        }),
      })
    }
    byKey.set(sec.key, into)
  }
  return { sections: keys.filter(k => byKey.has(k)).map(k => byKey.get(k)!), notWritten, counts: { sentences, flagged } }
}

/**
 * The firm's evidence label for a sentence, from the facts it cites.
 *
 * An inference is labelled one whatever it cites. Otherwise the weakest fact
 * under it decides: one DISPUTED or UNKNOWN fact makes it UNRESOLVED, one
 * the client reported makes it CLIENT-REPORTED, and only a sentence resting
 * entirely on confirmed facts is CONFIRMED.
 */
export function labelOf(s: DraftSentence, ctx: CheckContext): EvidenceLabel {
  if (s.inference) return 'INFERENCE'
  const statuses = s.facts.map(id => (ctx.facts.get(bareFactId(id))?.status ?? '').toUpperCase())
  if (!statuses.length) return s.authority.length ? 'LAW' : 'UNRESOLVED'
  if (statuses.some(st => st === 'DISPUTED' || st === 'UNKNOWN' || st === '')) return 'UNRESOLVED'
  if (statuses.every(st => st === 'CONFIRMED')) return 'CONFIRMED'
  if (statuses.some(st => st === 'INFERRED')) return 'INFERENCE'
  return 'CLIENT-REPORTED'
}

export function contextFor(brief: Brief, entries: LedgerEntry[], kind: DraftKind): CheckContext {
  const handed = kind === 'trial' ? authorityForDrafting(brief) : { keys: [], cases: [] }
  const d = brief.damages
  const figuresOf = (s: string) => (s.match(new RegExp(FIGURE.source, 'g')) ?? []).map(normalizeFigure)
  return {
    facts: new Map(standing(entries).map(e => [bareFactId(e.id), { proposition: e.proposition, status: e.status }])),
    authority: new Set(handed.keys),
    authorityText: new Map(
      handed.keys.map(k => {
        const { law, num } = parseKey(k)
        return [k, sectionText(law, num) ?? '']
      })
    ),
    heldCases: handed.cases.map(key => words((caseRecord(key)?.name ?? '').replace(/\bv\.\s/, ' '))),
    damagesText: JSON.stringify({ issues: d.issues, totals: d.totals, drivers: d.drivers, baseline: brief.overview.baseline }),
    estimatedFigures: new Set(
      d.issues
        .filter(i => i.basis === 'ESTIMATE' || i.basis === 'ASSUMPTION')
        .flatMap(i => figuresOf(`${i.estimate} ${i.math}`))
    ),
  }
}

// ── the call ────────────────────────────────────────────────────────────────

/**
 * Stops before the host does. The request is capped at 300 seconds; a call
 * still running at 270 is abandoned with a message rather than cut off with
 * nothing, and the draft that did not finish is not paid for twice by a
 * silent retry.
 */
const DEADLINE_MS = 270_000

async function call(client: Anthropic, system: string, facts: string, rest: string, label: string, meter: Meter): Promise<DraftOutput> {
  let response
  try {
    response = await client.messages
      .stream(
        {
          model: DRAFT_MODEL,
          // Sixty-odd sentence objects; twenty thousand was room to run past
          // the deadline, not room the draft needs.
          max_tokens: 16000,
          system,
          thinking: thinkingFor(DRAFT_MODEL, 'medium', 16000).thinking,
          output_config: { ...thinkingFor(DRAFT_MODEL, 'medium', 16000).effort, format: zodOutputFormat(DraftOutput) },
          messages: [{ role: 'user', content: [{ type: 'text', text: `=== FACTS ON FILE ===\n\n${facts}` }, { type: 'text', text: rest }] }],
        },
        { signal: AbortSignal.timeout(DEADLINE_MS) }
      )
      .finalMessage()
  } catch (err) {
    if ((err as Error)?.name === 'TimeoutError' || /abort/i.test((err as Error)?.message ?? '')) {
      throw new Error(`The ${label} draft did not finish inside the request limit. Nothing was kept.`)
    }
    throw plainly(err, `${label} draft`)
  }
  meter.add(response.usage)
  if (response.stop_reason === 'max_tokens') throw new Error(`The ${label} draft ran out of room.`)
  const parsed = response.parsed_output
  if (!parsed) throw new Error(`The ${label} draft came back unreadable.`)
  return parsed
}

/**
 * Drafts one kind — the trial sections or the factual summary — and checks
 * every sentence.
 *
 * One retry, for an unreadable result only: the SDK already retries transport
 * failures, and the matrix learned that a schema-rejected answer is
 * intermittent. A timeout or a max_tokens stop is not retried; running the
 * same thing again would pay twice for the same failure.
 */
export async function draftBrief(
  kind: DraftKind,
  brief: Brief,
  entries: LedgerEntry[],
  meter: Meter = new Meter()
): Promise<StoredDraft> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured, so no draft can be written.')
  }
  const facts = factSheet(entries)
  if (!facts.trim()) throw new Error('This client has no facts on file, so there is nothing to draft from.')

  const client = new Anthropic({ maxRetries: 2 })
  const rest =
    kind === 'trial'
      ? `=== THE OFFICE'S READING OF THE CASE ===\n\n${JSON.stringify(briefForDrafting(brief), null, 1)}\n\n=== THE LAW THAT READING RELIED ON, QUOTED IN FULL ===\n\n${authorityForDrafting(brief).text}`
      : `=== THE OFFICE'S CHRONOLOGY AND WEAKNESSES ===\n\n${JSON.stringify(factualForDrafting(brief), null, 1)}`
  const system = kind === 'trial' ? LEGAL_SYSTEM : FACTUAL_SYSTEM
  const label = kind === 'trial' ? 'trial brief' : 'factual summary'

  let out: DraftOutput
  try {
    out = await call(client, system, facts, rest, label, meter)
  } catch (err) {
    if (!/unreadable/.test((err as Error).message)) throw err
    out = await call(client, system, facts, rest, label, meter)
  }

  const checked = checkDraft(out, contextFor(brief, entries, kind), KEYS_OF[kind])
  return {
    kind,
    sections: checked.sections,
    notWritten: checked.notWritten,
    basis: draftBasis(kind, brief, entries),
    model: DRAFT_MODEL,
    writtenAt: new Date().toISOString(),
    counts: checked.counts,
  }
}

/** Every key a draft of any kind may write, for a sheet listing what was set aside. */
export const ALL_DRAFT_KEYS: readonly string[] = DRAFT_KEYS
