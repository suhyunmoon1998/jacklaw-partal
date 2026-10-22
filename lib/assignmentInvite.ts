/**
 * The text that tells a client a questionnaire is waiting for them.
 *
 * Separate from lib/reminderMessages.ts, which is the chasing ladder. This is
 * the first message — the one that arrives because somebody at the firm chose
 * to send it, not because a client went quiet.
 *
 * It carries the portal's front door and not the assignment's own URL. Sign-in
 * is by phone number, so the front door is enough, and nothing in a text
 * message should be a key to somebody's case file: a phone is lent, screens
 * are read over shoulders, and a link that opens a case without asking who is
 * holding it is the wrong thing to put in a message.
 */

import { withLang } from '@/lib/langLink'
import { NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { numberOptedOut } from '@/lib/numberOptOut'
import { Lang } from '@/lib/langs'

const FIRM = '866 JACK LAW'

/** One message per language, short enough to stay a single segment. */
const INVITE: Record<Lang, (name: string, link: string) => string> = {
  en: (n, l) =>
    `${FIRM}: Hi ${n}, we have some questions about your case waiting for you: ${l}\nReply STOP to stop these texts.`,
  es: (n, l) =>
    `${FIRM}: Hola ${n}, tenemos unas preguntas sobre su caso esperándole: ${l}\nResponda STOP para no recibir más mensajes.`,
  zh: (n, l) => `${FIRM}：您好 ${n}，有几个关于您案件的问题等您回答：${l}\n回复 STOP 可停止接收短信。`,
  ko: (n, l) =>
    `${FIRM}: ${n}님, 사건 관련해 여쭐 내용이 준비되어 있습니다: ${l}\n수신을 원하지 않으시면 STOP 이라고 답장해 주세요.`,
}

/**
 * The same first text for the court fee waiver questions (lib/feeWaiver.ts),
 * which say what they are for: "questions about your case" would not tell a
 * client why the office now wants to know what their household earns.
 */
const FEE_WAIVER_INVITE: Record<Lang, (name: string, link: string) => string> = {
  en: (n, l) =>
    `${FIRM}: Hi ${n}, so we can ask the court to waive your fees, we need a few quick answers. About 1 minute: ${l}\nReply STOP to stop these texts.`,
  es: (n, l) =>
    `${FIRM}: Hola ${n}, para pedirle a la corte que no le cobre las cuotas, necesitamos unas respuestas rápidas. Toma 1 minuto: ${l}\nResponda STOP para no recibir más mensajes.`,
  zh: (n, l) => `${FIRM}：您好 ${n}，为了向法院申请免缴法庭费用，需要您回答几个简单的问题，大约1分钟：${l}\n回复 STOP 可停止接收短信。`,
  ko: (n, l) =>
    `${FIRM}: ${n}님, 법원 수수료 면제 신청에 필요한 짧은 질문이 있습니다. 1분이면 됩니다: ${l}\n수신을 원하지 않으시면 STOP 이라고 답장해 주세요.`,
}

/** The part of a name a text should use. Full legal names read as a summons. */
function firstName(full: string): string {
  const first = String(full ?? '').trim().split(/\s+/)[0] ?? ''
  return first || 'there'
}

export function invitationSms(lang: Lang, name: string, at: string, about: 'questions' | 'fee-waiver' = 'questions'): string {
  const book = about === 'fee-waiver' ? FEE_WAIVER_INVITE : INVITE
  const write = book[lang] ?? book.en
  return write(firstName(name), withLang(`${at.replace(/\/$/, '')}/client`, lang))
}

/**
 * The public address of the portal, not whatever host this request arrived on.
 *
 * A send made from a Vercel preview URL would put a link behind deployment
 * protection into a client's text, and nothing here would know.
 */
export function origin(req: NextRequest): string {
  return process.env.PUBLIC_ORIGIN ?? req.nextUrl.origin
}

/**
 * A number worth handing to Twilio.
 *
 * Ten digits is the floor because every shorter thing typed into a phone field
 * is an extension, a partial, or a note to self, and `toE164` would turn some
 * of them into a real stranger's number.
 */
export function usablePhone(raw: string): string {
  const phone = String(raw ?? '').trim()
  return phone.replace(/\D/g, '').length >= 10 ? phone : ''
}

/** What the office would text this client with, and why they might not be able to. */
export async function lookupClientSms(
  clientId: string
): Promise<{ phone: string; optedOut: boolean }> {
  const { data } = await getSupabase()
    .from('clients')
    .select('phone, sms_opt_out')
    .eq('id', clientId)
    .maybeSingle()
  if (!data) return { phone: '', optedOut: false }
  const phone = usablePhone(String(data.phone ?? ''))
  // The person, not the row: another case on this number may have said stop.
  // A number that cannot be checked is treated as stopped.
  const stopped = phone ? await numberOptedOut(phone) : false
  return { phone, optedOut: Boolean(data.sms_opt_out) || stopped !== false }
}

export async function lookupClientPhone(clientId: string): Promise<string> {
  const { phone, optedOut } = await lookupClientSms(clientId)
  // Somebody who has replied STOP is not texted, whoever presses the button.
  return optedOut ? '' : phone
}

/**
 * Which number this send should text, if any.
 *
 * The office can now type a number the file does not have — that is the whole
 * point of the field, since a client with no email address usually reached this
 * firm by phone and the number is on a message pad, not in the database. Two
 * rules survive anything they type:
 *
 *   - STOP wins. A client who asked this office to stop is not texted because
 *     somebody typed their number into a different box.
 *   - A number that is not a number is refused out loud, not silently dropped,
 *     so a send that looks successful never means a text nobody sent.
 *
 * `typed` undefined means the caller never offered the field and the number on
 * file should be used; an empty string means the office cleared it on purpose.
 */
export type SmsTarget = { phone: string; reason?: 'off' | 'opted-out' | 'unusable' | 'none' }

export function chooseSmsTarget(
  typed: string | undefined,
  onFile: { phone: string; optedOut: boolean }
): SmsTarget {
  if (onFile.optedOut) return { phone: '', reason: 'opted-out' }
  if (typed === undefined) {
    return onFile.phone ? { phone: onFile.phone } : { phone: '', reason: 'none' }
  }
  const trimmed = typed.trim()
  if (!trimmed) return { phone: '', reason: 'off' }
  const usable = usablePhone(trimmed)
  return usable ? { phone: usable } : { phone: '', reason: 'unusable' }
}

/**
 * The text that hands a client one of the numbered steps.
 *
 * Separate copy from the question-set invitation above, and the difference
 * matters. A question set is a handful of follow-ups; Step 1 is
 * seventy-seven questions about their job, their pay and their hours. Telling
 * someone there are "a few things to ask" and then opening that is how a
 * client starts, stops, and is never heard from again — which is the exact
 * failure this message exists to prevent. So it says which step, and roughly
 * how long, before they tap.
 */
const STEP_INVITE: Record<Lang, (name: string, step: string, mins: string, link: string) => string> = {
  // The step's name is its own clause, not a noun dropped into a sentence.
  // "Step 1 · Your intake questions for your case is ready" reads as a
  // mistake, and in Korean an interpolated name picks the wrong particle —
  // "문진표이" instead of "문진표가". A colon avoids both and survives a step
  // being renamed.
  en: (n, step, m, l) =>
    `${FIRM}: Hi ${n} — ${step}. It takes about ${m} minutes and you can stop and come back: ${l}\nReply STOP to stop these texts.`,
  es: (n, step, m, l) =>
    `${FIRM}: Hola ${n} — ${step}. Toma unos ${m} minutos y puede parar y continuar después: ${l}\nResponda STOP para no recibir más mensajes.`,
  zh: (n, step, m, l) =>
    `${FIRM}：您好 ${n} — ${step}。大约需要${m}分钟，可以中途保存稍后继续：${l}\n回复 STOP 可停止接收短信。`,
  ko: (n, step, m, l) =>
    `${FIRM}: ${n}님 — ${step}, 준비되었습니다. ${m}분 정도 걸리고 중간에 멈췄다 이어서 하실 수 있습니다: ${l}\n수신을 원하지 않으시면 STOP 이라고 답장해 주세요.`,
}

export function stepInviteSms(
  lang: Lang,
  name: string,
  step: { name: string; minutes: [number, number] },
  at: string
): string {
  const write = STEP_INVITE[lang] ?? STEP_INVITE.en
  // The high end of the range. A client told fifteen minutes who spends
  // twenty-five feels misled; one told twenty-five who spends fifteen does not.
  return write(firstName(name), step.name, String(step.minutes[1]), withLang(`${at.replace(/\/$/, '')}/client`, lang))
}

/** The line every text to a client ends with, in their language. */
const STOP_LINE: Record<Lang, string> = {
  en: 'Reply STOP to stop these texts.',
  es: 'Responda STOP para no recibir más mensajes.',
  zh: '回复 STOP 可停止接收短信。',
  ko: '수신을 원하지 않으시면 STOP 이라고 답장해 주세요.',
}

/** The longest note a send will carry. Twilio joins a long text up to 1,600 characters. */
export const OFFICE_NOTE_MAX = 1000

/**
 * A step sent in the office's own words instead of the standard text.
 *
 * Some clients are owed more than the standard line — one who has already told
 * the office everything by phone, and is about to be asked it again. The note
 * goes out as written; only the firm's name in front, and the portal's front
 * door and the STOP line after it, are added, so the client can still tell who
 * it is from, get in, and opt out.
 */
export function officeNoteSms(lang: Lang, note: string, at: string): string {
  const link = withLang(`${at.replace(/\/$/, '')}/client`, lang)
  return `${FIRM}: ${note.trim()}\n\n${link}\n${STOP_LINE[lang] ?? STOP_LINE.en}`
}
