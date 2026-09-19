/**
 * The next questions to ask the client, and nothing more than that.
 *
 * Everything above this file is internal: the ledger, the matrix, the spine
 * are read by a lawyer. This is the first layer whose output goes to a person
 * who is not one — someone who worked five shifts a week at a restaurant and
 * is now being asked, by a law office, to remember what time she took her
 * break eighteen months ago. The writing constraints are therefore not a
 * matter of tone. A question she misreads produces an answer that is wrong,
 * the ledger records it as REPORTED, and every layer above inherits it.
 *
 * What a question IS, and what disqualifies one, lives in lib/followUpShape.ts
 * so the admin panel that reviews them can hold the same rules without pulling
 * the model SDK into a browser. This file is the reading.
 *
 * WHAT THE ANSWERS DO
 *
 * Every question carries what it is FOR — the fact whose open loop it closes,
 * the element it would settle, the contradiction it tests. That is not
 * documentation. It is the return path: an answer without it is a string in a
 * database, and an answer with it becomes a fact in the ledger that supersedes
 * or confirms a named one, which is what the corpus means by the brief being
 * living rather than rewritten.
 *
 * WHAT THIS DOES NOT DO
 *
 * It does not send anything. It proposes a set for the office to read, and the
 * office sends it. Nothing here should ever reach a client unread, and the
 * translations least of all: a question generated in Korean is a question no
 * English-speaking reviewer can check, so the English is generated beside it
 * and both are kept.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { Lang } from '@/lib/langs'
import { LedgerEntry, openLoops, standing, unsettled } from '@/lib/factLedger'
import { ClaimFinding, unresolved } from '@/lib/claimMatrix'
import { SpineReading, toObtain, undated } from '@/lib/evidenceSpine'
import { Contradiction } from '@/lib/factExtraction'
import { plainly } from '@/lib/modelErrors'
import { FollowUpSet, FollowUpSetShape } from '@/lib/followUpShape'

export * from '@/lib/followUpShape'

import { FOLLOWUP_MODEL } from '@/lib/models'

export { FOLLOWUP_MODEL }

/**
 * Everything the layers below already know they are missing.
 *
 * Nothing new is worked out here. The ledger records an open loop on every
 * fact that pointed at something it could not settle; the matrix reports every
 * element it could not reach and every damages input it lacks; the spine
 * reports the silences, the undated events, the date conflicts and the records
 * nobody has. Assembling them is a join, and the model's job is to choose
 * among them and write well — not to rediscover the gaps.
 */
export interface Gaps {
  openLoops: { factId: string; need: string }[]
  unsettledFacts: { id: string; proposition: string; status: string; contrary: string }[]
  elements: { claimId: string; element: string; state: string; need: string }[]
  damagesMissing: { claimId: string; need: string }[]
  contradictions: Contradiction[]
  dateConflicts: { about: string; whyItMatters: string; howToResolve: string }[]
  silences: { from: string; to: string; whatWouldFillIt: string }[]
  undatedEvents: string[]
  recordsToGet: { record: string; howToGetIt: string }[]
  anomalies: { kind: string; what: string; wouldConfirmIt: string }[]
  testimonyAlone: string[]
}

export function gaps(
  entries: LedgerEntry[],
  findings: ClaimFinding[],
  spine: SpineReading | null,
  contradictions: Contradiction[] = []
): Gaps {
  return {
    openLoops: openLoops(entries),
    unsettledFacts: unsettled(entries).map(e => ({
      id: e.id,
      proposition: e.proposition,
      status: e.status,
      contrary: e.contrary,
    })),
    elements: unresolved(findings),
    damagesMissing: findings.flatMap(f => f.damagesMissing.map(need => ({ claimId: f.claimId, need }))),
    contradictions,
    dateConflicts: (spine?.dateConflicts ?? []).map(c => ({
      about: c.about,
      whyItMatters: c.whyItMatters,
      howToResolve: c.howToResolve,
    })),
    silences: (spine?.silences ?? []).map(s => ({ from: s.from, to: s.to, whatWouldFillIt: s.whatWouldFillIt })),
    undatedEvents: spine ? undated(spine.events).map(e => e.event) : [],
    recordsToGet: spine ? toObtain(spine.records).map(r => ({ record: r.record, howToGetIt: r.howToGetIt })) : [],
    anomalies: (spine?.anomalies ?? []).map(a => ({ kind: a.kind, what: a.what, wouldConfirmIt: a.wouldConfirmIt })),
    testimonyAlone: (spine?.restingOnTestimonyAlone ?? []).map(c => c.note),
  }
}

