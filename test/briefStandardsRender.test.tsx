// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FactualDocument from '@/components/admin/FactualDocument'
import BriefDocument from '@/components/admin/BriefDocument'
import { LedgerFact, buildFactualBrief } from '@/lib/factualBrief'
import { byTemplate } from '@/lib/factualTemplate'
import { buildBrief } from '@/lib/caseBrief'
import { trialReadiness } from '@/lib/trialReadiness'
import { FACTUAL_TEMPLATE } from '@/lib/briefStandards'

const fact = (id: string): LedgerFact => ({
  id: `client-1:${id}`,
  proposition: 'She took no meal break on most days.',
  verbatim: 'I never got my lunch',
  status: 'REPORTED',
  provenance: { kind: 'portal answer', pinpoint: 'module2 q41', on: '2026-09-16' },
  legalTags: ['meal periods'],
})

describe('the sheets, drawn', () => {
  it('draws the factual sheet under the template’s twelve numbered headings, in order', () => {
    const ledger = [fact('f001'), fact('f002'), fact('f003')]
    const brief = buildFactualBrief({ clientName: 'Dayeon Kim', caseType: 'Wage & Hour', ledger, spine: null, readOn: null })
    const view = byTemplate({ brief, ledger, baseline: [], spine: null })
    render(<FactualDocument brief={brief} view={view} ledger={ledger} />)

    const headings = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)
    expect(headings).toEqual(FACTUAL_TEMPLATE.sections.map(s => `${s.n}. ${s.title}`))
    expect(screen.getByText('ISSUE: meal periods')).toBeTruthy()
    expect(screen.getByText('No filing is recorded in the portal.')).toBeTruthy()
  })

  it('draws the trial-readiness section on the case brief, saying it is not a trial brief', () => {
    const brief = buildBrief({
      clientName: 'Dayeon Kim',
      caseType: 'Wage & Hour',
      analysis: null,
      findings: [],
      wageOrder: null,
      spine: null,
      pendingQuestions: [],
      factCount: 1,
      readOn: null,
      stale: false,
      staleStages: [],
    })
    const readiness = trialReadiness(brief, [fact('f001')], [])
    render(<BriefDocument brief={brief} readiness={readiness} versions={[]} />)
    expect(screen.getByText(/how far from a trial brief/)).toBeTruthy()
    expect(screen.getByText(/^Not a trial brief\./)).toBeTruthy()
    expect(screen.getByText('XIII. Final Trial-Brief Quality Control')).toBeTruthy()
  })
})
