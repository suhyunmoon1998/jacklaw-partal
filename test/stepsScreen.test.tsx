/**
 * @vitest-environment jsdom
 *
 * The steps, drawn.
 *
 * A step's state is half send record and half progress, and the two arrive from
 * different requests. Every bug worth catching here is a frame painted from one
 * half: the locked screen flashing at a client who can open the questionnaire,
 * a "New" badge on a step submitted in July, or an empty portal because one
 * request had a bad second.
 *
 * So these tests resolve the two responses in both orders, and one of them
 * refuses to answer at all.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '@/app/dashboard/page'
import ModuleQuestionnaire from '@/components/ModuleQuestionnaire'
import { LanguageProvider } from '@/lib/i18n'

const replace = vi.fn()
const push = vi.fn()

/**
 * One router object, not a new one per call.
 *
 * Next's own useRouter is stable, and a screen that lists it in an effect's
 * dependencies is written against that. A mock that hands back a fresh object
 * every render re-runs the effect on every render, which is not a bug in the
 * screen — it is a bug in the mock, and it hid a real failure for an afternoon.
 */
const router = { replace, push, prefetch: vi.fn() }

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}))

const SESSION = {
  clientId: 'client-1788288408488',
  phone: '123123121',
  name: 'david0test',
  caseType: 'Wage & Hour',
  expiresAt: Date.now() + 86_400_000,
}

vi.mock('@/lib/auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  getSession: () => SESSION,
  addSubmissionNotification: vi.fn(),
}))

interface Responses {
  modules?: unknown
  questionnaire?: unknown
  documents?: unknown
  /** Milliseconds before each named response resolves, to force an order. */
  delay?: Partial<Record<'modules' | 'questionnaire' | 'documents', number>>
}

const opened: string[] = []

/**
 * A fetch that answers the three reads this screen makes, each after its own
 * delay, and records every read receipt written.
 */
function stubFetch(r: Responses) {
  const wait = <T,>(value: T, ms = 0) =>
    new Promise<T>(resolve => setTimeout(() => resolve(value), ms))

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = (value: unknown) => ({ ok: true, json: async () => value })

    if (url.startsWith('/api/modules/opened')) {
      opened.push(String(JSON.parse(String(init?.body ?? '{}')).moduleId))
      return body({ recorded: true })
    }
    if (url.startsWith('/api/modules')) {
      return wait(body(r.modules ?? { ok: true, sent: [], sends: [] }), r.delay?.modules)
    }
    if (url.startsWith('/api/questionnaire')) {
      return wait(body({ state: r.questionnaire ?? null }), r.delay?.questionnaire)
    }
    if (url.startsWith('/api/documents')) {
      return wait(body({ documents: r.documents ?? [] }), r.delay?.documents)
    }
    return body({})
  })
}

const draw = (node: React.ReactElement) => render(<LanguageProvider>{node}</LanguageProvider>)

const SENT_LONG_AGO = { moduleId: 'module1', sentAt: '2026-07-21T17:32:33Z', openedAt: '2026-07-21T17:32:33Z' }

/** A client who filled the intake in July and submitted it. */
const SUBMITTED = {
  answers: {},
  completedSections: Array.from({ length: 19 }, (_, i) => i),
  submitted: true,
  lastSaved: '2026-07-21T18:00:00Z',
  module2: { completedSections: [], submitted: false, lastSaved: '' },
}

beforeEach(() => {
  opened.length = 0
  replace.mockClear()
  push.mockClear()
  localStorage.clear()
})

afterEach(cleanup)

