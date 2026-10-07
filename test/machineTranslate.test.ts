import { describe, expect, it } from 'vitest'
import { answersLanguage, detectLanguage, readsAsEnglish, submissionLanguage } from '@/lib/machineTranslate'

/**
 * Which writing the office is shown in English. Accents alone used to decide
 * Spanish, and an answer typed on a phone without them reached the office as
 * it stood.
 */
describe('which language a piece of writing is in', () => {
  it('reads Spanish typed without accents as Spanish', () => {
    for (const text of [
      'No me pagaron las horas extra',
      'trabajaba 10 horas al dia sin descanso',
      'mi supervisor me grito enfrente de todos',
      'No me dieron mi ultimo cheque',
      'Yo trabajaba en la cocina de 6am a 4pm sin lunch',
      'Mi manager me dijo que no podia tomar break',
    ]) {
      expect(detectLanguage(text), text).toBe('es')
    }
  })

  it('still reads accented Spanish, and Korean and Chinese by their script', () => {
    expect(detectLanguage('Mi jefe no me pagó')).toBe('es')
    expect(detectLanguage('Sí')).toBe('es')
    expect(detectLanguage('매니저가 소리를 질렀어요')).toBe('ko')
    expect(detectLanguage('经理不让我们休息')).toBe('zh')
  })

  it('leaves English alone, place names and an accented name included', () => {
    for (const text of [
      'My manager yelled at me',
      'I worked at the Los Angeles location of Taco del Mar',
      'I moved from Las Vegas to Los Angeles',
      'My supervisor José yelled at me',
      '123 Calle de la Paz, El Monte',
      'Part-time',
      'Toyota',
      'I was paid por hour',
      'see ya later',
    ]) {
      expect(detectLanguage(text), text).toBeNull()
    }
  })

  it('reads English from its little words, and only English', () => {
    expect(readsAsEnglish('He told me I could not take a break')).toBe(true)
    expect(readsAsEnglish('Cajero')).toBe(false)
    expect(readsAsEnglish('No me pagaron las horas extra')).toBe(false)
  })
})

describe('the language of a whole submission', () => {
  it('is not Spanish for one accented name in an English form', () => {
    expect(
      submissionLanguage({
        supervisor: 'José Martinez',
        what_happened: 'He told me I could not take my lunch and I was fired after I complained.',
        duties: 'I cooked and cleaned the kitchen at the end of the night.',
      })
    ).toBeNull()
  })

  it('is Spanish when Spanish outweighs English, accents or not', () => {
    expect(
      submissionLanguage({
        what_happened: 'No me pagaron las horas extra',
        breaks: 'trabajaba 10 horas al dia sin descanso',
        job_type: 'Part-time',
      })
    ).toBe('es')
  })

  it('is Chinese or Korean on any answer in those scripts, which no reader of English can read', () => {
    expect(
      submissionLanguage({
        what_happened: '他让我走',
        duties: 'I cooked and cleaned the kitchen at the end of the night.',
        more: 'He told me I could not take my lunch.',
      })
    ).toBe('zh')
  })

  it('counts a Spanish reader as Spanish once they typed anything', () => {
    expect(answersLanguage({ start_date: 'Septiembre 2024', still_working: 'no' }, 'es')).toBe('es')
    expect(answersLanguage({ start_date: 'Septiembre 2024' }, 'en')).toBeNull()
    expect(answersLanguage({ still_working: 'no' }, 'es')).toBeNull()
    expect(answersLanguage({ what_happened: '매니저가 소리를 질렀어요' }, 'es')).toBe('ko')
  })
})
