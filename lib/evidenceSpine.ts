/**
 * The chronology, and the small set of proof the case actually stands on.
 *
 * The corpus puts this between the facts and the claims, and says why: "Build
 * the chronology before writing the final narrative" (sec. 4). A claim analysis
 * written off an unordered pile of facts can be right about every element and
 * still miss that the client was hired after the conduct she describes, or that
 * the only two dated events in the file are eleven months apart.
 *
 * Three things come out of this layer, and they are different questions, so
 * they are asked separately:
 *
 *   THE CHRONOLOGY. Every material event in the corpus's own six fields —
 *   date/time, event, source, people, issue/element, why it matters. Nothing
 *   is added to that shape and nothing is dropped from it.
 *
 *   THE ANOMALIES. The corpus names nine things to look for in a wage case and
 *   they are listed here in code, not left to the model to think of. A model
 *   asked "notice anything odd" notices something every time. A model asked
 *   "are any of these nine present, and in which facts" is doing detection.
 *
 *   THE SPINE. "The small number of facts and records that make the case
 *   understandable and provable", ranked by the corpus's order of proof —
 *   defendant records first, the client's own memory last. Most of the records
 *   at the top of that ranking are in the employer's hands, so the spine's
 *   most useful output is the list of what the office does not have yet.
 *
 * What this layer does NOT do: find contradictions between the client's
 * answers. That already happens in lib/factExtraction.ts, over the answers,
 * where it belongs. The conflicts found here are conflicts about WHEN — two
 * facts that put the same event in different places on the calendar — which is
 * a chronology problem and invisible until the chronology exists.
 *
 * Nothing here decides a legal question, and nothing here reaches a client.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { CLAIMS } from '@/lib/authority/claims'
import { LedgerEntry } from '@/lib/factLedger'
import { factSheet } from '@/lib/claimMatrix'
import { plainly } from '@/lib/modelErrors'

export const SPINE_MODEL = 'claude-opus-5'

/**
 * The corpus's order of proof, best first (sec. 4).
 *
 * Kept as a ranked list rather than a set of labels because the ranking is the
 * point: it is what lets the office see that a claim resting entirely on tier 6
 * is a claim resting entirely on the client, and that the tier 1 record which
 * would settle it has not been asked for.
 *
 * The corpus is equally clear that the bottom two tiers stay in the record —
 * "preserve client testimony and reasonable inferences, but label them
 * accurately". They are not weaker facts. They are facts that need company.
 */
export const PROOF_TIERS = [
  { rank: 1, key: 'defendant record', means: 'Created by the employer: payroll, timekeeping, schedules, policies, personnel file, texts from management.' },
  { rank: 2, key: 'contemporaneous record', means: 'Made at the time by anyone, for reasons other than this case: bank deposits, photographs, calendars, the client’s own messages.' },
  { rank: 3, key: 'neutral third party', means: 'A person or body with no stake: a co-worker no longer employed there, a government record, a landlord, a doctor.' },
  { rank: 4, key: 'admission', means: 'The employer or its manager saying it. What a supervisor said about the tips is worth more than what the client concluded about them.' },
  { rank: 5, key: 'corroborated testimony', means: 'The client’s account, independently supported by someone or something else.' },
  { rank: 6, key: 'client testimony', means: 'The client’s account alone. The normal state of an intake file, and not a defect — but it is what the other side will attack first.' },
  { rank: 7, key: 'inference', means: 'Derived rather than observed. Labelled as such or it becomes a fact nobody can source.' },
] as const

const ProofTier = z.enum([
  'defendant record',
  'contemporaneous record',
  'neutral third party',
  'admission',
  'corroborated testimony',
  'client testimony',
  'inference',
])
export type ProofTier = z.infer<typeof ProofTier>

const RANK_OF: Record<ProofTier, number> = PROOF_TIERS.reduce(
  (acc, t) => ({ ...acc, [t.key]: t.rank }),
  {} as Record<ProofTier, number>
)

