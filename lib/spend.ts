/**
 * What a reading actually cost, counted rather than estimated.
 *
 * Every figure in this project's cost discussions so far has been an estimate
 * from wall-clock time and character counts, and estimates are how a bill
 * becomes a surprise. The provider reports exactly what each call used,
 * including what it read from cache rather than paid full rate for, and that
 * number is worth keeping beside the reading it bought.
 *
 * Cache reads are counted separately because they are the cheap ones. A
 * reading whose input is 90% cache read costs a fraction of one that is not,
 * and a total that lumps them together hides the difference — which is the
 * difference the office is trying to act on.
 */

export interface Spend {
  /** Full-rate input tokens. */
  in: number
  out: number
  /** Written to cache once, read cheaply after. */
  cacheWrite: number
  cacheRead: number
  calls: number
}

export const NOTHING: Spend = { in: 0, out: 0, cacheWrite: 0, cacheRead: 0, calls: 0 }

type Usage = {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

/** Collects what a sequence of calls used. Passed in rather than global. */
export class Meter {
  private total: Spend = { ...NOTHING }

  add(usage: unknown): void {
    const u = (usage ?? {}) as Usage
    this.total = {
      in: this.total.in + (u.input_tokens ?? 0),
      out: this.total.out + (u.output_tokens ?? 0),
      cacheWrite: this.total.cacheWrite + (u.cache_creation_input_tokens ?? 0),
      cacheRead: this.total.cacheRead + (u.cache_read_input_tokens ?? 0),
      calls: this.total.calls + 1,
    }
  }

  get spent(): Spend {
    return { ...this.total }
  }
}

export function addSpend(a: Spend, b: Spend): Spend {
  return {
    in: a.in + b.in,
    out: a.out + b.out,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    cacheRead: a.cacheRead + b.cacheRead,
    calls: a.calls + b.calls,
  }
}

/** Every stage's spend, added up. */
export function totalSpend(all: Partial<Record<string, Spend>>): Spend {
  return Object.values(all).reduce<Spend>((sum, s) => (s ? addSpend(sum, s) : sum), { ...NOTHING })
}

/**
 * What it cost, in a line.
 *
 * Cache reads are named rather than folded in, because they are the part the
 * office can do something about — a reading that is mostly cache read is
 * already cheap and a reading that is not has a prefix worth moving.
 */
export function describeSpend(s: Spend): string {
  const k = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n))
  const cached = s.cacheRead + s.cacheWrite + s.in
  const share = cached ? Math.round((s.cacheRead / cached) * 100) : 0
  return `${s.calls} call${s.calls === 1 ? '' : 's'} · ${k(s.in)} in, ${k(s.out)} out, ${k(s.cacheRead)} from cache (${share}%)`
}