const LANGUAGE_NAME: Record<Lang, string> = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese',
  ko: 'Korean',
}

const SYSTEM = `You write the next questions a California employment law office will put to its own
client. The client is not a lawyer. She answered a long intake questionnaire once already, and
everything you are shown came out of those answers.

You are writing FOR HER. Every other layer of this system writes for the attorney; this one does
not. A question she misreads produces a wrong answer that the file then treats as her testimony.

HOW TO WRITE A QUESTION

1. ONE IDEA. One question mark, one thing asked. Never two joined with "and".

2. SIXTH-GRADE WORDS. No legal terms, ever — not "meal period", not "premium", not "regular
   rate", not "retaliation", not "off the clock". Say the thing itself: "the break you get to
   eat", "extra pay", "your pay rate", "what happened after you spoke up", "before you clocked
   in". A question containing a legal term is rejected before it is sent and the whole set comes
   back for rewriting.

3. NEVER SUPPLY THE FACT. This is the rule that matters most and it is easy to break by being
   helpful. "Did your manager tell you that you could not clock in early?" hands her the answer
   and it is worthless as testimony. "What happened when you got there before your shift?" does
   not. Ask what happened; do not offer what you expect.

4. NEVER ASK FOR A CONCLUSION. Not "were you working during that time", which is the legal
   question. "What were you doing" is the factual one.

5. USE THE LADDER. Each question names its rung, by NUMBER:
     1  threshold              Did this happen at all?
     2  concrete incident      Tell us about one time you remember clearly.
     3  representative         What usually happened on a normal day or week?
     4  frequency and duration How often, how long, over what period?
     5  who knew               Who told you, saw it, approved it, changed it, or knew?
     6  proof                  What schedule, pay stub, text, photo or coworker could show it?
     7  exceptions             Were there days when the opposite happened?
     8  contradiction check    Earlier you said X; this sounds like Y.
     9  confidence             Is that exact, a best guess, or not sure?
     10 confirmation           Say the key point back plainly; ask her to confirm or correct.

   resolves.kind is one of exactly these words: open loop, element, date conflict, silence,
   anomaly, contradiction, damages input, record.
   type is one of exactly these: text, textarea, yes_no, yes_no_unsure, select, multiselect,
   number, date, time, currency.

   The order is the method. Do not ask for a frequency from someone you have not first walked
   through one occasion — she will produce a number to be helpful, and a guessed number is worse
   than no number, because it looks like evidence.

6. A CONTRADICTION IS CHECKED, NOT CHALLENGED. She is the client. "Earlier you said the break
   was a full 30 minutes; you also said someone asked you a work question during it. Did both of
   those happen, maybe on different days?" — offering "both happened at different times" as a
   real option is the point. Never imply she was careless or untruthful.

7. ALWAYS LET HER SAY SHE DOES NOT KNOW. Every choice question carries a "not sure" option.
   Where she is estimating, ask on the next rung how sure she is. Never force precision.

8. USE MEMORY CUES. Reconstruct through things that exist — the schedule and where it was
   posted, the group chat, coworkers on the same shifts, paydays, opening and closing tasks,
   busy nights, photos on her phone, where she put her bag. "How many times a month" is a
   question about a number nobody kept. "Which days were you on the schedule that was posted in
   the group chat?" is a question about a thing.

9. DO NOT RE-ASK. She has answered a long questionnaire. Ask again only to test a contradiction,
   to clear up something material that her answer left genuinely ambiguous, or to confirm one
   important point in different words — and say which of those it is.

CHOOSING WHAT TO ASK

The gaps are given to you and there are more of them than anyone should be sent. Choose. Rank by
what would most change the case, and stop. A set she finishes is worth more than a longer one she
abandons halfway. Say what you left out and why.

Group questions so the gate comes first: ask the threshold, then let the follow-ups depend on it
with askOnlyIf, so a client who did not experience something is not walked through eight
questions about it.`

