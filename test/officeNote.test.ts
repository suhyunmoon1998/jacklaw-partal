/**
 * A step sent in the office's own words, and a step nobody sent.
 *
 * The first is the Message box on Send: the words go as written, with only
 * what a client needs to tell who it is from, get in, and opt out added. The
 * second is the reminder ladder, which counted from the moment a client was
 * added and chased invitations that were never sent.
 */

import { describe, expect, it } from 'vitest'
import { OFFICE_NOTE_MAX, officeNoteSms } from '@/lib/assignmentInvite'
import { generateAssignmentEmailHtml } from '@/lib/emailTemplate'
import { chasedFrom } from '@/lib/reminderSchedule'

const NOTE = 'Hi Daniel,\n\nWe are sending you the first set of questions through our client portal.\n\nBest regards,\nLaw Offices of Jack D. Josephson'

describe('the office note, by text', () => {
  it('sends the words as written, between the firm and the way in', () => {
    const sms = officeNoteSms('en', `  ${NOTE}  `, 'https://jacklaw-portal.vercel.app/')
    expect(sms).toBe(
      `866 JACK LAW: ${NOTE}\n\nhttps://jacklaw-portal.vercel.app/client?lang=en\nReply STOP to stop these texts.`
    )
  })

  it('says how to stop in the language the client reads', () => {
    expect(officeNoteSms('ko', '안녕하세요', 'https://x.test')).toMatch(/\n수신을 원하지 않으시면 STOP 이라고 답장해 주세요\.$/)
    expect(officeNoteSms('es', 'Hola', 'https://x.test')).toMatch(/client\?lang=es\nResponda STOP/)
  })

  it('stays within what Twilio will join into one message', () => {
    const longest = officeNoteSms('en', 'x'.repeat(OFFICE_NOTE_MAX), 'https://jacklaw-portal.vercel.app')
    expect(longest.length).toBeLessThan(1600)
  })
})

describe('the office note, by email', () => {
  it('replaces the greeting and opening line, and is escaped', () => {
    const html = generateAssignmentEmailHtml('Daniel Si', 'Step 1', 77, 'https://x.test/q', 'en', 'Hi <b>Daniel</b>,\nThanks')
    expect(html).toContain('Hi &lt;b&gt;Daniel&lt;/b&gt;,<br/>Thanks')
    expect(html).not.toContain('<b>Daniel</b>')
    expect(html).toContain('https://x.test/q')
  })

  it('keeps the standard opening when there is no note', () => {
    const standard = generateAssignmentEmailHtml('Daniel Si', 'Step 1', 77, 'https://x.test/q', 'en')
    expect(generateAssignmentEmailHtml('Daniel Si', 'Step 1', 77, 'https://x.test/q', 'en', '   ')).toBe(standard)
  })
})

describe('what the reminder ladder counts from', () => {
  it('does not chase a step only opened as the client was added', () => {
    expect(chasedFrom({ sent_at: '2026-10-21T21:04:40Z', created_by: 'on-create' })).toBeNull()
  })

  it('counts from the office’s own send', () => {
    expect(chasedFrom({ sent_at: '2026-10-22T18:00:00Z', created_by: 'admin' })).toBe('2026-10-22T18:00:00Z')
    expect(chasedFrom({ sent_at: '2026-10-22T18:00:00Z', created_by: 'eleanor' })).toBe('2026-10-22T18:00:00Z')
    expect(chasedFrom({ sent_at: '2026-09-01T00:00:00Z', created_by: 'backfill' })).toBe('2026-09-01T00:00:00Z')
  })

  it('has nothing to count from without a time', () => {
    expect(chasedFrom({ sent_at: null, created_by: 'admin' })).toBeNull()
  })
})
