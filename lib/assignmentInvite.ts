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

export async function lookupClientPhone(clientId: string): Promise<string> {
  const { data } = await getSupabase()
    .from('clients')
    .select('phone, sms_opt_out')
    .eq('id', clientId)
    .maybeSingle()
  // Somebody who has replied STOP is not texted, whoever presses the button.
  if (!data || data.sms_opt_out) return ''
  const phone = String(data.phone ?? '')
  return phone.replace(/\D/g, '').length >= 10 ? phone : ''
}
