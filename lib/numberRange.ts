/**
 * An estimate a worker gives as a best guess with a floor and a ceiling.
 *
 * "About how many unpaid minutes did it take?" has no single honest answer.
 * Asked for one number a worker either invents precision or leaves it blank, so
 * the question takes three: the number that feels right, and the smallest and
 * largest that still would. Staff-side calculations can then work with a range
 * instead of a guess presented as a fact.
 *
 * Stored as one readable string — `best=20; low=15; high=30` — rather than three
 * answers, because the packet asks for one question here and because a person
 * reading the case file or the printed PDF should not need this module to make
 * sense of it. Any part may be missing.
 */

export interface NumberRange {
  best?: number
  low?: number
  high?: number
}

const PART = /(best|low|high)\s*=\s*(-?\d+(?:\.\d+)?)/gi

export function parseNumberRange(value: unknown): NumberRange {
  if (typeof value !== 'string') return {}
  const out: NumberRange = {}
  let match: RegExpExecArray | null
  PART.lastIndex = 0
  while ((match = PART.exec(value)) !== null) {
    const n = Number(match[2])
    if (Number.isFinite(n)) out[match[1].toLowerCase() as keyof NumberRange] = n
  }
  return out
}

export function formatNumberRange(range: NumberRange): string {
  const parts: string[] = []
  if (range.best !== undefined) parts.push(`best=${range.best}`)
  if (range.low !== undefined) parts.push(`low=${range.low}`)
  if (range.high !== undefined) parts.push(`high=${range.high}`)
  return parts.join('; ')
}

/** Replaces one part, leaving the others as they were. */
export function withPart(value: unknown, part: keyof NumberRange, raw: string): string {
  const range = parseNumberRange(value)
  const n = raw.trim() === '' ? undefined : Number(raw)
  range[part] = n !== undefined && Number.isFinite(n) ? n : undefined
  return formatNumberRange(range)
}
