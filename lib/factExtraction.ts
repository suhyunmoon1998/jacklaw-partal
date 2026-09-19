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
import { FactNugget, LedgerEntry } from '@/lib/factLedger'
import { plainly } from '@/lib/modelErrors'
import { AnswerValue } from '@/types'

export const EXTRACTION_MODEL = 'claude-opus-5'

const Extracted = z.object({
  facts: z.array(FactNugget),
  /**
   * Places the client's own answers disagree with each other.
   *
   * Not a side note. A contradiction inside an intake is the thing the other
   * side finds first, and it costs the client credibility rather than a number
   * — so it is extracted deliberately rather than left to be noticed.
   */
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
export type Extracted = z.infer<typeof Extracted>

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
}

const shown = (v: AnswerValue | undefined): string =>
  Array.isArray(v) ? v.join('; ') : String(v ?? '').trim()

/** The answers as question-and-answer pairs, with the ids the facts will cite. */
export function sourceText(input: ExtractionInput): { text: string; answered: number } {
  const { sections, filed } = answersForReading(input.answers)
  const out: string[] = []
  let answered = 0
  for (const section of sections) {
    const rows: string[] = []
    for (const q of section.questions) {
      const value = shown(filed[q.id])
      if (!value) continue
      answered++
      rows.push(`[${q.id}] ${q.label}\n  ANSWER: ${value}`)
    }
    if (rows.length) out.push(`## ${section.title}\n${rows.join('\n')}`)
  }
  return { text: out.join('\n\n'), answered }
}

/**
 * Reads one client's answers into facts.
 *
 * Returns ledger entries ready to store: ids namespaced to the client so a fact
 * can be cited from anywhere, and nothing superseded yet — reconciling against
 * what is already on file is a separate step, because it is a different
 * judgement and it needs the existing ledger in front of it.
 */
export async function extractFacts(input: ExtractionInput): Promise<{
  entries: LedgerEntry[]
  contradictions: Extracted['contradictions']
  answered: number
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured, so facts cannot be extracted.')
  }

  const { text, answered } = sourceText(input)
  if (!answered) {
    return { entries: [], contradictions: [], answered: 0 }
  }

  const client = new Anthropic({ maxRetries: 2 })
  let response
  try {
    response = await client.messages
      .stream({
        model: EXTRACTION_MODEL,
        max_tokens: 32000,
        system: SYSTEM,
        thinking: { type: 'adaptive' },
        // Extraction with strict rules rather than open reasoning, and the
        // whole questionnaire has to be covered — so the budget goes on
        // finishing rather than on thinking harder about any one answer.
        output_config: { effort: 'medium', format: zodOutputFormat(Extracted) },
        messages: [
          {
            role: 'user',
            content: `CLIENT: ${input.clientName}\n\n=== ANSWERS (${answered}) ===\n\n${text}`,
          },
        ],
      })
      .finalMessage()
  } catch (err) {
    throw plainly(err, 'fact extraction')
  }

  if (response.stop_reason === 'max_tokens') {
    throw new Error('The extraction ran out of room. Run it again.')
  }
  const parsed = response.parsed_output
  if (!parsed) throw new Error('The facts came back in a form we could not read.')

  const entries: LedgerEntry[] = parsed.facts.map((f, i) => ({
    ...f,
    // Namespaced and positional, so a fact is citable and two clients' ledgers
    // can never collide on an id the model happened to choose twice.
    id: `${input.clientId}:f${String(i + 1).padStart(3, '0')}`,
    addedBy: EXTRACTION_MODEL,
    supersededBy: null,
    supersededWhy: null,
  }))

  return { entries, contradictions: parsed.contradictions, answered }
}
