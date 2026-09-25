/**
 * Turns a client's answers into atomic facts.
 *
 * This is the bottom of the corpus's stack: source -> atomic fact -> proof ->
 * chronology -> claim mapping. Everything above it is only as good as this, so
 * the rules here are strict and the prompt enforces them rather than suggesting
 * them.
 *
 * What makes this different from the reading that already exists in
 * lib/caseAnalysis.ts: that one produces an argument about the answers and
 * replaces itself each time it runs. This produces facts that persist, carry
 * their source, and can be corrected without losing what they replaced. The
 * analysis is a view; the ledger is the record.
 *
 * Deliberately NOT here: any legal conclusion. The corpus is explicit that the
 * factual layer stays fact-centred and legal conclusions come only after the
 * record is tested against authority (sec. 1, "Facts are not law"). The model
 * is told to tag which claims a fact might bear on, and told not to decide
 * whether the claim exists.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { answersForReading } from '@/lib/modules'
import { FactNugget, LedgerEntry, standing } from '@/lib/factLedger'
import { SetRows, Supersession, afterAdditions, checkSupersessions, nextFactNumber } from '@/lib/factAdditions'
import { plainly } from '@/lib/modelErrors'
import { Meter } from '@/lib/spend'
import { AnswerValue } from '@/types'

import { EXTRACTION_MODEL } from '@/lib/models'

export { EXTRACTION_MODEL }

/** What one section of the questionnaire yields. */
const SectionFacts = z.object({ facts: z.array(FactNugget) })

/**
 * Places the client's own answers disagree with each other.
 *
 * A separate pass, over the facts rather than the answers, because a
 * contradiction is rarely inside one section — the hours she states and the
 * shift times she lists are three screens apart, and a pass that can only see
 * one section cannot notice. It is also the finding that matters most: a gap is
 * a number nobody has yet, but a client whose own answers disagree is a
 * credibility problem, and the other side finds it first.
 */
const Contradictions = z.object({
  contradictions: z.array(
    z.object({
      about: z.string(),
      oneAnswer: z.string(),
      otherAnswer: z.string(),
      whyItMatters: z.string(),
      howToResolve: z.string(),
    })
  ),
})
export type Contradiction = z.infer<typeof Contradictions>['contradictions'][number]

const SYSTEM = `You build the factual record for a California employment law office.

You are given one client's intake answers. You turn them into atomic facts. You do NOT argue
about them, you do NOT decide whether a claim exists, and you do NOT apply law. Another pass
does that, and it can only do it well if what you produce is clean.

WHAT AN ATOMIC FACT IS

One proposition. "She worked five days a week" is one fact. "She worked five days a week and
was not paid overtime" is two, and they have different sources and different statuses.

RULES, IN ORDER OF HOW MUCH THEY MATTER

1. NEVER WRITE A FACT THE ANSWERS DO NOT CONTAIN. Not an inference dressed as a fact, not a
   plausible filling of a gap. If the rate is not given, there is no rate fact — there is an
   UNKNOWN fact that says the question was asked and the answer was "I don't know", with the
   open loop naming what would settle it.

2. KEEP THEIR WORDS. verbatim is the client's answer exactly as they gave it, in the language
   they gave it in. Do not translate it, do not tidy it, do not paraphrase it. proposition is
   your normalized version for reuse. Both, always. If the answer was a multiple choice, the
   verbatim is the choice they picked.

3. STATUS IS EVIDENCE, NOT CONFIDENCE.
   CONFIRMED  something other than the client's own account supports it — a document on file,
              a second answer that independently establishes it, a record.
   REPORTED   the client said it and nothing corroborates or contradicts it. This is the
              normal status for intake. Most facts you produce are REPORTED.
   INFERRED   you derived it from other facts. Say the derivation in confidenceBasis. Use
              this sparingly and never for anything a damages figure rests on.
   DISPUTED   two answers disagree, or an answer disagrees with a document.
   UNKNOWN    the question was asked and not answered, or answered "I don't know".

4. PROVENANCE IS NOT OPTIONAL. Every fact names the question it came from. "portal answer" is
   the kind; the question's own text or id is the pinpoint. A fact with a vague source is
   worse than no fact, because it cannot be checked.

5. TAG, DO NOT CONCLUDE. legalTags names the claims or elements a fact might bear on — "meal
   periods", "off-the-clock work", "retaliation — protected activity". That is a pointer for
   the later pass. Do not write "this establishes a violation of section 512". You are not
   deciding that.

6. damagesTags is for the inputs an arithmetic needs: rate, hours per day, days per week,
   weeks worked, frequency, period, final pay date. Tag a fact with these only when it
   actually supplies one.

7. CONTRADICTIONS ARE FINDINGS. When two answers cannot both be true, produce BOTH facts,
   mark both DISPUTED, and record the contradiction separately with how to resolve it. Do not
   pick a winner. Do not quietly drop one.

8. openLoop is the exact next thing to get, and where: "hourly rate at hire and at each
   change — paystubs, or her bank deposits". Leave it empty when the fact is settled.

Be complete about what matters and silent about what does not. An answer of "no" to a
question that rules something out IS a fact worth keeping — "never worked seven days in a
row" closes a claim and the reader needs to see it was asked.`

