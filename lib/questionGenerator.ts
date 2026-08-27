/**
 * Turns text an admin pasted in — a list of questions from an email, a Word
 * document, a discovery request — into questions the portal can render.
 *
 * The hard part is not splitting lines. It is deciding what KIND of question
 * each one is and, for the multiple-choice ones, what the choices should be:
 * "Were you paid overtime?" is a yes/no, "Which of these do you still have?"
 * needs a checklist, and "How much are you owed?" is a currency field. A
 * paragraph of prose may hold three questions with no punctuation to split on.
 * That judgement is what the model is here for.
 *
 * Nothing generated here reaches a client on its own. The admin reviews and
 * edits every question, then presses send — the same rule the question-set
 * editor's draft-translation button follows.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { Lang, LANG_ENGLISH_NAME, TranslatedLang } from '@/lib/langs'
import { Question, QuestionType } from '@/types'

/**
 * Long enough for a full discovery request, short enough to stay inside the
 * serverless function's time limit. Longer pastes are rejected with a message
 * telling the admin to send it in parts, rather than silently losing the tail.
 */
export const MAX_INPUT_CHARS = 12_000

/** More than a client will answer in one sitting, and a guard on runaway output. */
const MAX_QUESTIONS = 40

const QUESTION_TYPES = [
  'text', 'textarea', 'yes_no', 'yes_no_unsure',
  'select', 'multiselect', 'date', 'phone', 'number', 'currency',
] as const

/**
 * Every field is required and "none" is an empty string or list.
 *
 * Structured output is strict, and optional fields are where these schemas go
 * wrong — a model that may omit a key will omit it inconsistently. Empties are
 * stripped when the result is converted to a Question.
 */
const GeneratedQuestion = z.object({
  label: z.string(),
  type: z.enum(QUESTION_TYPES),
  required: z.boolean(),
  /** Empty unless the type is select or multiselect. */
  options: z.array(z.string()),
  /** Empty when the question needs no explanation. */
  helpText: z.string(),
  /** Empty except on free-text questions where an example helps. */
  placeholder: z.string(),
  /**
   * 1-based position of the question that gates this one, or 0 for none, with
   * the answer that reveals it. A position rather than an id because the model
   * does not know the ids — they are derived from the labels afterwards.
   */
  showIfQuestionNumber: z.number().int(),
  showIfAnswer: z.string(),
  /** All empty when the client reads English. */
  translatedLabel: z.string(),
  translatedHelpText: z.string(),
  translatedOptions: z.array(z.string()),
})

const GeneratedSet = z.object({
  /** A short name for this batch, as the firm's staff would say it. */
  setName: z.string(),
  questions: z.array(GeneratedQuestion),
})

export interface GeneratedResult {
  setName: string
  questions: Question[]
  /** The language the translations were drafted in, or null if English only. */
  translatedInto: Lang | null
}

/**
 * How each language is described to the model.
 *
 * The picker's own label is not enough: "中文" leaves the variety open and comes
 * back in Traditional, which is not what the rest of the portal is written in.
 * These match the register the translated questionnaires already use, so a
 * generated question reads like the ones beside it.
 */
export const TARGET_DESCRIPTION: Record<TranslatedLang, string> = {
  es: 'Latin American Spanish, addressing the client as "usted"',
  zh: 'Simplified Chinese (简体中文) as written in mainland China — never Traditional characters',
  ko: 'Korean, in formal 존댓말 as a law office would address a client',
}

