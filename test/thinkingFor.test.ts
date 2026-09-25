import { describe, it, expect } from 'vitest'
import { HAIKU, OPUS, SONNET, thinkingFor } from '@/lib/models'

describe('thinking, in the form each model takes', () => {
  it('gives Opus and Sonnet adaptive thinking and the effort asked for', () => {
    for (const m of [OPUS, SONNET]) {
      expect(thinkingFor(m, 'medium', 24000)).toEqual({ thinking: { type: 'adaptive' }, effort: { effort: 'medium' } })
    }
  })

  it('gives Haiku 4.5 a budget under the ceiling and no effort, which it rejects', () => {
    const t = thinkingFor(HAIKU, 'medium', 16000)
    expect(t.effort).toEqual({})
    expect(t.thinking).toEqual({ type: 'enabled', budget_tokens: 5333 })
    expect(thinkingFor('claude-haiku-4-5', 'medium', 24000).thinking).toEqual({ type: 'enabled', budget_tokens: 6000 })
  })
})