export interface ExtractionInput {
  clientId: string
  clientName: string
  answers: Record<string, AnswerValue>
  /**
   * Answers to question sets the office assigned outside the numbered modules.
   *
   * These live in their own table and are not part of the questionnaire's
   * structure, so nothing here would have found them — and two clients had
   * answered thirty-five and thirty-six of them. A follow-up round written
   * without them would have asked a client what she had already told us,
   * which the corpus forbids and which reads to her as nobody listening.
   */
  extra?: { title: string; rows: { id: string; label: string; answer: string }[] }[]
  /** Counts what the run used, when the caller wants to know. */
  meter?: Meter
  /** Set by extractAdditions, which runs the check once over the whole ledger instead. */
  skipContradictions?: boolean
}

const shown = (v: AnswerValue | undefined): string =>
  Array.isArray(v) ? v.join('; ') : String(v ?? '').trim()

/**
 * The answers, split the way the questionnaire itself is.
 *
 * One call over a full questionnaire ran out of room partway through the JSON
 * and the whole extraction was lost — 184 answers, each becoming a fact with
 * its verbatim and its provenance, is more than one response can hold. The
 * sections are the natural seam: the facts inside one are about the same
 * subject and belong together, and they run at the same time.
 */
export function sections(input: ExtractionInput): { title: string; text: string; answered: number }[] {
  const reading = answersForReading(input.answers)
  const out: { title: string; text: string; answered: number }[] = []
  for (const section of reading.sections) {
    const rows: string[] = []
    for (const q of section.questions) {
      const value = shown(reading.filed[q.id])
      if (!value) continue
      rows.push(`[${q.id}] ${q.label}\n  ANSWER: ${value}`)
    }
    if (rows.length) out.push({ title: section.title, text: rows.join('\n'), answered: rows.length })
  }

  // Assigned question sets, as their own sections. Same shape, so a fact from
  // one carries the same provenance as a fact from the questionnaire.
  for (const set of input.extra ?? []) {
    const rows = set.rows
      .filter(r => r.answer.trim())
      .map(r => `[${r.id}] ${r.label}\n  ANSWER: ${r.answer}`)
    if (rows.length) out.push({ title: set.title, text: rows.join('\n'), answered: rows.length })
  }
  return out
}

/** The whole questionnaire as one transcript, for anything that needs it all. */
export function sourceText(input: ExtractionInput): { text: string; answered: number } {
  const parts = sections(input)
  return {
    text: parts.map(p => `## ${p.title}\n${p.text}`).join('\n\n'),
    answered: parts.reduce((n, p) => n + p.answered, 0),
  }
}