function systemPrompt(target: Lang): string {
  const translating = target !== 'en'
  const targetName =
    target === 'en' ? 'English' : TARGET_DESCRIPTION[target as TranslatedLang]

  return `You convert text a law firm's staff pasted in into questions for a client questionnaire.

The firm is a California employment law practice. Their clients are workers — often
people who have never dealt with a lawyer, and who may be reading in their second
language. The questions they receive have to be answerable by someone recalling their
own job, not by someone who knows employment law.

## What you are given

Whatever the staff pasted: a numbered list, an email, a page from a Word document, a
discovery request, or loose prose. It may be messy — inconsistent numbering, headers,
page numbers, stray formatting. It may hold several questions in one paragraph.

## What to produce

One entry per question actually present in the text. Rules:

- **Do not invent questions.** Every entry must come from the source. If the text holds
  three questions, produce three. Drop headers, instructions to staff, page numbers and
  boilerplate — they are not questions.
- **Split compound questions.** "What was your rate of pay and how often were you paid?"
  is two questions, because it has two answers.
- **Rewrite legalese into plain speech**, keeping the meaning exactly. "State whether you
  were provided a duty-free meal period" becomes "Were you given a meal break where you
  were free to leave and do what you wanted?" Do not soften or broaden what is being asked.
- Keep each label under about 200 characters. Put anything longer, or any example, in
  helpText.

## Choosing the type

- \`yes_no\` — the answer is yes or no. Prefer this over a two-option select.
- \`yes_no_unsure\` — yes or no, but a client genuinely may not know (what a manager
  intended, what a policy said, whether something was recorded).
- \`select\` — one answer from a known, short list.
- \`multiselect\` — several may apply. Anything phrased "select all that apply", "which of
  the following", or asking what someone has or experienced.
- \`date\` — a single calendar date. Use \`text\` instead when only an approximate date is
  realistic ("around March 2022").
- \`currency\` — an amount of money. \`number\` — a plain count.
- \`phone\` — a phone number.
- \`textarea\` — a description, an explanation, a list of names, anything more than a line.
- \`text\` — a short one-line answer.

## Writing the options

For \`select\` and \`multiselect\` only. These are what the client picks, so:

- Cover the realistic answers, in a sensible order. 3 to 12 options.
- If the source text lists choices (a) b) c), 1. 2. 3., bullets), use those — cleaned up,
  not reworded.
- If it does not, write the options yourself from what the question asks.
- Make them mutually exclusive for \`select\`. They may overlap for \`multiselect\`.
- Always leave the client a way out: end with "Other", "None of these", or "Not sure" —
  whichever fits. A client who cannot answer honestly will guess, and a guess is worse
  than nothing in a case file.
- Never use options on \`yes_no\`, \`yes_no_unsure\`, or any free-text type. Leave the list
  empty there.

## Follow-up questions

A question that only makes sense after a particular answer must say so, or every
client answers it — including the ones it does not apply to. "Who told you?" after
"Did anyone tell you?" is the usual shape, and so is anything beginning "If not" or
"If so".

Set \`showIfQuestionNumber\` to the 1-based position of the question it depends on, and
\`showIfAnswer\` to the answer that reveals it:

- after a \`yes_no\` question: \`"yes"\` or \`"no"\`
- after a \`yes_no_unsure\` question: \`"yes"\`, \`"no"\` or \`"not_sure"\`
- after a \`select\` question: one of that question's options, spelled exactly as written

Rules: the gate must come EARLIER in your list than the question it gates, and it can
never be a \`multiselect\` or a free-text question. Use \`0\` for every question that
stands on its own — most of them. Do not chain more than one level; gate the follow-up
on the original yes/no, not on another follow-up.

Once a question is gated, drop the "If so" or "If not" from its label — the client only
sees it when it applies. "If not, list the days you missed" becomes "List the days you
missed".

## required

Mark \`true\` only where the firm cannot proceed without it. Most questions are \`false\`.
A client blocked by a required question they cannot answer will abandon the form.

## helpText and placeholder

- \`helpText\` — one sentence, only where the question would otherwise be misread, or where
  an example genuinely helps. Empty otherwise. Do not restate the label.
- \`placeholder\` — an example answer for free-text questions. Empty on everything else.

${translating ? `## Translation

This client reads the portal in ${targetName}. Fill \`translatedLabel\`,
\`translatedHelpText\` and \`translatedOptions\` with ${targetName}.

- Translate meaning, not words. Match the register the client would expect from a law
  office: polite, plain, addressed directly to them.
- \`translatedOptions\` must have exactly as many entries as \`options\`, in the same order —
  they are matched by position, and a list of the wrong length is discarded.
- Leave a translated field empty when its English counterpart is empty.
- Keep names, company names, and legal form numbers (W-2, 1099) as they are.` : `## Translation

This client reads English. Leave \`translatedLabel\`, \`translatedHelpText\` and
\`translatedOptions\` empty.`}

## setName

A short staff-facing name for this batch — what the firm would call it on a list, like
"Overtime Follow-Up" or "Meal Break Details". English, under 50 characters.