/**
 * The nine anomalies the corpus tells the office to surface (sec. 4).
 *
 * Verbatim from the list, one to one. Each of these is a specific thing that
 * shows up in wage records and means something — a rounded punch is a policy,
 * an automatic deduction is a policy, and identical entries across weeks are
 * not how a human being fills in a timesheet.
 */
export const ANOMALY_KINDS = [
  'missing period',
  'edited record',
  'rounded punches',
  'automatic deduction',
  'identical entries',
  'impossible schedule',
  'rate change',
  'payroll/time mismatch',
  'post-hoc document',
] as const

const AnomalyKind = z.enum(ANOMALY_KINDS)
export type AnomalyKind = z.infer<typeof AnomalyKind>

/**
 * The dates a limitations period could run from.
 *
 * Named in code, and closed, because something later will do arithmetic on
 * them and a free-text label cannot be joined on. Which period attaches to
 * which anchor is a legal question this layer does not answer and must not:
 * it finds the dates and stops.
 */
export const ANCHOR_KINDS = [
  'hired',
  'first violation',
  'last violation',
  'protected activity',
  'adverse action',
  'employment ended',
  'final pay received',
] as const

const AnchorKind = z.enum(ANCHOR_KINDS)
export type AnchorKind = z.infer<typeof AnchorKind>

/**
 * One event, in the corpus's six fields and no others.
 *
 * `source` in the corpus's formulation is carried by `facts`: every fact in
 * the ledger already names the question or document it came from, so pointing
 * at fact ids gives the source and keeps the citation discipline the matrix
 * layer runs on — a reader can follow any event back to the client's words.
 */
const TimelineEvent = z.object({
  /** Stable within this reading, as 'e01'. Other events refer to it. */
  id: z.string(),
  /** The date as the facts state it, in their words: 'March 2024', 'every Friday'. */
  when: z.string(),
  /**
   * The same date normalized for sorting: 'YYYY-MM-DD', 'YYYY-MM', 'YYYY', or
   * empty when the facts genuinely do not place it. Empty is a finding, not a
   * failure — an undated material event is a question to ask.
   */
  sortKey: z.string(),
  /** For a period rather than a point. Same format. Empty for a point event. */
  through: z.string(),
  event: z.string(),
  /**
   * Whether this is a thing that happened once or a way things were.
   *
   * The corpus asks for representative incidents "not just generalized
   * patterns", and the distinction is evidentiary: a pattern is proved by an
   * incident, and a pattern with no incident under it is an assertion.
   */
  kind: z.enum(['incident', 'pattern', 'status change', 'procedural']),
  /** Fact ids from the ledger. Never an id that was not supplied. */
  facts: z.array(z.string()),
  people: z.array(z.string()),
  /** What it bears on, as 'claim-id:element-key'. Nothing else parses. */
  bearsOn: z.array(z.string()),
  whyItMatters: z.string(),
  proofTier: ProofTier,
  /** Set when this event is a date a limitations period could run from. */
  anchor: AnchorKind.nullable(),
})
export type TimelineEvent = z.infer<typeof TimelineEvent>

const Chronology = z.object({
  events: z.array(TimelineEvent),
  /**
   * Which incident proves which pattern, by event id.
   *
   * A separate list, after the events, and not a field on the event itself.
   * The field was tried first and could not work: an incident is written
   * before the pattern it stands for exists, so the model had nothing to point
   * at and wrote the pattern's name instead — eight times out of eight on the
   * first real ledger, every one of them a description that matched no event.
   * Listing the edges once the events are all on the page gives it ids to use.
   */
  evidenceLinks: z.array(
    z.object({
      /** The id of the pattern event. */
      pattern: z.string(),
      /** The id of the concrete incident that evidences it. */
      incident: z.string(),
    })
  ),
  /**
   * Stretches of the employment the facts say nothing about.
   *
   * The first of the corpus's anomalies and the one the chronology is uniquely
   * able to see, so it is produced here rather than in the anomaly pass.
   */
  silences: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      whyItMatters: z.string(),
      whatWouldFillIt: z.string(),
    })
  ),
})

