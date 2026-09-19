import { describe, it, expect } from 'vitest'
import { available, chapters, cite, FETCHED_ON, parseKey, quote, section, wageOrders } from '@/lib/authority'

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
    expect(quoted).toContain('Do not state what this provision says')
  })

  it('quotes in the form the office cites in', () => {
    expect(cite('LAB', '226.7')).toBe('Lab. Code § 226.7')
    expect(cite('BPC', '17200')).toBe('Bus. & Prof. Code § 17200')
    expect(quote([{ law: 'LAB', num: '203' }])).toContain('=== Lab. Code § 203 ===')
  })

  it('records where and when each body came from, so currency can be checked', () => {
    for (const [body, from] of Object.entries(FETCHED_ON)) {
      expect(from.on, body).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(from.from.length, body).toBeGreaterThan(10)
    }
    expect(chapters().length).toBeGreaterThan(5)
    expect(chapters().every(c => c.count > 0)).toBe(true)
    expect(available().length).toBeGreaterThan(800)
  })

  it('holds the limitations statutes, which nothing may state from memory', () => {
    // A filing deadline is the one error in this system that cannot be
    // recovered from, and an earlier reading got one wrong by two years.
    expect(section('CCP', '337')).toMatch(/four years/i)
    expect(section('CCP', '338')).toMatch(/three years/i)
    expect(section('CCP', '339')).toMatch(/two years/i)
    expect(section('CCP', '340')).toMatch(/one year/i)
    expect(section('CCP', '343')).toBeTruthy()
    expect(cite('CCP', '338')).toBe('Code Civ. Proc. § 338')
  })
})

describe('the wage orders', () => {
  it('supplies the rest-period duty the Labor Code does not state', () => {
    // Section 226.7 gives the premium and points at "an applicable ... order of
    // the Industrial Welfare Commission" for the duty. This is that order.
    const rest = section('IWC', '5 sec 12')
    expect(rest).toMatch(/authorize and permit/i)
    expect(rest).toMatch(/ten \(10\)\s*\n?\s*minutes net rest time per four \(4\) hours/i)
  })

  it('holds every order, so the applicable one can be chosen rather than assumed', () => {
    // Which order governs turns on the employer's industry. That is a legal
    // classification; holding all of them is what lets it be made deliberately.
    const orders = wageOrders()
    expect(orders.length).toBeGreaterThanOrEqual(17)
    expect(orders).toContain('5')
    expect(orders).toContain('7')
    expect(section('IWC', '7 sec 12')).toBeTruthy()
  })

  it('cites an order the way a brief does', () => {
    expect(cite('IWC', '5 sec 12')).toBe('IWC Wage Order 5, § 12')
    expect(parseKey('IWC 5 sec 12')).toEqual({ law: 'IWC', num: '5 sec 12' })
  })
})

describe('the jury instructions', () => {
  it('holds the wage-and-hour instructions, with the cases collected under them', () => {
    const meal = section('CACI', '2766A')
    expect(meal).toBeTruthy()
    // The value of CACI here is not the element text but the notes beneath it,
    // which are the office's index into the controlling cases.
    expect(meal).toMatch(/Sources and Authority/i)
    expect(section('CACI', '2702')).toBeTruthy()
    expect(cite('CACI', '2702')).toBe('CACI No. 2702')
  })

  it('holds the whistleblower instruction for section 1102.5', () => {
    const found = ['4603', '4600', '4601', '4602'].filter(n => section('CACI', n))
    expect(found.length).toBeGreaterThan(0)
  })
})
