import { describe, expect, it } from 'vitest'
import { typedPhoneDigits } from '@/lib/phoneNumber'

describe('the sign-in box', () => {
  it('drops a leading 1, typed or filled in, instead of shifting the number', () => {
    expect(typedPhoneDigits('13314729573')).toBe('3314729573')
    expect(typedPhoneDigits('+1 (331) 472-9573')).toBe('3314729573')
    expect(typedPhoneDigits('1-331-472-9573')).toBe('3314729573')
  })

  it('leaves an ordinary ten-digit number alone', () => {
    expect(typedPhoneDigits('(331) 472-9573')).toBe('3314729573')
    expect(typedPhoneDigits('3314729573')).toBe('3314729573')
  })

  it('works key by key while someone is still typing', () => {
    expect(typedPhoneDigits('1')).toBe('')
    expect(typedPhoneDigits('133')).toBe('33')
    expect(typedPhoneDigits('331')).toBe('331')
  })
})