const Anomaly = z.object({
  kind: AnomalyKind,
  what: z.string(),
  facts: z.array(z.string()),
  /** The record that would confirm or dispel it, and who holds it. */
  wouldConfirmIt: z.string(),
})
export type Anomaly = z.infer<typeof Anomaly>

/** Two facts that put the same event at different times. */
const DateConflict = z.object({
  about: z.string(),
  sides: z.array(z.object({ says: z.string(), facts: z.array(z.string()) })),
  whyItMatters: z.string(),
  howToResolve: z.string(),
})
export type DateConflict = z.infer<typeof DateConflict>

const Anomalies = z.object({
  anomalies: z.array(Anomaly),
  dateConflicts: z.array(DateConflict),
})

/**
 * Fact ids, and the sentence about them.
 *
 * Split because the first run put both in one field: asked for "fact ids it
 * would prove", the model returned "Corroboration of the ~120-minute duration
 * she calls a close guess (c:f136, c:f137, c:f163)". The sentence is worth
 * having — it says why those three — but an id buried in prose cannot be
 * followed by anything but a human, and every other layer joins on these.
 */
const Cited = z.object({
  /** Bare ids only. No prose, no parentheses, no commentary. */
  facts: z.array(z.string()),
  /** What those facts are, and why they belong together. */
  note: z.string(),
})
export type Cited = z.infer<typeof Cited>

const SpineRecord = z.object({
  /** What it is, specifically enough to ask for: 'wage statements, Jan 2023 – Mar 2025'. */
  record: z.string(),
  tier: ProofTier,
  /** Whether the office has it. Almost everything in tiers 1 and 2 is a no. */
  inHand: z.boolean(),
  /** What it would prove, confirm or contradict. */
  proves: Cited,
  /** What it bears on, as 'claim-id:element-key'. */
  bearsOn: z.array(z.string()),
  /** Who holds it and how the office gets it. Empty when inHand. */
  howToGetIt: z.string(),
  /** What the case looks like without it. */
  ifMissing: z.string(),
})
export type SpineRecord = z.infer<typeof SpineRecord>

const Spine = z.object({
  /** The two or three facts that make this case make sense. */
  coreStory: z.array(Cited),
  records: z.array(SpineRecord),
  /**
   * Where the case presently rests on the client's word alone.
   *
   * Stated plainly because the corpus requires harmful evidence preserved
   * rather than buried, and "we have no proof of this but her memory" is the
   * most common harmful fact in an intake file.
   */
  restingOnTestimonyAlone: z.array(Cited),
})

export const SpineReading = Chronology.merge(Anomalies).merge(Spine)
export type SpineReading = z.infer<typeof SpineReading>

const SYSTEM = `You build the chronology and evidence spine for a California employment law office,
from a ledger of facts that has already been established. You are not finding new facts and you
are not applying law.

RULES

1. CITE FACTS BY ID, AND ONLY BY ID. A 'facts' field holds bare ids and nothing else — no
   parentheses, no words around them, no explanation inside the list. Where a field has a
   'note' beside it, the explanation goes there. Never cite an id that is not in the list you
   were given. An entry citing no fact is an entry about nothing.

1a. WHAT SOMETHING BEARS ON IS WRITTEN 'claim-id:element-key', copied exactly from the list of
   keys you are given. A bare element key joins to nothing and will be discarded.

2. DO NOT INVENT A DATE. If the facts do not place an event, sortKey is empty and 'when' says
   what the facts actually say. An undated material event is one of the most useful things you
   can report, because it becomes a question. A date you supplied is a date nobody can check.

3. MATERIAL EVENTS ONLY. Not every fact is an event. "She was paid every two weeks" is a
   standing condition; "her hours were cut after she complained" is an event. If a fact does
   not move the case, it does not belong on the timeline.

4. AN INCIDENT IS WORTH MORE THAN A PATTERN. Where the facts give a concrete occurrence that
   evidences a general practice, record the incident and name the pattern it stands for. Where
   there is a pattern and no incident under it, record the pattern and say so — that gap is
   itself the finding.

5. TIER HONESTLY. Most of an intake file is tier 'client testimony'. Do not promote a fact to
   'defendant record' because a record would exist if someone asked for it. The tier describes
   what the office HAS.

6. ANOMALIES COME FROM THE LIST. You are given nine kinds. Report only those, only where facts
   support them, and name the facts. Do not report an anomaly because a case like this usually
   has one.

7. THE SPINE IS SHORT. It is "the small number of facts and records that make the case
   understandable and provable". A list of thirty records is not a spine. Rank by what the
   office does not have and most needs.

8. NOTHING IS BURIED. A conflict, a silence in the timeline, or a claim resting only on the
   client's memory goes in the reading, stated plainly.

You are producing internal work product for a lawyer. Be direct and specific. No hedging, no
reassurance, nothing that reads as advice to a client.`

