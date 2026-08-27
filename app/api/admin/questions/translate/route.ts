import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { TRANSLATED_LANGS, TranslatedLang } from '@/lib/langs'
import { TranslatableQuestion, translateQuestions } from '@/lib/questionTranslator'

/** Translating a long set takes longer than a normal request. */
export const maxDuration = 60

/**
 * POST /api/admin/questions/translate  { questions, langs? }
 *
 * Drafts translations for questions the firm wrote in English. Saves nothing —
 * the editor merges the result into what it is holding, and the admin still
 * presses save.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  const questions: TranslatableQuestion[] = Array.isArray(body?.questions)
    ? body.questions
        .map((q: Record<string, unknown>) => ({
          id: String(q?.id ?? '').trim(),
          label: String(q?.label ?? '').trim(),
          helpText: typeof q?.helpText === 'string' ? q.helpText.trim() : undefined,
          options: Array.isArray(q?.options) ? q.options.map(String) : undefined,
        }))
        .filter((q: TranslatableQuestion) => q.id && q.label)
    : []

  const langs: TranslatedLang[] = Array.isArray(body?.langs)
    ? TRANSLATED_LANGS.filter(l => body.langs.includes(l))
    : TRANSLATED_LANGS

  if (questions.length === 0) {
    return NextResponse.json({ error: 'Nothing to translate.' }, { status: 400 })
  }

  try {
    return NextResponse.json({ translations: await translateQuestions(questions, langs) })
  } catch (err) {
    console.error('question translation failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not translate those questions.' },
      { status: 502 }
    )
  }
}
