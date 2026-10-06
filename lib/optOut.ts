/**
 * What a client meant when they texted back.
 *
 * The opt-out flag this decides is the only thing standing between a client who
 * asked a law office to stop and a prerecorded call from that office five days
 * later: Twilio's own STOP blocks texts at the account level and does not touch
 * outbound calls. So a plain request to stop is read as one in any of the four
 * languages, with punctuation and politeness around it, and an opt-in is read
 * only when it is unmistakable.
 *
 * WHAT CHANGED, AND WHY. The words were matched as substrings of the whole
 * message, both ways. That read "send" as END, "prepare" as PARE and "quite" as
 * QUIT — silently muting clients who never asked — and read "When does my
 * trial start?" or "quiero continuar con el caso" as START, clearing the
 * opt-out of someone who had asked to be left alone and putting the call back
 * on the ladder. And these are workers writing to an employment lawyer:
 * "I quit", "they told me to stop working", "취소됐어요", "회사를 그만뒀어요"
 * are about their job, not about texts.
 *
 * Now:
 *   - a whole message that is a stop word, give or take punctuation and
 *     "please", is a stop; so is a short message of one or two words with a
 *     stop word in it;
 *   - a phrase that is about the texts themselves ("stop texting", "wrong
 *     number", "deje de enviar", "不要发", "그만 보내") is a stop wherever it is;
 *   - a message that says start and stop both is a stop;
 *   - an opt-in is the whole message and nothing else;
 *   - a longer message that only has a stop word somewhere in it changes
 *     nothing on its own and is sent to the office to read (`maybeStop`),
 *     because whether "stop" in a paragraph about a shift means the texts is a
 *     person's call to make.
 *
 * Kept out of the route file because a Next.js route may only export handlers,
 * and the four languages need testing without a live webhook.
 */

/** Whole-message keywords: the message, stripped of punctuation and padding, is one of these. */
const STOP_KEYWORDS = new Set([
  // English, including Twilio's own set
  'stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit', 'revoke', 'optout', 'opt out', 'remove',
  // Spanish
  'pare', 'parar', 'para', 'basta', 'cancelar', 'alto', 'detener', 'baja',
  // Chinese
  '停止', '取消', '退订', '停',
  // Korean
  '그만', '중지', '수신거부', '거부', '취소',
])

/** Phrases about the texts themselves: a stop wherever they appear. */
const STOP_PHRASES = [
  // English
  'stop text', 'stop messag', 'stop call', 'stop contact', 'stop send', 'stop these', 'stop all',
  'do not text', 'dont text', 'do not call', 'dont call', 'do not contact', 'dont contact',
  'no more text', 'no more message', 'no more call', 'remove me', 'take me off', 'leave me alone',
  'wrong number', 'opt out', 'unsubscribe', 'stopall',
  // Spanish
  'no más mensajes', 'no mas mensajes', 'no más llamadas', 'no mas llamadas',
  'deje de enviar', 'dejen de enviar', 'deje de mandar', 'dejen de mandar', 'deje de llamar', 'dejen de llamar',
  'deje de escribir', 'dejen de escribir', 'no me envíe', 'no me envie', 'no me manden', 'no me llamen',
  'pare de enviar', 'pare de mandar', 'paren de enviar', 'paren de mandar',
  'número equivocado', 'numero equivocado',
  // Chinese
  '退订', '不要发', '不要再发', '别发', '别再发', '不要再联系', '不要联系', '打错', '停止发送', '停止短信', '取消订阅',
  // Korean
  '수신거부', '수신 거부', '그만 보내', '그만보내', '보내지 마', '보내지마', '보내지 말', '연락하지 마', '연락 하지 마',
  '연락하지마', '문자 그만', '전화 그만', '잘못 보내', '번호 잘못', '잘못된 번호', '잘못 오셨', '잘못 온',
]

