/**
 * Which language a client wrote in, and their answers as plain strings.
 *
 * This file used to send answers to MyMemory's free, anonymous translation
 * endpoint. That is gone: the office's English now comes from
 * lib/staffTranslation.ts, through lib/translationCache.ts. What is left sends
 * nothing anywhere, which is why the admin panel can import it in the browser.
 */

import { TranslatedLang } from '@/lib/langs'
import { AnswerValue } from '@/types'

const HANGUL = /[가-힣]/
const HAN = /[㐀-䶿一-鿿]/

/** The characters that essentially never appear in an English answer. */
const SPANISH_MARK = /[áéíóúñ¿¡]/i

/**
 * Latin script and the punctuation the portal's own languages use — which is
 * also, not by coincidence, exactly what the answers PDF's fonts can draw.
 * Writing outside it (Chinese, Korean, Vietnamese, Russian, …) is writing a
 * reader of English cannot read as it stands.
 */
export const LATIN_ONLY = /^[\t\n\r -~ -ſ–—‘’“”•…€]*$/

/**
 * Words that are Spanish and essentially never English.
 *
 * A phone keyboard drops the accents, so "No me pagaron las horas extra" —
 * a client's whole complaint — carries none of the marks above. It still
 * carries "pagaron" and "horas". Words English shares are left out ("no",
 * "me", "a", "son", "once", "solo", "mayo", "patron"), so an English answer
 * cannot collect them.
 */
const SPANISH_WORDS = new Set([
  'que', 'qué', 'por', 'para', 'pero', 'porque', 'como', 'cómo', 'cuando', 'cuándo', 'donde', 'dónde',
  'muy', 'mas', 'más', 'nunca', 'siempre', 'tambien', 'también', 'entonces', 'despues', 'después',
  'antes', 'ahora', 'ayer', 'hoy', 'manana', 'mañana', 'bien', 'mal', 'ya', 'mientras', 'sobre',
  'hasta', 'desde', 'entre', 'contra', 'durante', 'pues', 'sin', 'con', 'una', 'uno', 'unos', 'unas',
  'ningun', 'ningún', 'ninguna', 'ninguno', 'nada', 'algo', 'todo', 'todos', 'toda', 'todas', 'cada',
  'otro', 'otra', 'otros', 'otras', 'mucho', 'mucha', 'muchos', 'muchas', 'poco', 'poca',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'eso', 'esos', 'esas', 'aqui', 'aquí', 'alli', 'allí',
  'hay', 'habia', 'había', 'yo', 'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'te', 'nos', 'les', 'usted',
  'ustedes', 'ella', 'ellos', 'ellas', 'nosotros', 'es', 'era', 'eran', 'fue', 'fueron', 'fui', 'soy',
  'estoy', 'estaba', 'estaban', 'estamos', 'esta', 'está', 'estan', 'están', 'tengo', 'tenia', 'tenía',
  'tenian', 'tenían', 'tiene', 'tienen', 'hacer', 'hago', 'hace', 'hizo', 'hicieron', 'dijo', 'dijeron',
  'decia', 'decía', 'puedo', 'podia', 'podía', 'puede', 'pueden', 'quiero', 'queria', 'quería', 'voy',
  'trabajo', 'trabajos', 'trabaje', 'trabajé', 'trabajaba', 'trabajaban', 'trabajar', 'trabajamos',
  'trabajando', 'trabajador', 'trabajadores', 'pago', 'pagó', 'pagaron', 'pagaba', 'pagaban', 'pagar',
  'pagan', 'sueldo', 'salario', 'cheque', 'dinero', 'jefe', 'jefa', 'patrón', 'gerente', 'dueno', 'dueño',
  'empresa', 'compania', 'compañía', 'despidieron', 'despidio', 'despidió', 'despido', 'descanso',
  'descansos', 'comida', 'almuerzo', 'lonche', 'turno', 'turnos', 'tiempo', 'hora', 'horas', 'minutos',
  'dia', 'día', 'dias', 'días', 'semana', 'semanas', 'mes', 'meses', 'ano', 'año', 'anos', 'años',
  'lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes', 'sabado', 'sábado', 'domingo',
  'enero', 'febrero', 'marzo', 'abril', 'junio', 'julio', 'agosto', 'septiembre', 'setiembre',
  'octubre', 'noviembre', 'diciembre', 'cocina', 'cocinero', 'limpieza', 'ultimo', 'último', 'dieron',
])

/**
 * Spanish's little linking words. They count only beside a word above: on
 * their own they are also how Los Angeles, El Monte and an address on Calle de
 * la Paz read, and an English answer naming a place is still English.
 */
const SPANISH_LINKS = new Set(['de', 'la', 'el', 'los', 'las', 'del', 'al', 'en', 'y', 'un', 'lo', 'le', 'se'])

