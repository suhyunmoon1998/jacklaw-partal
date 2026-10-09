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

/**
 * The ten digits someone is typing into the sign-in box, as they type.
 *
 * North American area codes never begin with 1, so a leading 1 is always the
 * country code — typed out of habit, or filled in by the phone as +1. Kept, it
 * shifted every digit one place and the box, which holds ten, cut off the last:
 * Flora Sanchez-Adame typed 1 331 472 9573 and the portal looked for
 * (133) 147-2957, told her twice it could not find her file, and she gave up
 * (2026-10-05, 10-06).
 */
export function typedPhoneDigits(raw: string): string {
  let digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('1')) digits = digits.slice(1)
  return digits.slice(0, 10)
}
