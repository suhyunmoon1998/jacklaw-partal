import { describe, expect, it } from 'vitest'
import { EVERYONE, PER_IP, judge } from '@/lib/loginThrottle'

const now = Date.parse('2026-09-25T20:00:00Z')
const minsAgo = (m: number) => now - m * 60_000

describe('judge', () => {
  it('lets a person who mistyped a few times keep trying', () => {
    const v = judge(now, { count: PER_IP.failures - 1, oldest: minsAgo(5) }, { count: 20, oldest: minsAgo(30) })
    expect(v.allowed).toBe(true)
  })

  it('shuts one connection that has guessed too often, until its oldest guess ages out', () => {
    const v = judge(now, { count: PER_IP.failures, oldest: minsAgo(5) }, { count: PER_IP.failures, oldest: minsAgo(5) })
    expect(v).toEqual({ allowed: false, retryInMinutes: PER_IP.minutes - 5, by: 'connection' })
  })

  it('shuts everyone when many connections share the guessing', () => {
    const v = judge(now, { count: 1, oldest: minsAgo(2) }, { count: EVERYONE.failures, oldest: minsAgo(50) })
    expect(v).toEqual({ allowed: false, retryInMinutes: EVERYONE.minutes - 50, by: 'everyone' })
  })

  it('never says to wait less than a minute', () => {
    const v = judge(now, { count: PER_IP.failures, oldest: minsAgo(PER_IP.minutes) + 1000 }, { count: 0, oldest: null })
    expect(v.retryInMinutes).toBe(1)
  })
})
