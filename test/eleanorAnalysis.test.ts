import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

/*
 * Eleanor running a stage of the damages reading (app/api/eleanor/analysis):
 * only Eleanor's server is let in, only a known stage is run, and it runs
 * through the very same code as the admin panel's Run.
 */

const runs: [string, string][] = []
vi.mock('@/lib/analysisRun', () => ({
  runAnalysisStage: vi.fn(async (clientId: string, stage: string) => {
    runs.push([clientId, stage])
    return NextResponse.json({ ok: true, nextStage: null })
  }),
}))

import { POST } from '@/app/api/eleanor/analysis/route'

const secret = 'x'.repeat(40)
const request = (body: unknown, auth: string | null = `Bearer ${secret}`) =>
  new NextRequest('https://portal.test/api/eleanor/analysis', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(body),
  })

describe('Eleanor running a damages reading stage', () => {
  beforeEach(() => {
    runs.length = 0
    process.env.ELEANOR_PORTAL_SERVICE_SECRET = secret
  })

  it('lets in only the holder of the service secret', async () => {
    expect((await POST(request({ clientId: 'c1', stage: 'inputs' }, null))).status).toBe(401)
    expect((await POST(request({ clientId: 'c1', stage: 'inputs' }, 'Bearer wrong'))).status).toBe(401)
    process.env.ELEANOR_PORTAL_SERVICE_SECRET = 'short'
    expect((await POST(request({ clientId: 'c1', stage: 'inputs' }))).status).toBe(401)
    expect(runs).toHaveLength(0)
  })

  it('runs one known stage for one client, through the shared runner', async () => {
    expect((await POST(request({ clientId: 'c1', stage: 'sideways' }))).status).toBe(400)
    expect((await POST(request({ clientId: '../etc', stage: 'inputs' }))).status).toBe(400)
    const ok = await POST(request({ clientId: 'client-17', stage: 'inputs' }))
    expect(ok.status).toBe(200)
    expect(ok.headers.get('cache-control')).toBe('no-store')
    expect(runs).toEqual([['client-17', 'inputs']])
  })
})
