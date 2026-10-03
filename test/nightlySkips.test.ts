import { describe, expect, it } from 'vitest'
import { skipKey, withoutSkipped } from '@/lib/nightlySkips'

describe('the night holds back a step that failed earlier tonight', () => {
  const waiting = [
    { clientId: 'a', needs: 'questions', name: 'A' },
    { clientId: 'b', needs: 'reading', name: 'B' },
    { clientId: 'a', needs: 'facts', name: 'A' },
  ]

  it('drops only the client/step pair that failed', () => {
    const left = withoutSkipped(waiting, new Set([skipKey('a', 'questions')]))
    expect(left.map(w => `${w.clientId}:${w.needs}`)).toEqual(['b:reading', 'a:facts'])
  })

  it('with no skips (no table yet, or a failed read) the list is unchanged', () => {
    expect(withoutSkipped(waiting, new Set())).toEqual(waiting)
  })
})