describe('a client who submitted their intake weeks ago', () => {
  const responses: Responses = {
    modules: { ok: true, sent: ['module1'], sends: [SENT_LONG_AGO] },
    questionnaire: SUBMITTED,
  }

  for (const [order, delay] of [
    ['sends first', { questionnaire: 20 }],
    ['progress first', { modules: 20 }],
  ] as const) {
    it(`is never shown a "New" badge, whichever half arrives first (${order})`, async () => {
      vi.stubGlobal('fetch', stubFetch({ ...responses, delay }))
      draw(<DashboardPage />)

      // Watch every frame from the shimmer to the finished screen. The bug this
      // catches does not survive to the end — it is one render deep.
      const badged: boolean[] = []
      const actionable: boolean[] = []
      await waitFor(() => {
        badged.push(screen.queryByText('New') !== null)
        actionable.push(screen.queryByText('Start') !== null)
        expect(screen.getByText('Completed')).toBeTruthy()
      })

      // Step 2 legitimately reads "Not sent yet" throughout — that is the road
      // ahead, and showing it is the point. What must never appear is this
      // client's own submitted Step 1 offered back to them as unstarted work.
      expect(badged).not.toContain(true)
      expect(actionable).not.toContain(true)
      expect(screen.getByText('Not sent yet')).toBeTruthy()
    })
  }

  it('says they are all caught up rather than leaving a dead screen', async () => {
    vi.stubGlobal('fetch', stubFetch(responses))
    draw(<DashboardPage />)
    await waitFor(() => expect(screen.getByText("You're all caught up.")).toBeTruthy())
    expect(screen.getByText('✓ All caught up')).toBeTruthy()
  })

  it('does not advertise a Step 3 that has no questions', async () => {
    vi.stubGlobal('fetch', stubFetch(responses))
    draw(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('Completed')).toBeTruthy())
    expect(screen.queryByText('People at work')).toBeNull()
  })
})

describe('a step that just arrived', () => {
  it('is announced, and only while it is genuinely unopened', async () => {
    vi.stubGlobal('fetch', stubFetch({
      modules: {
        ok: true,
        sent: ['module1'],
        sends: [{ moduleId: 'module1', sentAt: '2026-09-05T17:50:23Z', openedAt: null }],
      },
      questionnaire: null,
    }))
    draw(<DashboardPage />)

    await waitFor(() => expect(screen.getByText('Our office sent you a new step.')).toBeTruthy())
    expect(screen.getByText('New')).toBeTruthy()
    expect(screen.getByText('Step 1 · Your information')).toBeTruthy()
  })
})

describe('when the send record cannot be read', () => {
  it('holds the screen instead of reporting that nothing was sent', async () => {
    // The failure that would otherwise lock all sixteen clients out of every
    // questionnaire at once: an empty list and a failed query look identical.
    vi.stubGlobal('fetch', stubFetch({
      modules: { ok: false, sent: [], sends: [] },
      questionnaire: SUBMITTED,
    }))
    draw(<DashboardPage />)

    await waitFor(() => expect(screen.getByText('Try now')).toBeTruthy())
    expect(screen.queryByText('Not sent yet')).toBeNull()
    expect(screen.queryByText('Your steps')).toBeNull()
  })
})

describe('a questionnaire the client cannot open yet', () => {
  const blocked: Responses = {
    modules: {
      ok: true,
      sent: ['module1', 'module2'],
      sends: [
        { moduleId: 'module1', sentAt: '2026-09-01T10:00:00Z', openedAt: '2026-09-01T10:30:00Z' },
        { moduleId: 'module2', sentAt: '2026-09-05T10:00:00Z', openedAt: null },
      ],
    },
    questionnaire: {
      answers: {},
      completedSections: [0, 1],
      submitted: false,
      lastSaved: '',
      module2: { completedSections: [], submitted: false, lastSaved: '' },
    },
  }

  it('explains itself as the software waiting, not the client failing', async () => {
    vi.stubGlobal('fetch', stubFetch(blocked))
    draw(<ModuleQuestionnaire moduleId="module2" subtitle="Pay & Breaks" />)

    await waitFor(() => expect(screen.getByText('Opens when you finish Step 1')).toBeTruthy())
    expect(screen.getByText(/These questions build on your answers in Step 1/)).toBeTruthy()
  })

  it('offers a way forward, never a wall and a Back button', async () => {
    vi.stubGlobal('fetch', stubFetch(blocked))
    draw(<ModuleQuestionnaire moduleId="module2" subtitle="Pay & Breaks" />)

    await waitFor(() => expect(screen.getByText('Continue Step 1')).toBeTruthy())
    screen.getByText('Continue Step 1').click()
    expect(push).toHaveBeenCalledWith('/questionnaire')
  })

  it('is not recorded as opened — the client met a closed door', async () => {
    vi.stubGlobal('fetch', stubFetch(blocked))
    draw(<ModuleQuestionnaire moduleId="module2" subtitle="Pay & Breaks" />)

    await waitFor(() => expect(screen.getByText('Opens when you finish Step 1')).toBeTruthy())
    expect(opened).not.toContain('module2')
  })

  it('records the opening of a step they really can open', async () => {
    vi.stubGlobal('fetch', stubFetch(blocked))
    draw(<ModuleQuestionnaire moduleId="module1" subtitle="Questionnaire" />)

    await waitFor(() => expect(opened).toContain('module1'))
  })
})
