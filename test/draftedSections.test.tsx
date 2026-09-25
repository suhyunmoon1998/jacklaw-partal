// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DraftedSections from '@/components/admin/DraftedSections'
import { StoredDraft } from '@/lib/briefDraftShape'

const draft: StoredDraft = {
  kind: 'trial',
  sections: [
    {
      key: 'trial-intro',
      paragraphs: [
        {
          sentences: [
            { text: 'She took her meal at 5:00 p.m.', facts: ['f069'], authority: [], inference: false, problems: [] },
            { text: 'She is owed $9,999.', facts: ['f067'], authority: [], inference: false, problems: ['States $9,999, which is not a figure in the damages reading.'] },
          ],
        },
      ],
    },
  ],
  notWritten: [{ key: 'trial-conclusion', why: 'No claim has a supported element to conclude on.' }],
  basis: 'abc',
  model: 'claude-opus-5',
  writtenAt: '2026-09-24T12:00:00Z',
  counts: { sentences: 2, flagged: 1 },
}

describe('a draft on the page', () => {
  it('says it is a model draft, keeps a flagged sentence visible with its reason, and says why a section is missing', () => {
    render(<DraftedSections draft={draft} stale keys={['trial-intro', 'trial-conclusion']} />)
    expect(screen.getByText(/written by a model, not by the office/)).toBeTruthy()
    expect(screen.getByText('She is owed $9,999.')).toBeTruthy()
    expect(screen.getByText(/not a figure in the damages reading/)).toBeTruthy()
    expect(screen.getByText('No claim has a supported element to conclude on.')).toBeTruthy()
    expect(screen.getByText(/What this draft was written from has changed since/)).toBeTruthy()
  })

  it('offers to write only where the sheet passes a handler', () => {
    render(<DraftedSections draft={null} stale={false} keys={['factual-summary']} />)
    expect(screen.queryByText('Write a draft')).toBeNull()
  })
})
