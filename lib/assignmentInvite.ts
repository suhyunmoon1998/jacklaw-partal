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

import { NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'
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

/** The part of a name a text should use. Full legal names read as a summons. */
function firstName(full: string): string {
  const first = String(full ?? '').trim().split(/\s+/)[0] ?? ''
  return first || 'there'
}

export function invitationSms(lang: Lang, name: string, at: string): string {
  const write = INVITE[lang] ?? INVITE.en
  return write(firstName(name), `${at.replace(/\/$/, '')}/client`)
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
  return { phone: usablePhone(String(data.phone ?? '')), optedOut: Boolean(data.sms_opt_out) }
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
  return write(firstName(name), step.name, String(step.minutes[1]), `${at.replace(/\/$/, '')}/client`)
}