/** Runs `run` over every item, `limit` at a time, keeping input order. */
async function mapWithLimit<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      results[i] = await run(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/**
 * How many sections are read at once.
 *
 * All of them, in practice. The sections are independent — the prompt says so
 * to the model — and the wall clock of a wave is the slowest section in it,
 * not the sum. Measured on one client's file: a one-answer section finished in
 * 5 seconds and a thirty-five-answer section in 90, an eighteen-fold spread.
 * At five at a time a seventeen-section file ran four waves and could draw a
 * slow section into each, so the file took four times its slowest section
 * rather than once — and on two clients it never came back inside the request
 * at all.
 *
 * Raising this costs nothing. It is the same calls, sent together instead of
 * in queues, so the tokens are identical and only the waiting changes. The cap
 * is a courtesy to the provider's rate limits rather than a budget.
 */
const SECTION_CONCURRENCY = 24


async function ask<T>(
  client: Anthropic,
  what: string,
  schema: z.ZodType<T>,
  system: string,
  user: string,
  meter?: Meter
): Promise<T> {
  let response
  try {
    response = await client.messages
      .stream({
        model: EXTRACTION_MODEL,
        max_tokens: 24000,
        system,
        thinking: { type: 'adaptive' },
        // Extraction against strict rules rather than open reasoning, and every
        // answer has to be covered — the budget goes on finishing.
        output_config: { effort: 'medium', format: zodOutputFormat(schema) },
        messages: [{ role: 'user', content: user }],
      })
      .finalMessage()
  } catch (err) {
    throw plainly(err, what)
  }
  meter?.add(response.usage)
  if (response.stop_reason === 'max_tokens') {
    throw new Error(`The ${what} ran out of room before it finished. Run it again.`)
  }
  const parsed = response.parsed_output
  if (!parsed) throw new Error(`The ${what} came back in a form we could not read.`)
  return parsed
}

/**
 * Reads one client's answers into facts.
 *
 * Sections at the same time, then one pass over what came back to find where
 * the client's own answers disagree — that one needs to see everything, and it
 * can, because facts are small where answers are not.
 *
 * Returns entries ready to store, none superseded: reconciling against a ledger
 * already on file is a separate judgement and needs that ledger in front of it.
 */
export async function extractFacts(input: ExtractionInput): Promise<{
  entries: LedgerEntry[]
  contradictions: Contradiction[]
  answered: number
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured, so facts cannot be extracted.')
  }

  const parts = sections(input)
  const answered = parts.reduce((n, p) => n + p.answered, 0)
  if (!answered) return { entries: [], contradictions: [], answered: 0 }

  const client = new Anthropic({ maxRetries: 2 })
  const header = `CLIENT: ${input.clientName}`

  const found = await mapWithLimit(parts, SECTION_CONCURRENCY, part =>
    ask(
      client,
      `"${part.title}" extraction`,
      SectionFacts,
      `${SYSTEM}

You are given ONE section of the questionnaire. Extract the facts it contains and nothing
else — other sections are being read at the same time, and a fact produced twice is a fact
counted twice. Do not reach for context you were not given; if an answer here only makes
sense alongside something elsewhere, say so in the fact's openLoop rather than guessing.`,
      `${header}\n\n=== SECTION: ${part.title} (${part.answered} answered) ===\n\n${part.text}`,
      input.meter
    ).then(r => r.facts)
  )

  const facts = found.flat()
  const entries: LedgerEntry[] = facts.map((f, i) => ({
    ...f,
    // Namespaced and positional, so a fact is citable from anywhere and two
    // clients' ledgers cannot collide on an id the model happened to reuse.
    id: `${input.clientId}:f${String(i + 1).padStart(3, '0')}`,
    addedBy: EXTRACTION_MODEL,
    supersededBy: null,
    supersededWhy: null,
  }))

  if (!entries.length || input.skipContradictions) return { entries, contradictions: [], answered }

  const contradictions = await findContradictions(client, header, entries, input.meter)
  return { entries, contradictions, answered }
}

/** One fact per line, as the passes over the whole ledger read it. */
const listed = (entries: LedgerEntry[]) =>
  entries.map(e => `${e.id} [${e.status}] ${e.proposition}  (from ${e.provenance.pinpoint})`).join('\n')

/**
 * Where the facts cannot all be true.
 *
 * Run over the whole ledger, not a section, because a contradiction is rarely
 * inside one section.
 */
