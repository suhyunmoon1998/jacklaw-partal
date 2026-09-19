/**
 * What a reminder actually says, in the client's own language.
 *
 * Two texts and then a call, the second more direct than the first. The firm
 * names itself in every one, because a text from an unknown number about "your
 * case" is what a scam looks like and the client has no reason to trust a bare
 * link.
 *
 * Day 5 is the last text, so it is the one that offers the phone — after it the
 * next thing the client hears is the office ringing them.
 *
 * Every text carries the opt-out. Twilio blocks a number that replies STOP at
 * its end, but the sentence has to be in the message for the client to know
 * that is available — and a law office chasing someone who has asked it to stop
 * is the one outcome worth engineering against.
 */

import { Lang } from '@/lib/langs'
import { ReminderKind } from '@/lib/reminderSchedule'

const FIRM = '866 JACK LAW'

/** Short enough to stay one segment once the link is added. */
type Copy = { day2: string; day5: string; call: string }

/**
 * What is being chased, which changes what the message can honestly say.
 *
 * 'questionnaire' is the first ask — someone who has not started. 'follow-up'
 * is a round of extra questions written after reading what they already
 * answered, so telling that person their questionnaire "is still waiting" is
 * both wrong and discouraging: they finished it. They are being asked for a
 * little more, and the message says so.
 */
export type ReminderSubject = 'questionnaire' | 'follow-up'

/**
 * `{name}` is the client's first name and `{link}` the portal.
 *
 * The call script has no link in it — nobody writes down a URL off a voice —
 * so it points at the text that was already sent instead.
 */
const COPY: Record<Lang, Copy> = {
  en: {
    day2:
      `${FIRM}: Hi {name}, your case questionnaire is still waiting. ` +
      `It takes about 15 minutes: {link}\nReply STOP to stop these texts.`,
    day5:
      `${FIRM}: {name}, this is our last text about your questionnaire. ` +
      `Please finish it or call us at (866) 522-5529: {link}\nReply STOP to stop these texts.`,
    call:
      `Hello, this is a message from 866 JACK LAW. ` +
      `We still need you to finish the questionnaire for your case. ` +
      `We sent you a link by text message. ` +
      `If you need help, please call our office at 8 6 6, 5 2 2, 5 5 2 9. ` +
      `Thank you.`,
  },
  es: {
    day2:
      `${FIRM}: Hola {name}, su cuestionario sigue pendiente. ` +
      `Toma unos 15 minutos: {link}\nResponda STOP para no recibir más mensajes.`,
    day5:
      `${FIRM}: {name}, este es nuestro último mensaje sobre el cuestionario. ` +
      `Por favor termínelo o llámenos al (866) 522-5529: {link}\nResponda STOP para no recibir más mensajes.`,
    call:
      `Hola, este es un mensaje de 866 JACK LAW. ` +
      `Todavía necesitamos que termine el cuestionario de su caso. ` +
      `Le enviamos un enlace por mensaje de texto. ` +
      `Si necesita ayuda, llame a nuestra oficina al 8 6 6, 5 2 2, 5 5 2 9. ` +
      `Gracias.`,
  },
  zh: {
    day2:
      `${FIRM}：您好 {name}，您的案件问卷还没有完成，` +
      `大约需要15分钟：{link}\n回复 STOP 可停止接收短信。`,
    day5:
      `${FIRM}：{name}，这是关于问卷的最后一条短信。` +
      `请完成它，或致电 (866) 522-5529：{link}\n回复 STOP 可停止接收短信。`,
    call:
      `您好，这是 866 JACK LAW 律师事务所的留言。` +
      `我们仍然需要您完成案件问卷。` +
      `我们已经通过短信发送了链接。` +
      `如需帮助，请致电本所 8 6 6, 5 2 2, 5 5 2 9。` +
      `谢谢。`,
  },
  ko: {
    day2:
      `${FIRM}: {name}님, 사건 설문이 아직 남아 있습니다. ` +
      `15분이면 됩니다: {link}\n수신을 원하지 않으시면 STOP 이라고 답장해 주세요.`,
    day5:
      `${FIRM}: {name}님, 설문 관련 마지막 문자입니다. ` +
      `마무리해 주시거나 (866) 522-5529 로 전화 주세요: {link}\n수신 거부는 STOP 이라고 답장해 주세요.`,
    call:
      `안녕하세요, 866 잭 로 법률사무소에서 드리는 안내입니다. ` +
      `사건 설문이 아직 완료되지 않았습니다. ` +
      `문자로 링크를 보내 드렸습니다. ` +
      `도움이 필요하시면 사무실 8 6 6, 5 2 2, 5 5 2 9 번으로 전화 주세요. ` +
      `감사합니다.`,
  },
}

/**
 * The same three rungs, for a round of follow-up questions.
 *
 * Shorter than the originals, and warmer at the start, because this person has
 * already given the office an hour of their evening. Day 5 still names the
 * office phone, because it is the last text before somebody rings them.
 */
