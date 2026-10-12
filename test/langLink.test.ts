import { describe, expect, it } from 'vitest'
import { withLang } from '@/lib/langLink'
import { moduleLink } from '@/lib/moduleSend'
import { stepInviteSms, invitationSms } from '@/lib/assignmentInvite'

describe('links the office sends open in the client’s language', () => {
  it('adds the language to a link, after any query already on it', () => {
    expect(withLang('https://x.app/client', 'es')).toBe('https://x.app/client?lang=es')
    expect(withLang('https://x.app/client?next=%2Fq', 'zh')).toBe('https://x.app/client?next=%2Fq&lang=zh')
    expect(withLang('https://x.app/client', null)).toBe('https://x.app/client')
  })

  it('carries it on a module link and on the texts', () => {
    expect(moduleLink('https://x.app', 'module2', false, 'es')).toBe('https://x.app/questionnaire/module2?lang=es')
    expect(moduleLink('https://x.app', 'module2', true, 'es')).toBe('https://x.app/dashboard?lang=es')
    expect(stepInviteSms('es', 'Flor Sanchez', { name: 'Paso 2', minutes: [20, 30] }, 'https://x.app')).toContain('https://x.app/client?lang=es')
    expect(invitationSms('ko', 'Aaron Oh', 'https://x.app/')).toContain('https://x.app/client?lang=ko')
  })
})