/** Words that might mean stop inside a longer message. Seen alone, a person decides. */
const MAYBE_STOP = ['stop', 'quit', 'end', 'cancel', 'unsubscribe', 'pare', 'parar', 'basta', 'cancelar', 'alto']
const MAYBE_STOP_CJK = ['停止', '取消', '退订', '그만', '중지', '거부']
/** "그만두다" is to quit a job and "그만큼" is "that much"; neither is about texts. */
const NOT_STOP_CJK = /그만(두|뒀|둔|둘|둬|큼|한|하면|이)/g

/** An opt-in is the whole message and nothing else. */
const START_KEYWORDS = new Set(['start', 'unstop', 'resume', 'yes start', 'reanudar', 'continuar', '重新订阅', '수신동의', '수신 동의'])

/** Said around a keyword without changing it. */
const PADDING = new Set([
  'please', 'pls', 'plz', 'now', 'thanks', 'thank', 'you', 'ty', 'ok', 'okay',
  'por', 'favor', 'ya', 'gracias',
  '请', '谢谢',
  '주세요', '해주세요', '해', '부탁해요', '부탁드립니다', '요',
])

const norm = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/'/g, '')
    .trim()

/** The message as words, punctuation and emoji gone. */
const words = (s: string) => s.replace(/[\p{P}\p{S}]+/gu, ' ').split(/\s+/).filter(Boolean)

/** A Latin word as a whole word, accented letters included. */
const hasWord = (text: string, word: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').test(text)

/** Korean polite endings glued onto a keyword: "중지해주세요", "그만해요". */
const stripKoreanEnding = (w: string) => w.replace(/(해주세요|해 주세요|해줘요|해줘|해요|하세요|해|요)$/u, '')

export interface ReplyReading {
  meaning: 'stop' | 'start' | null
  /** A stop word somewhere in a longer message: the office should read it. */
  maybeStop: boolean
}

export function readReply(rawBody: string): ReplyReading {
  const body = norm(rawBody)
  const all = words(body)
  const kept = all.filter(w => !PADDING.has(w)).map(stripKoreanEnding).filter(Boolean)
  const core = kept.join(' ')
  const spaced = all.join(' ')

  // An unmistakable opt-in, alone. "unstop" contains "stop" and is its opposite.
  if (START_KEYWORDS.has(core) || START_KEYWORDS.has(spaced)) return { meaning: 'start', maybeStop: false }

  if (STOP_KEYWORDS.has(core)) return { meaning: 'stop', maybeStop: false }
  if (STOP_PHRASES.some(p => body.includes(p) || spaced.includes(p))) return { meaning: 'stop', maybeStop: false }

  const cjkBody = body.replace(NOT_STOP_CJK, '')
  const latinStop = MAYBE_STOP.some(w => hasWord(body, w))
  const cjkStop = MAYBE_STOP_CJK.some(w => cjkBody.includes(w))

  // One or two words, one of them a stop word: "stop pls", "STOP NOW", "quit it",
  // "请停止". A message this short is about the texts it answers. Chinese is
  // written without spaces, so there it is a handful of characters instead.
  const compact = kept.join('')
  const short = /[\u4e00-\u9fff]/.test(compact) ? compact.length <= 4 : kept.length <= 2 && compact.length <= 12
  if (short && (latinStop || cjkStop)) return { meaning: 'stop', maybeStop: false }

  // Start and stop together is stop: the safe reading of an ambiguous message
  // from somebody being chased by a law firm is the one that stops the chasing.
  const startToo = ['start', 'resume', 'unstop', 'reanudar', 'continuar'].some(w => hasWord(body, w))
  if (startToo && latinStop) return { meaning: 'stop', maybeStop: false }

  return { meaning: null, maybeStop: latinStop || cjkStop }
}

/** What a reply means, if anything. */
export function readsAs(rawBody: string): 'stop' | 'start' | null {
  return readReply(rawBody).meaning
}