/**
 * Every key an event or record may point at, spelled the way it must be written.
 *
 * Printed in full rather than as "claim: a, b, c" because the first run, given
 * the shorter form, wrote bare element keys — 'no-thirty-minutes' with no claim
 * in front of it. Two claims can have an element of the same name, and a bare
 * key joins to nothing.
 */
function targets(): string {
  return CLAIMS.map(c => c.elements.map(e => `${c.id}:${e.key}`).join('\n')).join('\n')
}

function preamble(facts: string): string {
  return `=== CLAIMS AND ELEMENTS IN PLAY (use these ids in bearsOn; nothing else) ===

${targets()}

=== FACTS ON FILE ===

${facts}`
}

async function read<T extends z.ZodTypeAny>(
  client: Anthropic,
  what: string,
  shape: T,
  instruction: string,
  facts: string
): Promise<z.infer<T>> {
  let response
  try {
    response = await client.messages
      .stream({
        model: SPINE_MODEL,
        max_tokens: 24000,
        system: SYSTEM,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium', format: zodOutputFormat(shape) },
        messages: [
          {
            role: 'user',
            // The facts first and the instruction second, which reads
            // backwards, for one reason: all three passes run over the same
            // ledger, so the ledger is the only part that can be cached. On a
            // 204-fact file it is 18,600 tokens, and it was being sent three
            // times. Nothing about the content changes.
            content: [
              { type: 'text', text: preamble(facts), cache_control: { type: 'ephemeral' } },
              { type: 'text', text: instruction },
            ],
          },
        ],
      })
      .finalMessage()
  } catch (err) {
    throw plainly(err, `${what} reading`)
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error(`The ${what} reading ran out of room. Run it again.`)
  }
  const parsed = response.parsed_output
  if (!parsed) throw new Error(`The ${what} reading came back unreadable.`)
  return parsed
}

const CHRONOLOGY_TASK = `Build the chronology.

For every material event record, in this order and nothing else: date/time, event, source,
people, issue/element, why it matters.

Then, with every event written and its id fixed, list the evidence links: for each pattern that
a concrete incident evidences, the pattern's event id and the incident's event id. Only ids you
have just written. A pattern no incident proves gets no link — that absence is a finding, and
inventing a link to cover it destroys the finding.

Then the silences — stretches of the employment the facts simply do not cover — and say what
would fill each one.`

const ANOMALY_TASK = `Find the anomalies and the date conflicts.

The nine anomaly kinds are fixed: missing period, edited record, rounded punches, automatic
deduction, identical entries, impossible schedule, rate change, payroll/time mismatch,
post-hoc document. Report only these, only where the facts support them.

Then the date conflicts: places where two facts put the same event at different times. Only
conflicts about WHEN. Disagreements about what happened are found elsewhere and are not your
job here.`

const SPINE_TASK = `Build the evidence spine.

First the core story: the two or three facts, by id, that make this case make sense to someone
reading it cold.

Then the records. Favour defendant-generated records, objective contemporaneous proof, neutral
third-party evidence, admissions, and independently corroborated testimony, in that order. Say
for each whether the office has it, and if not, who holds it and how to get it.

Then, plainly: where does this case presently rest on the client's word and nothing else.`

