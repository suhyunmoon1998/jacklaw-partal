// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CaseReading from '@/components/admin/CaseReading'

/*
 * The box an attorney uses when the reading could not settle a Wage Order.
 * The server is a fake. Synthetic people only.
 */

const PROBLEM = 'No Wage Order was proposed, because the facts on file do not settle which one governs this employer.'
const proposal = {
  order: '',
  industry: '',
  businessIs: '',
  reliedOn: '',
  because: 'The facts do not say what the business does.',
  whatWouldSettleIt: 'Did customers eat there, or take goods away?',
}

let answer: Record<string, unknown>
let patches: unknown[] = []

beforeEach(() => {
  patches = []
  answer = {
    reading: { wageOrder: { proposal, dlse: null, caveat: '', confirmed: false } },
    stale: false,
    staleStages: [],
    next: null,
    facts: 87,
    orderProblem: PROBLEM,
    updatedAt: null,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') patches.push(JSON.parse(String(init.body)))
      return new Response(JSON.stringify(answer), { status: 200 })
    })
  )
  vi.stubGlobal('confirm', vi.fn(() => true))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('the Wage Order box', () => {
  it('says what is missing, and the only way forward is a person', async () => {
    render(<CaseReading clientId="c1" clientName="Synthetic Client" />)
    expect(await screen.findByText(PROBLEM)).toBeTruthy()
    expect(screen.getByText('Did customers eat there, or take goods away?')).toBeTruthy()
    const read = screen.getByRole('button', { name: 'Waiting on the Wage Order' }) as HTMLButtonElement
    expect(read.disabled).toBe(true)
    expect(screen.getAllByRole('option')).toHaveLength(18)
  })

  it('saves the Order chosen, after saying what it costs', async () => {
    render(<CaseReading clientId="c1" clientName="Synthetic Client" />)
    const use = (await screen.findByRole('button', { name: 'Use this Order' })) as HTMLButtonElement
    expect(use.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Wage Order'), { target: { value: '7' } })
    fireEvent.click(use)
    await waitFor(() => expect(patches).toEqual([{ order: '7' }]))
    expect(vi.mocked(window.confirm).mock.calls[0][0]).toMatch(/Wage Order 7 \(Mercantile\).*\$1\.65/)
  })

  it('saves nothing when the question is declined', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    render(<CaseReading clientId="c1" clientName="Synthetic Client" />)
    const use = await screen.findByRole('button', { name: 'Use this Order' })
    fireEvent.change(screen.getByLabelText('Wage Order'), { target: { value: '7' } })
    fireEvent.click(use)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(patches).toEqual([])
  })

  it('shows an attorney’s choice, with what the reading said, and lets it be taken back', async () => {
    answer = {
      ...answer,
      reading: {
        wageOrder: {
          proposal: { ...proposal, order: '7' },
          dlse: null,
          caveat: '',
          confirmed: true,
          chosen: { at: '2026-11-04T12:00:00Z', modelSaid: '' },
        },
      },
      next: 'claims 1',
      orderProblem: '',
    }
    render(<CaseReading clientId="c1" clientName="Synthetic Client" />)
    expect(await screen.findByText(/Wage Order 7 \(Mercantile\), chosen by an attorney/)).toBeTruthy()
    expect(screen.getByText(/had proposed no Order/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Use this Order' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Read the case' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Take back' }))
    await waitFor(() => expect(patches).toEqual([{ order: '' }]))
  })
})
