/**
 * Which model does which job, in one place, so the dial can be turned without
 * hunting through nine files.
 *
 * The layers do not all want the same thing, and paying Opus prices for work a
 * cheaper model does just as well is money the firm does not get back.
 *
 * MEASURED, on a real 204-fact file with the Opus reading already stored to
 * compare against. Not reasoned about.
 *
 *   WAGE ORDER — Sonnet. Same answer (Order 5), same provision relied on
 *   (section 2(R)(1), which names restaurants), the Labor Commissioner's index
 *   agreeing, in 8 seconds against Opus's 21. It ruled out two rival Orders
 *   where Opus ruled out four, which is thinner but not wrong, and the answer
 *   is cross-checked in code either way.
 *
 *   MATRIX — Opus. Sonnet moved every single element it disagreed on in the
 *   same direction: less supported, less specific. It reported
 *   minimum-wage:hours-uncompensated as needing an authority while Troester
 *   was quoted in full in the same prompt, and it turned final-pay from "gaps
 *   to close" into "blocked" — a different legal conclusion about a real
 *   client. Under-using the quoted authority is the one failure this whole
 *   architecture exists to prevent.
 *
 *   SPINE — Opus. Sonnet was well-formed (check() found nothing) and 60%
 *   thinner: 4 anomalies against 10, 2 date conflicts against 4, 18 events
 *   against 28. Those are the findings the follow-up engine feeds on. It also
 *   took 534 seconds against 116, so it was not cheaper either.
 *
 *   TRANSLATION AND QUESTION DRAFTING — Sonnet, untested. Language work with
 *   the source in front of it, and a person edits the output before it is used.
 *
 *   EXTRACTION AND FOLLOW-UPS — Opus, untested. Everything rests on
 *   extraction, and a fact invented there is uncorrectable later because
 *   nothing further up ever sees the answers again. Follow-up questions go to
 *   a real client's phone, and vet() cannot catch a question that is clear,
 *   clean and leading.
 *
 * Every one is an env var. The way to move another is the way these were
 * moved: run it against a client whose reading is already on file and compare
 * the findings.
 *
 * OPUS 5.5 — every Opus job moved from Opus 5 on 2026-09-25, at the office's
 * request, for the price: $4 / $20 per million tokens against $5 / $25, cache
 * reads $0.20, same tokenizer. Every call here already sets its effort and
 * runs adaptive thinking, so neither 5.5's lower default effort nor its
 * refusal of disabled thinking changes anything. The model is in every
 * stage's stamp and the damages fingerprint, so readings taken on Opus 5 show
 * as stale until they are read again.
 *
 * MEASURED on DAYEON KIM's file, 218 facts, same input for every model:
 *
 *   MATRIX, Opus 5 against 5.5 (claims 1) — all five standings the same, 17
 *   of 20 elements the same. Two of the three that moved went more careful,
 *   not less: 5.5 would not place 1101 Vermont inside the City of Los Angeles
 *   from a mailing address, where Opus 5 had. It wrote 27.2k tokens to Opus
 *   5's 21.7k, so this stage cost about the same; the spine wrote less.
 *
 *   DAMAGES — Opus 5.5. Sonnet 5 stretched the alternating-week tip duty from
 *   July 2025 to the end of employment in August 2026, which no fact says,
 *   and priced about 100 unpaid hours where the file supports about 40. Its
 *   baseline had 12 rows to Opus's 25. Haiku 4.5 wrote a basis outside the
 *   four allowed and the reading stopped at the second stage.
 *
 *   SPINE — back on Opus 5. Read again on Opus 5.5, every one of the four
 *   files came back thin in the way Sonnet did: anomalies 13 -> 4 (AARON OH),
 *   10 -> 2 (DAYEON KIM), 7 -> 4, 5 -> 2; date conflicts and events down by
 *   about half. What AARON OH lost was the unpaid minutes either side of the
 *   shift, the ban on early clock-ins, meal counts that do not reconcile and
 *   a schedule that does not add up — the follow-up engine asks from these.
 *   Three calls a file; Opus 5 costs about $0.20 more a reading.
 *
 *   DRAFTS — Opus 5.5. Sonnet 5 wrote every section at half the price, with
 *   one flagged sentence and a factual summary a quarter over length; usable,
 *   not better. Haiku 4.5 left daily overtime — a claim the reading supports
 *   — out of the trial draft, and ran the factual summary half again over.
 *
 *   FOLLOW-UPS — Opus 5.5. Twenty questions each, same gaps. Haiku 4.5 had 8
 *   of 20 refused by vet() (two legal terms, six too long to read once) and
 *   more that vet() cannot see: questions asking three things at once, one
 *   asking whether she believes it was about her national origin — the legal
 *   conclusion — and her pay rate asked again when she has already said she
 *   does not know it and that it changed (Opus asked for the stubs). It checked
 *   none of the eleven contradictions; Opus checked six, each offering "both
 *   happened". Four of Haiku's questions pointed at "element" rather than a
 *   fact or an element, so their answers would have nowhere to go back to.
 *   Opus: 0 refused. The saving was about $0.25 a round.
 *
 *   PASTED QUESTIONS — Haiku 4.5, the office's choice over Sonnet 5 on
 *   2026-09-25, made with what follows in front of it. A 21-item sheet into Chinese, Xilong Wang's
 *   vehicle, DOT and termination questions. Both translated every question,
 *   kept every gate and dropped nothing. Haiku 4.5 turned the five-part DOT
 *   requirement (CDL, medical card, logs, inspection) into one yes/no, so a
 *   "yes" says nothing about which; folded "what were you told" and "did you
 *   refuse" into one box; offered no "Other" for how he was paid; and wrote
 *   遣送 — the word for deportation — for "sent away", which a reviewer
 *   reading only the English would never see. Sonnet asked the DOT
 *   item as a checklist with "None" and "Not sure". Half the price, a few
 *   cents a paste.
 */

