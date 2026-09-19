import { describe, it, expect } from 'vitest'
import { available, chapters, cite, FETCHED_ON, quote, section } from '@/lib/authority'

describe('the statutes a reading may cite', () => {
  it('holds the provisions a California wage case actually runs on', () => {
    // Each of these is the operative section for a claim the portal's
    // questionnaire asks about. A missing one is a claim that cannot be cited.
    const required: [string, string, string][] = [
      ['LAB', '201', 'final pay on discharge'],
      ['LAB', '202', 'final pay on resignation'],
      ['LAB', '203', 'waiting-time penalties'],
      ['LAB', '226', 'wage statements'],
      ['LAB', '226.7', 'meal and rest premiums'],
      ['LAB', '351', 'gratuities'],
      ['LAB', '510', 'overtime'],
      ['LAB', '512', 'meal periods'],
      ['LAB', '551', 'one day of rest'],
      ['LAB', '552', 'no more than six days'],
      ['LAB', '1174', 'records'],
      ['LAB', '1182.12', 'minimum wage'],
      ['LAB', '1194', 'recovery of unpaid wages'],
      ['LAB', '1194.2', 'liquidated damages'],
      ['LAB', '1197', 'payment below minimum wage'],
      ['LAB', '1198', 'hours beyond the wage order'],
      ['LAB', '1102.5', 'whistleblower retaliation'],
      ['LAB', '2802', 'expense reimbursement'],
      ['BPC', '17200', 'unfair competition'],
      ['BPC', '17203', 'injunctive relief and restitution'],
      ['BPC', '17208', 'four-year limitation'],
    ]
    for (const [law, num, what] of required) {
      expect(section(law, num), `${law} ${num} (${what}) is missing`).toBeTruthy()
    }
  })

  it('has the real text, not a summary', () => {
    // §226.7 is the premium-pay section. If what is on file does not say "one
    // additional hour of pay", it is not the section.
    expect(section('LAB', '226.7')).toMatch(/one additional hour of pay/i)
    // §510 is daily overtime.
    expect(section('LAB', '510')).toMatch(/eight hours/i)
    // §512 is the meal-period section, waivable under six hours.
    expect(section('LAB', '512')).toMatch(/30 minutes/i)
    // §17208 is the four-year limitation the UCL adds.
    expect(section('BPC', '17208')).toMatch(/four years/i)
  })

  it('kept the section the decimal ordering nearly threw away', () => {
    // Section numbers are not decimals: the code runs 1182.2 and THEN 1182.11,
    // 1182.12. Read as floats, the minimum wage section sorts out of order and
    // was silently dropped by the fetcher until that was fixed.
    const minimumWage = section('LAB', '1182.12')
    expect(minimumWage).toBeTruthy()
    expect(minimumWage).toMatch(/minimum wage/i)
    expect(minimumWage!.length).toBeGreaterThan(2000)
  })

  it('says so rather than inventing when a section is not on file', () => {
    expect(section('LAB', '99999')).toBeNull()
    const quoted = quote([{ law: 'LAB', num: '99999' }])
    expect(quoted).toContain('NOT ON FILE')
    expect(quoted).toContain('Do not state what this section says')
  })

  it('quotes in the form the office cites in', () => {
    expect(cite('LAB', '226.7')).toBe('Lab. Code § 226.7')
    expect(cite('BPC', '17200')).toBe('Bus. & Prof. Code § 17200')
    expect(quote([{ law: 'LAB', num: '203' }])).toContain('=== Lab. Code § 203 ===')
  })

  it('records where and when it came from, so currency can be checked', () => {
    expect(FETCHED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(chapters().length).toBeGreaterThan(5)
    expect(chapters().every(c => c.count > 0)).toBe(true)
    expect(available().length).toBeGreaterThan(300)
  })
})
