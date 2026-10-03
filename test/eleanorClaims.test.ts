import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/eleanor/claims/route'
import { CLAIMS, FEHA_CLAIMS } from '@/lib/authority/claims'

const SECRET = 'x'.repeat(40)

describe('the claim catalog Eleanor labels readings with', () => {
  it('is refused without the service secret', async () => {
    process.env.ELEANOR_PORTAL_SERVICE_SECRET = SECRET
    const res = await GET(new NextRequest('https://portal.example/api/eleanor/claims'))
    expect(res.status).toBe(401)
  })

  it('is the hand-written catalog, as written', async () => {
    process.env.ELEANOR_PORTAL_SERVICE_SECRET = SECRET
    const res = await GET(new NextRequest('https://portal.example/api/eleanor/claims', { headers: { authorization: `Bearer ${SECRET}` } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.claims.map((c: { id: string }) => c.id)).toEqual([...CLAIMS, ...FEHA_CLAIMS].map(c => c.id))
    expect(body.claims.some((c: { id: string }) => c.id.startsWith('feha-'))).toBe(true)
    const meal = body.claims.find((c: { id: string }) => c.id === 'meal-periods')
    expect(meal.name).toBe('Meal periods')
    expect(meal.sections).toContain('LAB 512')
  })
})
