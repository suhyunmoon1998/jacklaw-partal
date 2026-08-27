/**
 * Translates questions an admin wrote in English into the languages clients
 * read the portal in.
 *
 * Separate from the generator because the job is different: nothing is being
 * invented here. The English question already exists, was written or approved
 * by the firm, and must come back meaning exactly the same thing — a translated
 * question that quietly broadens what is being asked would put words in a
 * client's mouth in a case file.
 *
 * Only fields the caller asks for are filled. A translation staff have already
 * corrected is never sent here to be overwritten.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { TranslatedLang } from '@/lib/langs'
import { TARGET_DESCRIPTION } from '@/lib/questionGenerator'
import { QuestionTranslation } from '@/types'

/** One question as it arrives — only the parts a client reads. */
export interface TranslatableQuestion {
  id: string
  label: string
  helpText?: string
  options?: string[]
}

export type TranslationsById = Record<string, Partial<Record<TranslatedLang, QuestionTranslation>>>

/** Enough for a long question set; beyond this the request is split by caller. */
const MAX_QUESTIONS = 60

const PerLanguage = z.object({
  label: z.string(),
  /** Empty when the English has no help text. */
  helpText: z.string(),
  /** Empty unless the English question has options; otherwise same length, same order. */
  options: z.array(z.string()),
})

function schemaFor(langs: TranslatedLang[]) {
  const shape: Record<string, typeof PerLanguage> = {}
  for (const lang of langs) shape[lang] = PerLanguage
  return z.object({
    questions: z.array(z.object({ id: z.string(), ...shape })),
  })
}

function systemPrompt(langs: TranslatedLang[]): string {
  const list = langs.map(l => `- **${l}** — ${TARGET_DESCRIPTION[l]}`).join('\n')

  return `You translate questionnaire questions for a California employment law firm.

The questions are asked of workers — often people who have never dealt with a lawyer,
and who are reading in the language they are most comfortable in. They were written or
approved by the firm in English, and their answers go into a case file.

## Languages

${list}

## Rules

- **Translate meaning, not words.** The translated question must ask for exactly what the
  English asks for — no broader, no narrower. A client's answer is evidence; a question
  that drifted is a wrong answer waiting to happen.
- **Match the register**: polite, plain, addressed directly to the client, the way a law
  office writes to someone it represents. Not bureaucratic, not casual.
- **Keep it answerable.** If the English uses a legal term the client would recognise,
  keep it. If it uses one they would not, use the everyday phrasing in the target
  language rather than a literal rendering.
- **\`options\` must have exactly as many entries as the English, in the same order.** They
  are matched by position; a list of a different length is discarded and the client sees
  English instead. If the English question has no options, return an empty list.
- **\`helpText\`** — translate it if the English has one, otherwise return an empty string.
- Leave names, company names and legal form numbers (W-2, 1099, DLSE, EEOC) as they are.
- Return one entry per question you were given, with the same \`id\`, in the same order.`
}

/**
 * Translations for each question, keyed by id then language.
 *
 * Returns {} rather than throwing when the model is unreachable: a missing
 * translation falls back to English, which is worse than a good translation but
 * better than a save that fails.
 */
export async function translateQuestions(
  questions: TranslatableQuestion[],
  langs: TranslatedLang[]
): Promise<TranslationsById> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured, so questions cannot be translated.')
  }
  if (questions.length === 0 || langs.length === 0) return {}

  const batch = questions.slice(0, MAX_QUESTIONS)
  const client = new Anthropic()

  const response = await client.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 16000,
    system: systemPrompt(langs),
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: zodOutputFormat(schemaFor(langs)) },
    messages: [
      {
        role: 'user',
        content: JSON.stringify(
          batch.map(q => ({
            id: q.id,
            label: q.label,
            helpText: q.helpText ?? '',
            options: q.options ?? [],
          })),
          null,
          2
        ),
      },
    ],
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('The translator declined to process those questions.')
  }
  const parsed = response.parsed_output
  if (!parsed) throw new Error('The translations came back in a form we could not read.')

  const byId = new Map(batch.map(q => [q.id, q]))
  const out: TranslationsById = {}

  for (const row of parsed.questions) {
    const source = byId.get(row.id)
    if (!source) continue

    for (const lang of langs) {
      const raw = (row as unknown as Record<string, z.infer<typeof PerLanguage>>)[lang]
      if (!raw) continue

      const t: QuestionTranslation = {}
      if (raw.label.trim()) t.label = raw.label.trim()
      if (source.helpText && raw.helpText.trim()) t.helpText = raw.helpText.trim()

      // Matched to the English by position, so a list of the wrong length is
      // dropped rather than pairing the wrong label with the wrong answer.
      const options = raw.options.map(o => o.trim()).filter(Boolean)
      if (source.options?.length && options.length === source.options.length) {
        t.options = options
      }

      if (Object.keys(t).length > 0) {
        ;(out[row.id] ??= {})[lang] = t
      }
    }
  }

  return out
}