export interface FollowUpRequest {
  entries: LedgerEntry[]
  findings: ClaimFinding[]
  spine: SpineReading | null
  contradictions?: Contradiction[]
  /** The language the client reads the portal in. */
  lang: Lang
  /** The most questions to produce. The corpus asks for the smallest useful set. */
  limit?: number
}

function brief(g: Gaps, entries: LedgerEntry[], lang: Lang, limit: number): string {
  const list = (title: string, rows: string[]) =>
    rows.length ? `${title}\n${rows.map(r => `  - ${r}`).join('\n')}` : ''

  const parts = [
    list('ELEMENTS THE OFFICE CANNOT ANSWER', g.elements.map(e => `${e.claimId}:${e.element} (${e.state}) — would be settled by: ${e.need}`)),
    list('NUMBERS A DAMAGES FIGURE NEEDS AND DOES NOT HAVE', g.damagesMissing.map(d => `${d.claimId}: ${d.need}`)),
    list("THE CLIENT'S OWN ANSWERS THAT DISAGREE", g.contradictions.map(c => `${c.about} — one answer: ${c.oneAnswer} | another: ${c.otherAnswer} | resolve by: ${c.howToResolve}`)),
    list('DATES THAT DO NOT LINE UP', g.dateConflicts.map(c => `${c.about} — ${c.whyItMatters}`)),
    list('STRETCHES OF THE EMPLOYMENT NOTHING IS KNOWN ABOUT', g.silences.map(s => `${s.from} to ${s.to} — would be filled by: ${s.whatWouldFillIt}`)),
    list('THINGS THAT HAPPENED BUT ARE NOT PLACED IN TIME', g.undatedEvents),
    list('FACTS THAT POINT AT SOMETHING NOBODY HAS YET', g.openLoops.map(o => `${o.factId}: ${o.need}`)),
    list('WHERE THE CASE RESTS ON HER WORD ALONE', g.testimonyAlone),
    list('ODDITIES IN THE RECORD', g.anomalies.map(a => `[${a.kind}] ${a.what}`)),
    list('RECORDS NOBODY HAS', g.recordsToGet.map(r => `${r.record} — ${r.howToGetIt}`)),
  ].filter(Boolean)

  return `THE CLIENT READS: ${LANGUAGE_NAME[lang]}
${lang === 'en' ? 'Leave inTheirLanguage null.' : `Write every question twice: in English, and in ${LANGUAGE_NAME[lang]}. The ${LANGUAGE_NAME[lang]} is what she will actually read, so write it as a native question at a sixth-grade level — not as a translation of the English. The English is there so the office can check it.`}

ASK AT MOST ${limit} QUESTIONS.

=== WHAT SHE HAS ALREADY BEEN ASKED AND ANSWERED ===

${standing(entries)
  .map(e => `${e.id} [${e.status}] ${e.proposition}${e.period ? ` (${e.period})` : ''}`)
  .join('\n')}

=== WHAT IS STILL MISSING ===

${parts.join('\n\n')}`
}

/**
 * Proposes the next set of questions.
 *
 * One call. The gaps have to be weighed against each other to pick the
 * smallest useful set, and a model that can only see one of them cannot do
 * that — it would return every question it could think of for its own gap,
 * which is how a client receives ninety questions and answers none.
 */
export async function askFollowUps(req: FollowUpRequest): Promise<FollowUpSet> {
  const g = gaps(req.entries, req.findings, req.spine, req.contradictions)
  const limit = req.limit ?? 20
  if (!standing(req.entries).length) return { questions: [], leftOut: [] }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured, so follow-up questions cannot be written.')
  }

  const client = new Anthropic({ maxRetries: 2 })
  let response
  try {
    response = await client.messages
      .stream({
        model: FOLLOWUP_MODEL,
        max_tokens: 32000,
        system: SYSTEM,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium', format: zodOutputFormat(FollowUpSetShape) },
        messages: [{ role: 'user', content: brief(g, req.entries, req.lang, limit) }],
      })
      .finalMessage()
  } catch (err) {
    throw plainly(err, 'follow-up questions')
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('The follow-up questions ran out of room. Ask for fewer.')
  }
  const parsed = response.parsed_output
  if (!parsed) throw new Error('The follow-up questions came back unreadable.')
  return parsed
}
