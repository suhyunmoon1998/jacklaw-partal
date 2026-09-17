import { describe, it, expect } from 'vitest'
import { readsAs } from '@/lib/optOut'

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
