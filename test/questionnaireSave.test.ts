import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { wouldEraseAnswers } from '@/lib/answerGuard'

/*
 * What stands between a failed read and a client's answers.
 *
 * Answers are one record and every save replaces it whole. The read used to
 * answer a database error with a blank questionnaire, the page drew it, and one
 * second later its autosave would have written that blank over the file. The
 * database is in memory. Synthetic people only.
 */

type Row = Record<string, unknown>
let onFile: Row | null = null
let readError: { message: string } | null = null
let upserts: Row[] = []
let clockUpdates: { patch: Row; where: Row }[] = []

function from(table: string) {
  if (table === 'questionnaire_states') {
    return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: readError ? null : onFile, error: readError }) }) }),
      upsert: async (row: Row) => { upserts.push(row); return { error: null } },
    }
  }
  if (table === 'clients') {
    return {
      update: () => ({ eq: async () => ({ error: null }) }),
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { name: 'Test Client', case_type: 'Wage & Hour', portal_lang: 'en' }, error: null }) }) }),
    }
  }
  if (table === 'client_module_sends') {
    return {
      update: (patch: Row) => {
        const where: Row = {}
        const chain = {
          eq: (column: string, value: unknown) => { where[column] = value; return chain },
          is: (column: string, value: unknown) => { where[column] = value; return chain },
          then: (resolve: (value: unknown) => void) => { clockUpdates.push({ patch, where }); resolve({ error: null }) },
        }
        return chain
      },
    }
  }
  throw new Error(`unexpected table ${table}`)
}

vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({ from }) }))
vi.mock('@/lib/clientAuth', () => ({ denyClient: async () => null }))
vi.mock('@/lib/sendIntakeEmail', () => ({ sendIntakeNotificationEmails: vi.fn(async () => {}) }))
vi.mock('@/lib/damagesAuto', () => ({ claimModule2Submission: vi.fn(async () => 'again'), readDamagesWhileTimeAllows: vi.fn() }))

const { GET, POST } = await import('@/app/api/questionnaire/route')

const reading = () => GET(new NextRequest('http://portal.test/api/questionnaire?clientId=c1'))
const saving = (body: Row) =>
  POST(new NextRequest('http://portal.test/api/questionnaire', { method: 'POST', body: JSON.stringify({ clientId: 'c1', completedSections: [], ...body }) }))

const FULL = { answers: { full_name: 'Test Client', employer: 'Acme' }, submitted: true, m2_submitted: false }

beforeEach(() => {
  onFile = null
  readError = null
  upserts = []
  clockUpdates = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('reading the questionnaire', () => {
  it('reports a failed read as a failure, never as a blank questionnaire', async () => {
    readError = { message: 'connection lost' }
    const res = await reading()
    expect(res.status).toBe(500)
    expect((await res.json()).state).toBeUndefined()
  })

  it('still answers a client with no file yet with an empty one', async () => {
    const res = await reading()
    expect(res.status).toBe(200)
    expect((await res.json()).state.answers).toEqual({})
  })
})

describe('saving the questionnaire', () => {
  it('refuses a blank record over answers on file', async () => {
    onFile = FULL
    const res = await saving({ answers: {} })
    expect(res.status).toBe(409)
    expect(upserts).toEqual([])
  })

  it('refuses a save with no answers in it at all', async () => {
    onFile = FULL
    expect((await saving({})).status).toBe(409)
    expect(upserts).toEqual([])
  })

  it('writes nothing when it cannot see what it would replace', async () => {
    readError = { message: 'connection lost' }
    const res = await saving({ answers: { full_name: 'Test Client' } })
    expect(res.status).toBe(503)
    expect(upserts).toEqual([])
  })

  it('takes an ordinary save, and a first save of nothing on a new file', async () => {
    onFile = FULL
    expect((await saving({ answers: { full_name: 'Test Client', employer: 'Acme Inc' } })).status).toBe(200)
    expect(upserts).toHaveLength(1)
    onFile = null
    expect((await saving({ answers: {} })).status).toBe(200)
    expect(upserts).toHaveLength(2)
  })

  it('knows a blank from an answer', () => {
    expect(wouldEraseAnswers({ a: 1 }, {})).toBe(true)
    expect(wouldEraseAnswers({ a: 1 }, undefined)).toBe(true)
    expect(wouldEraseAnswers({ a: 1 }, { b: 2 })).toBe(false)
    expect(wouldEraseAnswers({}, {})).toBe(false)
    expect(wouldEraseAnswers(null, {})).toBe(false)
  })
})

describe('Step 2 handed over while Step 1 was unfinished', () => {
  it('counts from the moment Step 1 is submitted, unless they have been into it', async () => {
    onFile = { answers: { full_name: 'Test Client' }, submitted: false, m2_submitted: false }
    await saving({ answers: { full_name: 'Test Client' }, submitted: true })
    expect(clockUpdates).toHaveLength(1)
    expect(clockUpdates[0].where).toEqual({ client_id: 'c1', module_id: 'module2', opened_at: null })
    expect(clockUpdates[0].patch.sent_at).toEqual(expect.any(String))
  })

  it('is left alone by every other save', async () => {
    onFile = { answers: { full_name: 'Test Client' }, submitted: true, m2_submitted: false }
    await saving({ answers: { full_name: 'Test Client' }, submitted: true })
    onFile = { answers: { full_name: 'Test Client' }, submitted: false, m2_submitted: false }
    await saving({ answers: { full_name: 'Test Client' } })
    await saving({ answers: { full_name: 'Test Client' }, module: 'module2', submitted: false })
    expect(clockUpdates).toEqual([])
  })
})

describe('the pages that read it', () => {
  const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

  it('the questionnaire holds the screen and never autosaves on a failed read', () => {
    const page = read('components/ModuleQuestionnaire.tsx')
    expect(page).toMatch(/if \(!state \|\| modules\?\.ok !== true\) \{\s+setLoadFailed\(true\)\s+return/)
    expect(page).toMatch(/\.catch\(\(\) => setLoadFailed\(true\)\)/)
    // The autosave only runs once a step is set, and a failed read never sets one.
    expect(page).toMatch(/if \(!step \|\| \(step\.state !== 'open' && step\.state !== 'done'\)\) return/)
  })

  it('the dashboard does not draw a finished step as one still to do', () => {
    expect(read('app/dashboard/page.tsx')).toMatch(/modules\?\.ok !== true \|\| state\?\.error/)
  })
})
