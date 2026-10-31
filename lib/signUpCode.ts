/**
 * A new client starting on the portal by themselves, proved by a code texted
 * to the number they gave.
 *
 * The office used to add every client by hand before that person could get
 * in. From 2026-10-30 someone the office has never heard from can type their
 * own number and begin Step 1. The code is what keeps that from being a way to
 * open a file under somebody else's number, or to fill the client list with
 * rows nobody can reach: the number has to ring a phone the person is holding.
 *
 * Only new numbers are asked for a code. A number already on file signs in as
 * it does today, by the number alone — the owner's decision of 2026-10-06 for
 * while the portal is tested, which this does not reopen.
 *
 * Pure: everything here can be tested without a database or a phone. The
 * table is lib/signUpCodeStore.ts; the routes are app/api/clients/signup.
 * Adapted from the sign-in code taken out on 2026-10-06 (commit 785eb0a).
 *
 * What is stored is never the number or the code, only keyed hashes of them,
 * so a read of the table cannot start anyone's file.
 */

import { createHmac, randomInt, timingSafeEqual } from 'crypto'
import { Lang } from '@/lib/langs'
import { phoneKey } from '@/lib/phoneNumber'

/** How long a code works. Long enough to switch to the messages app and back. */
export const CODE_TTL_MS = 10 * 60 * 1000

/** Wrong codes allowed against one texted code before a new one is needed. */
export const MAX_ATTEMPTS = 5

/** Codes texted to one number: at most this many in 15 minutes, and per day. */
export const PER_NUMBER_15_MIN = 3
export const PER_NUMBER_DAY = 10

/** Requests from one connection in an hour, whatever numbers they name. */
export const PER_CONNECTION_HOUR = 10

/**
 * A number a code can be texted to: ten digits, North American.
 *
 * The office texts from a US number and its clients are in California; a
 * longer number is a typo or a texting-fraud attempt, and each code costs the
 * firm a message.
 */
export function usableForSignUp(raw: string): boolean {
  return /^[2-9]\d{9}$/.test(phoneKey(raw))
}

function hmacHex(key: string, text: string): string {
  return createHmac('sha256', key).update(text).digest('hex')
}

/** The number, as the table may hold it: never the number itself. */
export function phoneHash(phone: string, key: string): string {
  return hmacHex(key, `sign-up-phone:${phoneKey(phone)}`)
}

/** The connection, likewise. */
export function connectionHash(ip: string, key: string): string {
  return hmacHex(key, `sign-up-ip:${ip.trim() || 'unknown'}`)
}

/** What a texted code is kept as. Bound to the number it was sent to. */
export function codeHash(phoneHashValue: string, code: string, key: string): string {
  return hmacHex(key, `sign-up-code:${phoneHashValue}:${code}`)
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
 * The name as the client typed it, tidied: spaces collapsed, and between two
 * and a hundred characters. Null for anything else, so the office never gets a
 * row called "a" or a pasted paragraph.
 */
export function readName(raw: unknown): string | null {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim()
  return name.length >= 2 && name.length <= 100 ? name : null
}

/**
 * The text that carries the code, written by hand in each language.
 *
 * The firm's name first, so it reads as the office and not as a stranger; the
 * expiry; and what to do if the person did not ask for it — a code arriving
 * unasked is how someone learns another person has their number.
 */
export function signUpCodeText(lang: Lang, code: string): string {
  switch (lang) {
    case 'es':
      return `866 JACK LAW: su código para comenzar en el portal es ${code}. Vence en 10 minutos. Si usted no lo pidió, ignore este mensaje.`
    case 'zh':
      return `866 JACK LAW：您开始使用门户的验证码是 ${code}，10 分钟内有效。如果不是您本人申请，请忽略此短信。`
    case 'ko':
      return `866 JACK LAW: 포털 시작 인증번호는 ${code}입니다. 10분 후 만료됩니다. 직접 요청하지 않으셨다면 이 문자를 무시하세요.`
    default:
      return `866 JACK LAW: your code to get started on our portal is ${code}. It expires in 10 minutes. If you did not ask for it, ignore this text.`
  }
}

/** Whether to text a code, given what this number and this connection have asked for lately. */
export function decideCodeRequest(counts: {
  number15Min: number
  numberDay: number
  connectionHour: number
}): 'send' | 'too-many-for-number' | 'too-many-from-here' {
  if (counts.connectionHour >= PER_CONNECTION_HOUR) return 'too-many-from-here'
  if (counts.number15Min >= PER_NUMBER_15_MIN || counts.numberDay >= PER_NUMBER_DAY) return 'too-many-for-number'
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
