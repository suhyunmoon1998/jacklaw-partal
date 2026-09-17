/**
 * What a client meant when they texted back.
 *
 * The opt-out flag this decides is the only thing standing between a client who
 * asked a law office to stop and a prerecorded call from that office five days
 * later: Twilio's own STOP blocks texts at the account level and does not touch
 * outbound calls. So this is deliberately generous about what counts as "stop"
 * and deliberately narrow about what counts as "start".
 *
 * Kept out of the route file because a Next.js route may only export handlers,
 * and the four languages need testing without a live webhook.
 */

/**
 * Words that mean stop, in the four languages the firm writes in.
 *
 * Matched as a substring of the reply, not against the whole of it. Twilio's own
 * keyword list is exact-match and English-only, which is fine for Twilio — it
 * has already blocked the number by the time this runs. It is not fine here,
 * where this flag is what stops the phone ringing. "Stop.", "please stop",
 * "stop texting me", "PARE", "退订" and "수신거부" are all a client asking a law
 * office to leave them alone, and none of them match an exact English keyword.
 */
const STOP_WORDS = [
  // English, including Twilio's own set
  'stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit', 'remove me', 'opt out', 'optout',
  'leave me alone', 'do not text', "don't text", 'no more text', 'wrong number',
  // Spanish
  'pare', 'parar', 'basta', 'cancelar', 'no más', 'no mas', 'deje de', 'dejen de',
  'número equivocado', 'numero equivocado',
  // Chinese
  '退订', '停止', '取消', '不要发', '打错',
  // Korean
  '수신거부', '그만', '중지', '보내지', '잘못',
]

/**
 * Only an unmistakable opt-in.
 *
 * Deliberately excludes a bare "yes" and "ok": the office's inbound Studio flow
 * texts a booking link and invites a reply, so "yes" answers that — not a
 * question about reminders that nobody asked.
 */
const START_WORDS = ['start', 'unstop', 'resume', 'reanudar', 'continuar', '重新订阅', '수신동의']

const norm = (s: string) => s.trim().toLowerCase()

/** True when the reply contains any of these, so punctuation and prose still count. */
const says = (body: string, words: string[]) => words.some(w => body.includes(w))

/**
 * What a reply means, if anything.
 *
 * An exact opt-in is read first, because "unstop" contains "stop" and is the
 * opposite of it. After that, a reply that says stop anywhere says stop —
 * "start stop" and "resume later but stop for now" are both a client asking to
 * be left alone, and the safe reading of an ambiguous message from somebody
 * being chased by a law firm is the one that stops the chasing.
 */
export function readsAs(rawBody: string): 'stop' | 'start' | null {
  const body = norm(rawBody)
  if (START_WORDS.includes(body)) return 'start'
  if (says(body, STOP_WORDS)) return 'stop'
  if (says(body, START_WORDS)) return 'start'
  return null
}
