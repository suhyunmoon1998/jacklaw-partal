/**
 * What an update text to a client can say.
 *
 * The office tells a client how their case stands — a mediation date, that
 * their documents arrived, that someone will call to prepare — by text, from
 * Eleanor, after Jack has approved the exact words (app/api/eleanor/sends,
 * kind=update). The owner chose how those words are made: fixed sentences.
 *
 * Every sentence below is written once, by hand, in each of the four languages
 * the portal is offered in. Nothing is machine-translated and nothing is typed
 * free: a client only ever reads words somebody wrote for them, in the
 * language the office set for them, and the office can read the English of the
 * very same sentence. Eleanor only chooses which sentences, and in what order;
 * this file decides what they say.
 *
 * Like every reminder (lib/reminderMessages.ts), each text names the firm
 * first — a text from an unknown number about "your case" is what a scam looks
 * like — and ends with how to reach the office and the opt-out.
 *
 * Pure: no database, no network. The send lives in lib/clientUpdateSend.ts.
 */

import { Lang } from '@/lib/langs'
import { firstName } from '@/lib/reminderMessages'

const FIRM = '866 JACK LAW'

export const UPDATE_SENTENCE_KEYS = [
  'date_mediation',
  'date_trial',
  'date_deposition',
  'date_hearing',
  'docs_received',
  'answers_received',
  'prepare_call',
  'working_on_it',
] as const

export type UpdateSentenceKey = (typeof UPDATE_SENTENCE_KEYS)[number]

export type UpdateSentence = { key: UpdateSentenceKey; date?: string }

/** Besides the greeting and the closing. A text is read on a phone. */
export const UPDATE_SENTENCE_LIMIT = 4

/** The sentences that carry a day, written out as {date}. */
const DATED: ReadonlySet<UpdateSentenceKey> = new Set(['date_mediation', 'date_trial', 'date_deposition', 'date_hearing'])

export const isDatedSentence = (key: UpdateSentenceKey) => DATED.has(key)

type Book = { greeting: string; closing: string } & Record<UpdateSentenceKey, string>

/**
 * `{name}` is the client's first name; `{date}` the day, written out the way
 * the language writes it (writeDay below).
 *
 * The closing carries the office phone and the STOP line in every language,
 * on its own line, as the reminders do.
 */
export const UPDATE_BOOK: Record<Lang, Book> = {
  en: {
    greeting: `${FIRM}: Hi {name}, here is an update on your case.`,
    date_mediation: 'Your mediation is scheduled for {date}. We will contact you before then to prepare.',
    date_trial: 'Your trial is scheduled to begin on {date}. We will contact you before then to prepare.',
    date_deposition: 'Your deposition is scheduled for {date}. We will contact you before then to prepare.',
    date_hearing: 'The court has set a hearing in your case for {date}. We will let you know if you need to be there.',
    docs_received: 'We received the documents you uploaded. Thank you.',
    answers_received: 'We received your answers. Thank you.',
    prepare_call: 'We would like to set up a call with you. Please reply to this text with a good time, or call us at (866) 522-5529.',
    working_on_it: 'We are working on your case and will contact you when there is news.',
    closing: 'Questions? Reply to this text or call us at (866) 522-5529.\nReply STOP to stop these texts.',
  },
  es: {
    greeting: `${FIRM}: Hola {name}, le compartimos novedades sobre su caso.`,
    date_mediation: 'Su mediación está programada para el {date}. Nos comunicaremos con usted antes de esa fecha para prepararnos.',
    date_trial: 'Su juicio está programado para comenzar el {date}. Nos comunicaremos con usted antes de esa fecha para prepararnos.',
    date_deposition: 'Su declaración (deposición) está programada para el {date}. Nos comunicaremos con usted antes de esa fecha para prepararnos.',
    date_hearing: 'El tribunal fijó una audiencia en su caso para el {date}. Le avisaremos si necesita estar presente.',
    docs_received: 'Recibimos los documentos que subió. Gracias.',
    answers_received: 'Recibimos sus respuestas. Gracias.',
    prepare_call: 'Nos gustaría programar una llamada con usted. Responda a este mensaje con un buen horario, o llámenos al (866) 522-5529.',
    working_on_it: 'Seguimos trabajando en su caso y nos comunicaremos con usted cuando haya novedades.',
    closing: '¿Preguntas? Responda a este mensaje o llámenos al (866) 522-5529.\nResponda STOP para no recibir más mensajes.',
  },
  zh: {
    greeting: `${FIRM}：您好 {name}，以下是您案件的最新进展。`,
    date_mediation: '您的调解定于{date}举行。在此之前，我们会联系您做准备。',
    date_trial: '您的庭审定于{date}开始。在此之前，我们会联系您做准备。',
    date_deposition: '您的取证作证（deposition）定于{date}进行。在此之前，我们会联系您做准备。',
    date_hearing: '法院已将您案件的听证安排在{date}。如需您出席，我们会通知您。',
    docs_received: '我们已收到您上传的文件，谢谢。',
    answers_received: '我们已收到您的回答，谢谢。',
    prepare_call: '我们想和您约一个通话时间。请回复本短信告诉我们您方便的时间，或致电 (866) 522-5529。',
    working_on_it: '我们正在处理您的案件，有新进展时会联系您。',
    closing: '如有疑问，请回复本短信或致电 (866) 522-5529。\n回复 STOP 可停止接收短信。',
  },
  ko: {
    greeting: `${FIRM}: {name}님, 사건 진행 상황을 알려 드립니다.`,
    date_mediation: '조정(mediation) 기일이 {date}로 잡혔습니다. 그 전에 준비를 위해 연락드리겠습니다.',
    date_trial: '재판이 {date}에 시작될 예정입니다. 그 전에 준비를 위해 연락드리겠습니다.',
    date_deposition: '증언 녹취(deposition) 일정이 {date}로 잡혔습니다. 그 전에 준비를 위해 연락드리겠습니다.',
    date_hearing: '법원이 사건의 심리(hearing) 기일을 {date}로 정했습니다. 참석하셔야 하는 경우 따로 알려 드리겠습니다.',
    docs_received: '올려 주신 서류를 잘 받았습니다. 감사합니다.',
    answers_received: '보내 주신 답변을 잘 받았습니다. 감사합니다.',
    prepare_call: '통화 일정을 잡고 싶습니다. 편하신 시간을 이 문자로 답장해 주시거나 (866) 522-5529 로 전화 주세요.',
    working_on_it: '사건은 계속 진행 중이며, 새로운 소식이 있으면 연락드리겠습니다.',
    closing: '궁금하신 점은 이 문자로 답장하시거나 (866) 522-5529 로 전화 주세요.\n수신을 원하지 않으시면 STOP 이라고 답장해 주세요.',
  },
}