/**
 * Reads the ledger into a chronology, an anomaly list and a spine.
 *
 * Three calls rather than one. They are independent questions over the same
 * facts, so they run together and cost one call's wall-clock; and asking them
 * separately keeps each answer from being squeezed by the others, which is the
 * failure mode that made the earlier single-pass reading shorten its way into
 * an error (see lib/caseAnalysis.ts).
 */
export async function buildSpine(entries: LedgerEntry[]): Promise<SpineReading> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured, so the spine cannot be built.')
  }
  const facts = factSheet(entries)
  if (!facts.trim()) {
    return {
      events: [], evidenceLinks: [], silences: [], anomalies: [], dateConflicts: [],
      coreStory: [], records: [], restingOnTestimonyAlone: [],
    }
  }

  const client = new Anthropic({ maxRetries: 2 })
  const [chronology, anomalies, spine] = await Promise.all([
    read(client, 'chronology', Chronology, CHRONOLOGY_TASK, facts),
    read(client, 'anomaly', Anomalies, ANOMALY_TASK, facts),
    read(client, 'spine', Spine, SPINE_TASK, facts),
  ])
  return { ...chronology, ...anomalies, ...spine }
}

/**
 * The timeline in order, with the undated events after it.
 *
 * Undated last rather than dropped: they are the events the office cannot yet
 * place, and a reader who does not see them will assume the timeline is whole.
 */
export function chronological(events: TimelineEvent[]): TimelineEvent[] {
  const dated = events.filter(e => e.sortKey.trim())
  const rest = events.filter(e => !e.sortKey.trim())
  dated.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0))
  return [...dated, ...rest]
}

/** Material events the facts do not place on the calendar. Each one is a question. */
export function undated(events: TimelineEvent[]): TimelineEvent[] {
  return events.filter(e => !e.sortKey.trim())
}

/**
 * The dates a limitations period could run from, earliest first.
 *
 * This reports the dates. It does not compute a deadline, because which period
 * attaches to which claim is a legal conclusion and the Code of Civil Procedure
 * is not on file — and a filing deadline stated from memory is the one error in
 * this system that cannot be recovered from.
 *
 * `when` comes along with the normalized date, and that is not decoration. On
 * the first real ledger the reading dated the separation 2026-08-31 and wrote
 * in `when`: "August 31, 2026 per client's stated last day; 8/15/2026 per the
 * final-pay answer". A list that showed only the sortKey would have handed the
 * office one date and hidden the fact that the client gave two.
 */
export function anchors(
  events: TimelineEvent[]
): { kind: AnchorKind; on: string; when: string; event: string; facts: string[] }[] {
  return chronological(events)
    .filter((e): e is TimelineEvent & { anchor: AnchorKind } => e.anchor !== null)
    .map(e => ({ kind: e.anchor, on: e.sortKey || e.when, when: e.when, event: e.event, facts: e.facts }))
}

/**
 * Patterns with no concrete incident under them.
 *
 * The corpus's point, and an evidentiary one rather than a stylistic one: a
 * practice the client describes in general terms is an assertion until one
 * occurrence of it can be put to a witness with a date on it.
 */
export function unevidencedPatterns(
  events: TimelineEvent[],
  links: { pattern: string; incident: string }[]
): TimelineEvent[] {
  const byId = new Map(events.map(e => [e.id, e]))
  const evidenced = new Set(
    links.filter(l => byId.get(l.incident)?.kind === 'incident').map(l => l.pattern)
  )
  return events.filter(e => e.kind === 'pattern' && !evidenced.has(e.id))
}

/** What the office has to go and get, strongest proof first. */
export function toObtain(records: SpineRecord[]): SpineRecord[] {
  return records
    .filter(r => !r.inHand)
    .sort((a, b) => RANK_OF[a.tier] - RANK_OF[b.tier])
}

