/**
 * Signing a client in with a code texted to the number on file.
 *
 * Signing in used to be a phone number and nothing else. Anyone who knew a
 * client's number — the employer being sued usually does — could read every
 * answer, open every document, overwrite the questionnaire and delete uploaded
 * evidence for good. The number is not a secret; holding the phone it rings is
 * closer to one. So the portal texts a six-digit code to the number on file
 * and lets nothing be read until it comes back.
 *
 * Pure: everything here can be tested without a database or a phone. The
 * table is lib/signInCodeStore.ts; the routes are app/api/clients/code.
 *
 * What is stored is never the number or the code. A number is kept as a keyed
 * hash, so the table can count requests per number without holding numbers
 * people typed in (including numbers that are not clients at all); a code is
 * kept as a keyed hash over the number's hash and the code, so a read of the
 * table cannot sign anyone in.
 */

import { createHmac, randomInt, timingSafeEqual } from 'crypto'

export type SignInLang = 'en' | 'es' | 'zh' | 'ko'

/** How long a code works. Long enough to switch to the messages app and back. */
export const CODE_TTL_MS = 10 * 60 * 1000

/** Wrong codes allowed against one texted code before a new one is needed. */
export const MAX_ATTEMPTS = 5

/** Codes texted to one number: at most this many in 15 minutes, and per day. */
export const PER_NUMBER_15_MIN = 3
export const PER_NUMBER_DAY = 10

/** Requests from one connection in an hour, whatever numbers they name. */
export const PER_CONNECTION_HOUR = 10

/** How long the step between the code and choosing a case lasts. */
export const VERIFIED_PHONE_TTL_MS = 15 * 60 * 1000

/**
 * The number as the clients table keys it: digits, and a US number without
 * its leading 1, because rows were typed by hand over months as 3105550000,
 * 13105550000 and +13105550000 alike.
 */
export function phoneKey(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
}

/** Every way the clients table may have this number written. */
export function phoneVariants(key: string): string[] {
  return key.length === 10 ? [key, `1${key}`, `+1${key}`] : [key]
}

/** A number a code can be texted to. Shorter than ten digits is a typo. */
export function usableForSignIn(raw: string): boolean {
  return phoneKey(raw).length >= 10 && phoneKey(raw).length <= 15
}

function hmacHex(key: string, text: string): string {
  return createHmac('sha256', key).update(text).digest('hex')
}

/** The number, as the table may hold it: never the number itself. */
export function phoneHash(phone: string, key: string): string {
  return hmacHex(key, `sign-in-phone:${phoneKey(phone)}`)
}

/** The connection, likewise. */
export function connectionHash(ip: string, key: string): string {
  return hmacHex(key, `sign-in-ip:${ip.trim() || 'unknown'}`)
}

/** What a texted code is kept as. Bound to the number it was sent to. */
export function codeHash(phoneHashValue: string, code: string, key: string): string {
  return hmacHex(key, `sign-in-code:${phoneHashValue}:${code}`)
}

/** Six digits, each one from the system's random source. */
export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** A code as typed: digits only, spaces and dashes forgiven. */
export function readCode(raw: unknown): string | null {
  const code = String(raw ?? '').replace(/[\s-]/g, '')
  return /^\d{6}$/.test(code) ? code : null
}

/** Compared in constant time, so a code cannot be found one digit at a time. */
export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * The text that carries the code, written by hand in each language.
 *
 * The firm's name first, so it reads as the office and not as a stranger; the
 * expiry; and what to do if the person did not ask for it — a code arriving
 * unasked is how someone learns another person has their number.
 */
export function signInCodeText(lang: SignInLang, code: string): string {
  switch (lang) {
    case 'es':
      return `866 JACK LAW: su código para entrar al portal es ${code}. Vence en 10 minutos. Si usted no lo pidió, ignore este mensaje.`
    case 'zh':
      return `866 JACK LAW：您的门户登录验证码是 ${code}，10 分钟内有效。如果不是您本人申请，请忽略此短信。`
    case 'ko':
      return `866 JACK LAW: 포털 로그인 인증번호는 ${code}입니다. 10분 후 만료됩니다. 직접 요청하지 않으셨다면 이 문자를 무시하세요.`
    default:
      return `866 JACK LAW: your portal sign-in code is ${code}. It expires in 10 minutes. If you did not ask for it, ignore this text.`
  }
}

export const asSignInLang = (value: unknown): SignInLang =>
  value === 'es' || value === 'zh' || value === 'ko' ? value : 'en'

/**
 * Whether to text a code, given what this number and this connection have
 * asked for lately.
 *
 * A number past its allowance is not told so — the answer stays "if it is on
 * file, a code is on its way" — because a different answer for a number on
 * file would say which numbers are clients. A connection past its allowance is
 * told, because that does not depend on any number.
 */
export function decideCodeRequest(counts: {
  number15Min: number
  numberDay: number
  connectionHour: number
}): 'send' | 'quietly-skip' | 'too-many-from-here' {
  if (counts.connectionHour >= PER_CONNECTION_HOUR) return 'too-many-from-here'
  if (counts.number15Min >= PER_NUMBER_15_MIN || counts.numberDay >= PER_NUMBER_DAY) return 'quietly-skip'
  return 'send'
}

/**
 * The first address in X-Forwarded-For. Vercel writes that header itself, so
 * the first entry is the connection it saw, not something the caller chose.
 */
export function clientAddress(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get('x-forwarded-for') ?? ''
  return forwarded.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim() || ''
}