Produce at most ${MAX_QUESTIONS} questions. If the text holds more, take the first ${MAX_QUESTIONS} in order.`
}

/** Answers are filed under this, so it has to be stable and readable. */
function slugFor(label: string, index: number): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  return `${base || 'q'}_${index + 1}`
}

const NEEDS_OPTIONS: QuestionType[] = ['select', 'multiselect']

type RawQuestion = z.infer<typeof GeneratedQuestion>

/**
 * The model's output as questions the portal can render.
 *
 * Split out from the request so it can be exercised on its own: this is where
 * a choice question with one choice, or a translation whose option list does
 * not line up, has to be caught rather than shipped to a client.
 */
export function toQuestions(raw: RawQuestion[], target: Lang): Question[] {
  const kept = raw.slice(0, MAX_QUESTIONS)

  // Ids are derived from labels, so every id has to exist before any gate can
  // point at one. Positions the model gave are 1-based over this same list.
  const idAt = new Map<number, { id: string; type: QuestionType }>()
  kept.forEach((item, i) => {
    const label = item.label.trim()
    if (label) idAt.set(i + 1, { id: slugFor(label, i), type: item.type })
  })

  const questions: Question[] = []

  kept.forEach((item, i) => {
    const label = item.label.trim()
    if (!label) return

    const wantsOptions = NEEDS_OPTIONS.includes(item.type)
    const options = wantsOptions ? item.options.map(o => o.trim()).filter(Boolean) : []

    // A choice question with nothing to choose from cannot be answered, so it
    // falls back to free text rather than rendering an empty control.
    const type: QuestionType = wantsOptions && options.length < 2 ? 'text' : item.type
    const keepsOptions = NEEDS_OPTIONS.includes(type)

    const question: Question = { id: slugFor(label, i), label, type }
    if (item.required) question.required = true
    if (keepsOptions && options.length > 0) question.options = options
    if (item.helpText.trim()) question.helpText = item.helpText.trim()
    if (item.placeholder.trim() && !keepsOptions) question.placeholder = item.placeholder.trim()

    // A gate is kept only if it points backwards at a question that can
    // actually equal a single value. normalizeQuestions re-checks all of this;
    // doing it here too keeps the review screen honest about what will ship.
    const gateAt = item.showIfQuestionNumber
    const gate = gateAt > 0 && gateAt < i + 1 ? idAt.get(gateAt) : undefined
    const answer = item.showIfAnswer.trim()
    if (gate && answer && gate.type !== 'multiselect') {
      question.showIf = { questionId: gate.id, value: answer }
    }

    if (target !== 'en') {
      const t: NonNullable<Question['es']> = {}
      if (item.translatedLabel.trim()) t.label = item.translatedLabel.trim()
      if (item.translatedHelpText.trim() && question.helpText) {
        t.helpText = item.translatedHelpText.trim()
      }
      // Matched to the English by position, so a list of the wrong length is
      // dropped rather than pairing the wrong label with the wrong answer.
      const translated = item.translatedOptions.map(o => o.trim()).filter(Boolean)
      if (question.options && translated.length === question.options.length) {
        t.options = translated
      }
      if (Object.keys(t).length > 0) question[target as TranslatedLang] = t
    }

    questions.push(question)
  })

  return questions
}

export async function generateQuestions(
  text: string,
  target: Lang
): Promise<GeneratedResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured, so questions cannot be generated from pasted text.'
    )
  }

  const source = text.trim()
  if (!source) throw new Error('Paste the questions first.')
  if (source.length > MAX_INPUT_CHARS) {
    throw new Error(
      `That is ${source.length.toLocaleString()} characters. Send up to ${MAX_INPUT_CHARS.toLocaleString()} at a time so the questions come back before the request times out.`
    )
  }

  const client = new Anthropic()

  const response = await client.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 16000,
    system: systemPrompt(target),
    thinking: { type: 'adaptive' },
    // Extraction and classification rather than deep reasoning, and a person is
    // waiting on the result — 'medium' keeps this inside the function's time
    // limit. Raise it if the questions come back too literal.
    output_config: { effort: 'medium', format: zodOutputFormat(GeneratedSet) },
    messages: [{ role: 'user', content: source }],
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('The generator declined to process that text. Paste it again, or build the questions by hand.')
  }

  const parsed = response.parsed_output
  if (!parsed) {
    throw new Error('The questions came back in a form we could not read. Try again.')
  }

  const questions = toQuestions(parsed.questions, target)

  if (questions.length === 0) {
    throw new Error('No questions were found in that text. Check that you pasted the questions themselves.')
  }

  return {
    setName: parsed.setName.trim().slice(0, 60) || 'Additional Questions',
    questions,
    translatedInto: target === 'en' ? null : target,
  }
}

/** How the admin panel names the language it drafted translations in. */
export function translationLabel(lang: Lang): string {
  return LANG_ENGLISH_NAME[lang]
}
