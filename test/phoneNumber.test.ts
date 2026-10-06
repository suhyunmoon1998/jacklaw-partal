import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { phoneKey, phoneVariants } from '@/lib/phoneNumber'

/**
 * A client's number is compared by its key and looked up in every form a row
 * may have been typed in. Signing in is a phone number again (the texted code
 * was taken out on 2026-10-06 while the portal is tested), so a number that
 * matched only exactly would leave some clients unable to sign in at all.
 */
const read = (p: string) => readFileSync(p, 'utf8')

describe('a client number', () => {
  it('is one number however the office typed it', () => {
    for (const raw of ['5550104446', '15550104446', '+1 (555) 010-4446', '555.010.4446']) {
      expect(phoneKey(raw)).toBe('5550104446')
    }
    expect(phoneVariants('5550104446')).toEqual(['5550104446', '15550104446', '+15550104446'])
    expect(phoneVariants('555010')).toEqual(['555010'])
  })

  it('signs a client in by number alone, in whatever form their row holds it', () => {
    for (const route of ['app/api/clients/lookup/route.ts', 'app/api/clients/session/route.ts']) {
      const src = read(route)
      expect(src).toContain('.in(\'phone\', phoneVariants(phoneKey(digits)))')
      expect(src).not.toMatch(/verifiedPhone|signInCode|clients\/code/)
    }
    // No code step on the page, and no code routes.
    expect(read('app/client/page.tsx')).not.toMatch(/clients\/code|code_sent|verify_btn/)
  })
})