/** Every key a reading is allowed to point at, as 'claim-id:element-key'. */
function knownTargets(): Set<string> {
  return new Set(CLAIMS.flatMap(c => c.elements.map(e => `${c.id}:${e.key}`)))
}

/**
 * Structural faults in a reading, before anyone relies on it.
 *
 * Run in code rather than trusted to the prompt, because these are the failures
 * that do not look like failures. A reading citing a fact id that is not in the
 * ledger reads exactly like one that cites a real id; a pattern whose incident
 * points at its name instead of its id reads as evidenced. The first run of
 * this layer had both, and neither was visible in the output.
 *
 * Returns problems, not a verdict. A reading with a dangling reference is still
 * worth reading — it is worth reading knowing which line not to rely on.
 */
export function check(reading: SpineReading, entries: LedgerEntry[]): string[] {
  const known = new Set(entries.map(e => e.id))
  const targetKeys = knownTargets()
  const eventIds = new Set(reading.events.map(e => e.id))
  const problems: string[] = []

  const facts = (where: string, ids: string[]) => {
    for (const id of ids) {
      if (!known.has(id)) problems.push(`${where} cites ${JSON.stringify(id)}, which is not a fact in the ledger.`)
    }
  }
  const bears = (where: string, keys: string[]) => {
    for (const k of keys) {
      if (!targetKeys.has(k)) problems.push(`${where} points at ${JSON.stringify(k)}, which is not a claim element.`)
    }
  }

  for (const e of reading.events) {
    facts(`Event ${e.id}`, e.facts)
    bears(`Event ${e.id}`, e.bearsOn)
    if (!e.facts.length) problems.push(`Event ${e.id} rests on no fact.`)
  }
  const byId = new Map(reading.events.map(e => [e.id, e]))
  for (const l of reading.evidenceLinks) {
    if (!eventIds.has(l.pattern)) problems.push(`An evidence link names pattern ${JSON.stringify(l.pattern)}, which is not an event in this reading.`)
    else if (byId.get(l.pattern)!.kind !== 'pattern') problems.push(`Evidence link points at ${l.pattern} as a pattern, but it is recorded as a ${byId.get(l.pattern)!.kind}.`)
    if (!eventIds.has(l.incident)) problems.push(`An evidence link names incident ${JSON.stringify(l.incident)}, which is not an event in this reading.`)
    else if (byId.get(l.incident)!.kind !== 'incident') problems.push(`Evidence link points at ${l.incident} as an incident, but it is recorded as a ${byId.get(l.incident)!.kind}.`)
  }
  for (const a of reading.anomalies) facts(`Anomaly "${a.kind}"`, a.facts)
  for (const c of reading.dateConflicts) for (const side of c.sides) facts(`Conflict "${c.about}"`, side.facts)
  for (const r of reading.records) {
    facts(`Record "${r.record}"`, r.proves.facts)
    bears(`Record "${r.record}"`, r.bearsOn)
  }
  for (const c of reading.coreStory) facts('Core story', c.facts)
  for (const c of reading.restingOnTestimonyAlone) facts('Resting on testimony alone', c.facts)

  // A separation the office cannot date consistently is worth catching in code
  // as well as in the reading, because it sets the final-pay due date and the
  // outer edge of every limitations period.
  const at = (k: AnchorKind) => anchors(reading.events).find(a => a.kind === k)
  const ended = at('employment ended')
  const paid = at('final pay received')
  if (ended?.on && paid?.on && paid.on < ended.on) {
    problems.push(
      `Final pay is dated ${paid.on}, before employment ended on ${ended.on}. Either the separation date is wrong or the last period went unpaid.`
    )
  }
  const hired = at('hired')
  if (hired?.on) {
    for (const a of anchors(reading.events)) {
      if (a.kind !== 'hired' && a.on && a.on < hired.on) {
        problems.push(`The ${a.kind} anchor is dated ${a.on}, before the hire date ${hired.on}.`)
      }
    }
  }
  return problems
}