/** Chinese runs its sentences together; the others put a space between. */
const JOIN: Record<Lang, string> = { en: ' ', es: ' ', zh: '', ko: ' ' }

const WEEKDAYS: Record<Lang, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  zh: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  ko: ['일', '월', '화', '수', '목', '금', '토'],
}

const MONTHS: Record<'en' | 'es', string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** A YYYY-MM-DD that is a day on the calendar. */
export function isRealDay(value: string): boolean {
  if (!DAY.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/**
 * A day written out as each language writes one: "Tuesday, October 20, 2026",
 * "martes 20 de octubre de 2026", "2026年10月20日（星期二）", "2026년 10월 20일(화)".
 *
 * Hand-written rather than Intl, so the words — and the seal over them — are
 * the same on every server and every Node version.
 */
export function writeDay(day: string, lang: Lang): string {
  const date = new Date(`${day}T12:00:00.000Z`)
  const [y, m, d] = [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()]
  const weekday = WEEKDAYS[lang][date.getUTCDay()]
  switch (lang) {
    case 'en':
      return `${weekday}, ${MONTHS.en[m]} ${d}, ${y}`
    case 'es':
      return `${weekday} ${d} de ${MONTHS.es[m]} de ${y}`
    case 'zh':
      return `${y}年${m + 1}月${d}日（${weekday}）`
    case 'ko':
      return `${y}년 ${m + 1}월 ${d}일(${weekday})`
  }
}

/** "date_mediation:2026-10-20,docs_received": how Eleanor asks, and what the seal covers. */
export function formatUpdateSentences(sentences: readonly UpdateSentence[]): string {
  return sentences.map(sentence => (sentence.date ? `${sentence.key}:${sentence.date}` : sentence.key)).join(',')
}

/**
 * Reads what Eleanor asked for, strictly: known sentences, each once, a real
 * day not already past on a dated one and none on the others, at most four.
 * Nothing is repaired — a text to a client goes out as asked or not at all.
 */
export function parseUpdateSentences(
  raw: unknown,
  today: string
): { ok: true; sentences: UpdateSentence[] } | { ok: false; why: string } {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 400) return { ok: false, why: 'No sentences were given.' }
  const parts = raw.split(',').map(part => part.trim())
  if (parts.length > UPDATE_SENTENCE_LIMIT) return { ok: false, why: `At most ${UPDATE_SENTENCE_LIMIT} sentences go in one update.` }
  const seen = new Set<string>()
  const sentences: UpdateSentence[] = []
  for (const part of parts) {
    const [key, date, ...rest] = part.split(':')
    if (rest.length > 0 || !(UPDATE_SENTENCE_KEYS as readonly string[]).includes(key)) {
      return { ok: false, why: `"${part.slice(0, 40)}" is not one of the update's sentences.` }
    }
    const typed = key as UpdateSentenceKey
    if (isDatedSentence(typed)) {
      if (date === undefined || !isRealDay(date)) return { ok: false, why: `${typed} needs a day, written YYYY-MM-DD.` }
      if (date < today) return { ok: false, why: `${date} has already passed.` }
    } else if (date !== undefined) {
      return { ok: false, why: `${typed} carries no day.` }
    }
    const identity = date ? `${typed}:${date}` : typed
    if (seen.has(identity)) return { ok: false, why: `${typed} is asked for twice.` }
    seen.add(identity)
    sentences.push(date ? { key: typed, date } : { key: typed })
  }
  return { ok: true, sentences }
}

/** The whole text, in one language: greeting, the sentences in order, then the closing. */
export function renderUpdate(lang: Lang, name: string, sentences: readonly UpdateSentence[]): string {
  const book = UPDATE_BOOK[lang] ?? UPDATE_BOOK.en
  const middle = sentences.map(sentence =>
    book[sentence.key].replace('{date}', sentence.date ? writeDay(sentence.date, lang) : '')
  )
  return `${[book.greeting.replace('{name}', firstName(name)), ...middle].join(JOIN[lang] ?? ' ')}\n${book.closing}`
}