async function findContradictions(
  client: Anthropic,
  header: string,
  entries: LedgerEntry[],
  meter?: Meter
): Promise<Contradiction[]> {
  const { contradictions } = await ask(
    client,
    'contradiction check',
    Contradictions,
    `${SYSTEM}

This pass does not extract. The facts below were taken from one client's answers, section by
section. Find where they cannot all be true.

A real contradiction is two propositions that cannot both hold — she states 6.5 hours a day
and lists shifts that run 7.5; her final pay date falls before her last day; she says nothing
is owed while describing months of unpaid work. Quote the actual propositions.

What is NOT a contradiction: a gap, an estimate that differs from a precise figure by a
sensible margin, or two facts about different periods. Do not manufacture one. If the answers
are consistent, return an empty list — that is a real and useful answer.

For each, say why it matters and the single question that would resolve it.`,
    `${header}\n\n=== FACTS (${entries.length}) ===\n\n${listed(entries)}`,
    meter
  )
  return contradictions
}

const Supersessions = z.object({
  supersessions: z.array(z.object({ oldId: z.string(), newId: z.string(), why: z.string() })),
})

/**
 * Reads answers that arrived after the ledger was built, and reconciles them
 * with it.
 *
 * Three passes:
 * - The new answers are read the way any section is, and numbered after the
 *   highest id on file.
 * - The new facts are read beside the standing ledger, to find which old
 *   facts they correct or settle.
 * - The contradiction check runs again over the ledger as it will stand,
 *   because answers written to resolve a conflict should leave it resolved.
 *
 * Nothing is stored here. The route stores the facts first, then the
 * supersessions, because both ids of a supersession must already exist.
 */
export async function extractAdditions(input: {
  clientId: string
  clientName: string
  sets: SetRows[]
  ledger: LedgerEntry[]
  meter?: Meter
}): Promise<{
  entries: LedgerEntry[]
  kept: Supersession[]
  setAside: { proposed: Supersession; why: string }[]
  contradictions: Contradiction[]
  answered: number
}> {
  const read = await extractFacts({
    clientId: input.clientId,
    clientName: input.clientName,
    answers: {},
    extra: input.sets,
    meter: input.meter,
    // The contradiction check below is run once over the whole ledger.
    skipContradictions: true,
  })
  const first = nextFactNumber(input.ledger)
  const entries = read.entries.map((e, i) => ({
    ...e,
    id: `${input.clientId}:f${String(first + i).padStart(3, '0')}`,
  }))
  if (!entries.length) return { entries, kept: [], setAside: [], contradictions: [], answered: read.answered }

  const client = new Anthropic({ maxRetries: 2 })
  const header = `CLIENT: ${input.clientName}`
  const { supersessions } = await ask(
    client,
    'reconciliation',
    Supersessions,
    `${SYSTEM}

This pass does not extract. The client has answered follow-up questions, sent to settle what
her first answers left open or contradictory. NEW FACTS were read from those answers. STANDING
FACTS are the record as it stood before them.

For each new fact that corrects, clarifies or settles a standing fact, name the standing fact it
replaces: oldId the standing fact, newId the new one, and why in one sentence that says what the
record said before and what she says now. A new fact settles a standing fact when:
- it answers the same question differently or more exactly,
- it resolves a DISPUTED fact or a recorded contradiction, or
- it answers what an UNKNOWN fact said was not known.

Replace nothing merely because a new fact is related or adds detail. A detail that leaves the
old fact true replaces nothing. Never replace a fact with one that says less.

A hedged answer replaces nothing. "Probably", "I think", "I don't remember well" — or an answer
that still does not know what the old fact said was not known — leaves the specific earlier
answer standing. Both stay, and the contradiction check that follows records the conflict.
DAYEON KIM said she did not remember when or how many times her rest breaks were interrupted,
but probably rested fully; that did not make her earlier answer, that she answered a work phone
during them, untrue, and it did not tell anyone on how many days a break was lost. A client changing
an answer is itself a fact the office must see, so the reason must name both versions; the old
fact stays in the record, marked replaced. If no standing fact is settled, return an empty list.`,
    `${header}\n\n=== STANDING FACTS (${standing(input.ledger).length}) ===\n\n${listed(standing(input.ledger))}` +
      `\n\n=== NEW FACTS (${entries.length}) ===\n\n${listed(entries)}`,
    input.meter
  )
  const { kept, setAside } = checkSupersessions(supersessions, input.ledger, entries, input.clientId)

  const after = standing(afterAdditions(input.ledger, entries, kept))
  const contradictions = await findContradictions(client, header, after, input.meter)
  return { entries, kept, setAside, contradictions, answered: read.answered }
}
