/**
 * A client's number, the way the clients table holds it.
 *
 * Rows were typed by hand over months as 3105550000, 13105550000 and
 * +13105550000 alike, so a number is compared by its key — digits, and a US
 * number without its leading 1 — and looked up in every form a row may have.
 * Used by signing in, by opt-outs and by the texts the portal sends.
 */

/** Digits, and a US number without its leading 1. */
export function phoneKey(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
}

/** Every way the clients table may have this number written. */
export function phoneVariants(key: string): string[] {
  return key.length === 10 ? [key, `1${key}`, `+1${key}`] : [key]
}