const FOLLOW_UP: Record<Lang, Copy> = {
  en: {
    day2:
      `${FIRM}: Hi {name}, we read your answers and have a few more questions. ` +
      `About 5 minutes: {link}\nReply STOP to stop these texts.`,
    day5:
      `${FIRM}: {name}, this is our last text about those extra questions. ` +
      `Please answer them or call us at (866) 522-5529: {link}\nReply STOP to stop these texts.`,
    call:
      `Hello, this is a message from 866 JACK LAW. ` +
      `We read your answers and we have a few more questions for you. ` +
      `We sent you a link by text message. ` +
      `If you need help, please call our office at 8 6 6, 5 2 2, 5 5 2 9. ` +
      `Thank you.`,
  },
  es: {
    day2:
      `${FIRM}: Hola {name}, leímos sus respuestas y tenemos algunas preguntas más. ` +
      `Unos 5 minutos: {link}\nResponda STOP para no recibir más mensajes.`,
    day5:
      `${FIRM}: {name}, este es nuestro último mensaje sobre esas preguntas. ` +
      `Por favor respóndalas o llámenos al (866) 522-5529: {link}\nResponda STOP para no recibir más mensajes.`,
    call:
      `Hola, este es un mensaje de 866 JACK LAW. ` +
      `Leímos sus respuestas y tenemos algunas preguntas más para usted. ` +
      `Le enviamos un enlace por mensaje de texto. ` +
      `Si necesita ayuda, llame a nuestra oficina al 8 6 6, 5 2 2, 5 5 2 9. ` +
      `Gracias.`,
  },
  zh: {
    day2:
      `${FIRM}：您好 {name}，我们看过您的回答，还有几个补充问题，` +
      `大约需要5分钟：{link}\n回复 STOP 可停止接收短信。`,
    day5:
      `${FIRM}：{name}，这是关于补充问题的最后一条短信。` +
      `请回答，或致电 (866) 522-5529：{link}\n回复 STOP 可停止接收短信。`,
    call:
      `您好，这是 866 JACK LAW 律师事务所的留言。` +
      `我们看过您的回答，还有几个补充问题想请教您。` +
      `我们已经通过短信发送了链接。` +
      `如需帮助，请致电本所 8 6 6, 5 2 2, 5 5 2 9。` +
      `谢谢。`,
  },
  ko: {
    day2:
      `${FIRM}: {name}님, 답변 잘 봤습니다. 몇 가지만 더 여쭙고 싶습니다. ` +
      `5분이면 됩니다: {link}\n수신을 원하지 않으시면 STOP 이라고 답장해 주세요.`,
    day5:
      `${FIRM}: {name}님, 추가 질문 관련 마지막 문자입니다. ` +
      `답변해 주시거나 (866) 522-5529 로 전화 주세요: {link}\n수신 거부는 STOP 이라고 답장해 주세요.`,
    call:
      `안녕하세요, 866 잭 로 법률사무소에서 드리는 안내입니다. ` +
      `보내주신 답변 잘 봤고, 몇 가지만 더 여쭙고 싶습니다. ` +
      `문자로 링크를 보내 드렸습니다. ` +
      `도움이 필요하시면 사무실 8 6 6, 5 2 2, 5 5 2 9 번으로 전화 주세요. ` +
      `감사합니다.`,
  },
}

/**
 * The picture that rides along with a reminder, by rung.
 *
 * Only the first one. A friendly mascot beside "your questionnaire is still
 * waiting" reads as the firm being human about it; the same picture beside
 * "this is our last text" undercuts the one message that needs to land as
 * serious. It also doubles the cost of every message it is attached to, since
 * a picture makes it an MMS.
 *
 * A path, not a URL: the caller joins it to whatever origin it is running on,
 * so this cannot end up pointing at localhost in production.
 */
export const IMAGE_FOR: Partial<Record<ReminderKind, string>> = {
  // Only on the first ask. A follow-up round goes to somebody who has already
  // spent an evening on this office's questions; the dog was for warming up a
  // cold first contact, and it doubles the cost of the message it rides on.
  // JPEG, cropped and compressed to ~360KB: carriers resize or reject what is
  // too big, and the original was five times that with black bars down the side.
  day2: '/mascot-dog.jpg',
}

/** Twilio's voice for each language, so the call is not read in an accent. */
export const CALL_VOICE: Record<Lang, { language: string; voice: string }> = {
  en: { language: 'en-US', voice: 'Polly.Joanna' },
  es: { language: 'es-US', voice: 'Polly.Lupe' },
  zh: { language: 'cmn-CN', voice: 'Polly.Zhiyu' },
  ko: { language: 'ko-KR', voice: 'Polly.Seoyeon' },
}

/** The part of a name a text should use. Full legal names read as a summons. */
export function firstName(full: string): string {
  const first = String(full ?? '').trim().split(/\s+/)[0] ?? ''
  return first || 'there'
}

export function reminderBody(
  kind: ReminderKind,
  lang: Lang,
  opts: { name: string; link: string; subject?: ReminderSubject }
): string {
  const book = opts.subject === 'follow-up' ? FOLLOW_UP : COPY
  const copy = book[lang] ?? book.en
  return copy[kind]
    .replace('{name}', firstName(opts.name))
    .replace('{link}', opts.link)
}
