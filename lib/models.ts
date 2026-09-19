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
 */

/** The models this codebase knows about. */
export const OPUS = 'claude-opus-5'
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
export const SPINE_MODEL = pick('MODEL_SPINE', OPUS)

/** Which IWC Wage Order covers the employer. Cross-checked in code. */
export const CHOICE_MODEL = pick('MODEL_WAGE_ORDER', SONNET)

/** The next questions to put to a client. Read by a person before sending. */
export const FOLLOWUP_MODEL = pick('MODEL_FOLLOWUP', OPUS)

/** The damages reading shown in the Analysis tab. */
export const ANALYSIS_MODEL = pick('MODEL_ANALYSIS', OPUS)

/** Language work with the source text in front of it. */
export const TRANSLATION_MODEL = pick('MODEL_TRANSLATION', SONNET)

/** Drafting questions for an admin to edit before they are used. */
export const QUESTION_MODEL = pick('MODEL_QUESTIONS', SONNET)