/** The models this codebase knows about. */
export const OPUS = 'claude-opus-5-5'
/** Kept for the spine, which Opus 5.5 reads thin. See above. */
export const OPUS_5 = 'claude-opus-5'
export const SONNET = 'claude-sonnet-5'
export const HAIKU = 'claude-haiku-4-5-20251001'

function pick(envVar: string, fallback: string): string {
  const said = process.env[envVar]?.trim()
  return said || fallback
}

/** Turning a client's answers into atomic facts. Everything rests on it. */
export const EXTRACTION_MODEL = pick('MODEL_EXTRACTION', OPUS)

/** Mapping facts onto claim elements against quoted authority. */
export const MATRIX_MODEL = pick('MODEL_MATRIX', OPUS)

/** The chronology, the anomalies and the evidence spine. */
export const SPINE_MODEL = pick('MODEL_SPINE', OPUS_5)

/** Which IWC Wage Order covers the employer. Cross-checked in code. */
export const CHOICE_MODEL = pick('MODEL_WAGE_ORDER', SONNET)

/** The next questions to put to a client. Read by a person before sending. */
export const FOLLOWUP_MODEL = pick('MODEL_FOLLOWUP', OPUS)

/** The damages reading shown in the Analysis tab. */
export const ANALYSIS_MODEL = pick('MODEL_ANALYSIS', OPUS)

/** Language work with the source text in front of it. */
export const TRANSLATION_MODEL = pick('MODEL_TRANSLATION', SONNET)

/**
 * Drafting questions for an admin to edit before they are used. Haiku, by the
 * office's decision — see PASTED QUESTIONS above for what to read for.
 */
export const QUESTION_MODEL = pick('MODEL_QUESTIONS', HAIKU)

/**
 * Drafting the four template sections that are prose rather than assembly.
 * Opus, untested against another model: a draft is persuasive writing about a
 * real client, every sentence of it is checked in code after, and an attorney
 * rewrites it before anything leaves the office.
 */
export const DRAFT_MODEL = pick('MODEL_DRAFT', OPUS)

/**
 * How hard a call thinks, in the form its model takes.
 *
 * Haiku 4.5 predates adaptive thinking and the effort control: it takes a
 * fixed thinking budget and rejects `effort`. Every other model here takes
 * adaptive thinking and an effort. Only the damages reading, the drafts, the
 * follow-ups and pasted questions use this, because they are the ones
 * compared against Haiku;
 * the matrix and the spine lost findings even on Sonnet and do not run on it.
 */
export function thinkingFor(model: string, effort: 'low' | 'medium' | 'high', maxTokens: number) {
  if (model.startsWith('claude-haiku-4-5')) {
    // A third of the ceiling, so the answer keeps room after the thinking.
    return {
      thinking: { type: 'enabled' as const, budget_tokens: Math.min(6000, Math.floor(maxTokens / 3)) },
      effort: {},
    }
  }
  return { thinking: { type: 'adaptive' as const }, effort: { effort } }
}