/** English's little words, counted every time they appear. */
const ENGLISH_WORDS = new Set([
  'the', 'and', 'i', 'my', 'was', 'were', 'is', 'are', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'he',
  'she', 'they', 'we', 'it', 'that', 'this', 'did', 'didn', 'not', 'but', 'have', 'had', 'has', 'would',
  'could', 'from', 'by', 'an', 'be', 'been', 'our', 'their', 'his', 'her', 'you', 'your', 'when', 'what',
  'there', 'so', 'if', 'or', 'as', 'about', 'after', 'before', 'because', 'him', 'them', 'us', 'do',
  'does', 'don', 'will', 'can', 'all', 'any', 'should', 'just', 'only', 'then', 'than', 'who', 'which',
  'where', 'why', 'how', 'get', 'got', 'its', 'also', 'wasn', 'weren', 'isn', 'couldn', 'wouldn',
  'shouldn', 'hadn', 'haven', 'doesn',
])

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-záéíóúüñ]+/g) ?? []
}

/**
 * Whether a piece of Latin-script writing reads as Spanish.
 *
 * Its marks (á, ñ, ¿ …) or one of its own words is the way in; then Spanish
 * must outweigh English. That keeps "Mi jefe no me pagó" and "trabajaba 10
 * horas al dia sin descanso" Spanish, and "My supervisor José yelled at me"
 * and "I worked at the Los Angeles store" English.
 */
export function readsAsSpanish(text: string): boolean {
  const all = words(text)
  const own = new Set(all.filter(w => SPANISH_WORDS.has(w))).size
  const marked = SPANISH_MARK.test(text)
  if (!marked && own === 0) return false
  const links = new Set(all.filter(w => SPANISH_LINKS.has(w))).size
  const english = all.filter(w => ENGLISH_WORDS.has(w)).length
  const spanish = own + links + (marked ? 2 : 0)
  return spanish >= 2 && spanish > english
}

/** Whether a piece of writing reads as English: two of its little words, and not Spanish. */
export function readsAsEnglish(text: string): boolean {
  if (HANGUL.test(text) || HAN.test(text) || readsAsSpanish(text)) return false
  return words(text).filter(w => ENGLISH_WORDS.has(w)).length >= 2
}

/**
 * Which language a piece of a client's writing is in, or null for English.
 *
 * Hangul and Han are decided by script, which is unambiguous. Spanish shares
 * the Latin alphabet with English, so it is read from its marks and its words
 * (readsAsSpanish). Accents alone used to decide it, and an answer typed on a
 * phone without them reached the office untranslated.
 */
export function detectLanguage(text: string): TranslatedLang | null {
  // Korean first: Korean writing mixes in Han characters, but Chinese never
  // contains Hangul, so testing for Hangul first cannot misread either one.
  if (HANGUL.test(text)) return 'ko'
  if (HAN.test(text)) return 'zh'
  if (readsAsSpanish(text)) return 'es'
  return null
}

/** Yes/no answers are stored as these literals, never as the client's words. */
const STORED_LITERALS = new Set(['yes', 'no', 'not_sure'])

/** Whether a stored answer is something the client typed, rather than a literal. */
export function isTypedText(text: string): boolean {
  const t = text.trim()
  return t !== '' && !STORED_LITERALS.has(t) && /\p{L}/u.test(t)
}

/** One stored answer as a single string, the way the admin panel shows it. */
export function answerText(value: AnswerValue | undefined): string {
  if (value === undefined || value === null) return ''
  return Array.isArray(value) ? value.join(', ') : String(value)
}

/**
 * The language a client filled a questionnaire out in, or null if it reads as
 * English.
 *
 * Any Chinese or Korean answer counts: a reader of English cannot read it at
 * all. Spanish must win against the answers that read as English, so one
 * accented name in an otherwise English form does not label the whole
 * submission Spanish — the comment always said so, and the count did not.
 */
export function submissionLanguage(
  answers: Record<string, AnswerValue>
): TranslatedLang | null {
  const tally: Partial<Record<TranslatedLang, number>> = {}
  let english = 0
  for (const value of Object.values(answers)) {
    const text = answerText(value)
    if (STORED_LITERALS.has(text)) continue
    const lang = detectLanguage(text)
    if (lang) tally[lang] = (tally[lang] ?? 0) + 1
    else if (readsAsEnglish(text)) english++
  }

  let best: TranslatedLang | null = null
  for (const [lang, count] of Object.entries(tally) as [TranslatedLang, number][]) {
    if (!best || count > (tally[best] ?? 0)) best = lang
  }
  if (best === 'es' && (tally.es ?? 0) <= english) return null
  return best
}

/**
 * The language to read a client's writing as, for the office.
 *
 * What their answers read as; or, for a client who reads the portal in
 * Spanish and typed anything at all, Spanish — "Septiembre 2024" and
 * "Cajero" have no accent and no second word to tell by. Spanish sent this way
 * goes to Google without a language (lib/googleTranslate.ts), so an answer
 * that was English after all comes back as it went.
 */
export function answersLanguage(
  answers: Record<string, AnswerValue>,
  portalLang?: string | null
): TranslatedLang | null {
  const detected = submissionLanguage(answers)
  if (detected) return detected
  if (portalLang !== 'es') return null
  return Object.values(answers).some(v => isTypedText(answerText(v))) ? 'es' : null
}

/**
 * Runs `task` over every item, at most `limit` at a time.
 *
 * Kept for callers that fan work out over many answers without firing them
 * all at once.
 */
export async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await task(items[i], i)
      }
    })
  )
  return out
}
