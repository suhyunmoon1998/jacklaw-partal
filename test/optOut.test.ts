import { describe, it, expect } from 'vitest'
import { readReply, readsAs } from '@/lib/optOut'

/**
 * The opt-out flag this endpoint sets is the only thing standing between a
 * client who asked a law office to stop and a prerecorded call from that office
 * five days later. Twilio's own STOP blocks texts and does not block calls.
 */
describe('reading what a client meant', () => {
  it('hears the plain English keywords', () => {
    for (const s of ['STOP', 'stop', 'Stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit']) {
      expect(readsAs(s)).toBe('stop')
    }
  })

  it('hears it with punctuation and around other words', () => {
    // Exact-match keyword sets miss every one of these, and each is plainly a
    // person asking to be left alone.
    for (const s of ['Stop.', 'STOP!', 'please stop', 'stop texting me', 'Please remove me',
                     'opt out', 'wrong number', 'leave me alone', "don't text me again"]) {
      expect(readsAs(s)).toBe('stop')
    }
  })

  it('hears it in Spanish, Chinese and Korean', () => {
    // The firm writes to clients in four languages. It has to be able to read
    // the answer in four languages.
    for (const s of ['PARE', 'pare por favor', 'basta', 'no más mensajes', 'número equivocado',
                     '退订', '请停止', '取消', '打错了',
                     '수신거부', '그만 보내세요', '중지해주세요', '잘못 오셨어요']) {
      expect(readsAs(s)).toBe('stop')
    }
  })

  it('hears an unmistakable opt-in', () => {
    for (const s of ['START', 'unstop', 'resume', 'reanudar', '수신동의']) {
      expect(readsAs(s)).toBe('start')
    }
  })

  it('never reads an opt-in out of a message that also says stop', () => {
    expect(readsAs('start stop')).toBe('stop')
    expect(readsAs('resume later but stop for now')).toBe('stop')
  })

  it('does not treat a bare yes as consent to be texted', () => {
    // The office's inbound flow texts a booking link and invites a reply; "yes"
    // answers that, not a question about reminders nobody asked.
    expect(readsAs('yes')).toBeNull()
    expect(readsAs('ok')).toBeNull()
  })

  it('leaves everything else for a person to read', () => {
    for (const s of ['I already sent it', 'who is this?', '누구세요', '¿quién es?', 'call me']) {
      expect(readsAs(s)).toBeNull()
    }
  })
})

describe('words inside other words, and talk about work', () => {
  it('does not hear "end" in send, "pare" in prepare or "quit" in quite', () => {
    // Each of these silently muted a client who never asked to be.
    for (const s of ['Please send me the link', 'I can prepare the papers', 'I am quite busy today', 'the weekend shift']) {
      expect(readsAs(s)).toBeNull()
    }
  })

  it('never reads an opt-in out of a question that happens to say start or continue', () => {
    // These cleared the opt-out of someone who had asked to be left alone.
    for (const s of ['When does my trial start?', 'quiero continuar con el caso', 'Can we start the case?']) {
      expect(readsAs(s)).toBeNull()
    }
  })

  it('does not take a worker talking about their job for an opt-out, but hands it to a person', () => {
    for (const s of ['I quit my job last week', 'they told me to stop working at 5', 'cancel my appointment please?']) {
      expect(readReply(s)).toEqual({ meaning: null, maybeStop: true })
    }
    // "그만두다" is to quit a job; not about texts at all.
    expect(readReply('회사를 그만뒀어요')).toEqual({ meaning: null, maybeStop: false })
    expect(readReply('公司取消了我的班')).toEqual({ meaning: null, maybeStop: true })
  })

  it('still hears a short message that is a stop', () => {
    for (const s of ['stop it', 'STOP NOW', 'Stop please!!', 'quit it', '그만해요', '请停止', 'STOP ALL']) {
      expect(readsAs(s)).toBe('stop')
    }
  })
})

