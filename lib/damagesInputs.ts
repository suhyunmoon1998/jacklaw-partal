/**
 * The damages inputs stage: one call that reads the client's answers — and the
 * reading already on file — and sets out the numbers a damages line is built
 * from, each with the client's words behind it. See damagesInputsShape.ts.
 *
 * A FACT stage, deliberately without the law text. Whether a category applies
 * is a legal question and is left to the attorney; this stage reports what the
 * client said about weeks, pay and frequency, and what they did not say. That
 * also keeps it cheap: the law prefix is the biggest thing the other stages
 * send, and a stage that must not use it should not pay for it.
 *
 * It runs after the findings so its numbers agree with the reading the office
 * already has, and it is told to report — not resolve — where the answers
 * disagree with each other.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { plainly } from '@/lib/modelErrors'
import { ANALYSIS_MODEL, thinkingFor } from '@/lib/models'
import { AnalysisInput, Issue, StoredAnalysis } from '@/lib/caseAnalysisShape'
import { buildTranscript, MIN_ANSWERS, NotEnoughAnswers } from '@/lib/caseAnalysis'
import { DamagesInputs, INPUT_KEYS, INPUT_LABEL, vetDamagesInputs } from '@/lib/damagesInputsShape'

export const INPUTS_SYSTEM = `You set out the damages INPUTS for one wage-and-hour client of a
plaintiff-side California employment office. Your reader is a lawyer at the firm.

You are not analysing the law and you must not state what the law provides. You report what
the client's answers establish about a small set of numbers, so the office can multiply them
out. The reading already on file is given to you so your numbers agree with it.

THE RULES YOU WILL BE JUDGED ON:

1. NEVER INVENT A NUMBER. If the answers do not establish an input, its value is null, "missing"
   says what is missing, and "question" is the one plain question to the client that would settle
   it. A null with a good question is worth more than a plausible guess.

2. QUOTE THE CLIENT. Every value carries support: where the answer is, the question, and the
   client's own words exactly as written, in whatever language, with an English gloss in brackets
   if it is not English. A value nobody can find in the answers will be shown as an unsupported AI
   proposal.

3. SHOW DISAGREEMENT, DO NOT HIDE IT. Where answers support different values — the questionnaire
   says 3 a week, a later follow-up says 4 to 5 — give the value you use, list the others under
   alternatives with their own support, and say in chosenBecause why (for example: the more
   conservative supported figure, or the later answer that corrects the earlier one). Later
   follow-up answers are the client's current account.

4. CONFIDENCE is about the factual input only, never the legal outcome:
   HIGH   — supported by records on file and consistent answers;
   MEDIUM — supported mainly by the client's estimate, or partly corroborated;
   LOW    — ambiguous, inconsistent or incomplete.
   standing is one of: Client estimate, Client statement, Document-confirmed, AI proposed,
   Contested, Missing information.

5. ARITHMETIC ONLY FROM WHAT THEY SAID. "weeks" is the employment period counted in weeks from
   the dates the client gave (say how in period.how). A frequency the client gave per day or per
   month may be converted to per week, saying so in basis. Do not supply a multiplier, a day
   length or a rate the client did not state; where the reading on file uses one, you may give it
   with standing "AI proposed", confidence LOW, and a question that would confirm it.

6. APPLICABILITY IS NOT YOURS TO DECIDE. For waiting-time penalties, wage statements and
   liquidated damages, give status "Potentially applicable — attorney review required" or "Not
   raised by the answers", and one sentence of the facts that raise it. Emotional distress,
   punitive damages, future wage loss and similar go in attorneyValuation, with no number.

7. QUESTIONS are plain words a client understands, one fact each, and never repeat something the
   client already answered. No legal terms.

The client may have answered in Spanish, Chinese or Korean. Read those answers directly; write
everything except the quotes in English.`

const issueLine = (i: Issue) =>
  `[${i.category}] ${i.headline}\n  math: ${i.math || '(none)'}\n  estimate: ${i.estimate} (${i.basis})\n  confirm: ${i.confirm.join('; ') || '(none)'}`

export async function runDamagesInputs(input: AnalysisInput, stored: StoredAnalysis) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured, so the damages inputs cannot be read.')
  }
  if (!stored.overview || !stored.findings) throw new Error('The reading has not been run yet. Start again.')
  const { text, answered } = buildTranscript(input)
  if (answered < MIN_ANSWERS) {
    throw new NotEnoughAnswers(`${input.clientName} has answered ${answered} questions; there is not enough on file yet.`)
  }

  const baseline = stored.overview.baseline.map(b => `- ${b.label}: ${b.value} (${b.basis})`).join('\n')
  const user = `CLIENT: ${input.clientName}
CASE: ${input.caseName || '(not recorded)'}
DOCUMENTS ON FILE (titles only): ${input.documents.length ? input.documents.join(', ') : 'none'}

THE INPUTS TO SET OUT, one entry each, using exactly these keys:
${INPUT_KEYS.map(k => `- ${k}: ${INPUT_LABEL[k]}`).join('\n')}

=== THE READING ON FILE: BASELINE ===
${baseline}

=== THE READING ON FILE: DAMAGES CATEGORIES ===
${stored.findings.issues.map(issueLine).join('\n\n') || '(none raised)'}

=== THE CLIENT'S ANSWERS ===

${text}`

  const client = new Anthropic({ maxRetries: 2 })
  const maxTokens = 16000
  let response
  try {
    response = await client.messages
      .stream({
        model: ANALYSIS_MODEL,
        max_tokens: maxTokens,
        system: INPUTS_SYSTEM,
        thinking: thinkingFor(ANALYSIS_MODEL, 'medium', maxTokens).thinking,
        output_config: { ...thinkingFor(ANALYSIS_MODEL, 'medium', maxTokens).effort, format: zodOutputFormat(DamagesInputs) },
        messages: [{ role: 'user', content: user }],
      })
      .finalMessage()
  } catch (err) {
    throw plainly(err, 'damages inputs')
  }
  if (response.stop_reason === 'max_tokens') throw new Error('The damages inputs ran out of room before they finished. Run them again.')
  if (response.stop_reason === 'refusal') throw new Error('The damages inputs reading was declined. Read the answers directly.')
  const parsed = response.parsed_output
  if (!parsed) throw new Error('The damages inputs came back in a form we could not read.')
  return vetDamagesInputs(parsed)
}
