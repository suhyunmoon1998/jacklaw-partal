import { NextRequest } from 'next/server'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Who is allowed to read a client's file.
 *
 * This was a shared secret in an x-admin-key header, compared to ADMIN_PASSWORD
 * — and the panel that sent it is a browser application, so the secret was
 * compiled into the JavaScript served to anybody who loaded the page, and
 * committed to a public repository besides. A law office's entire client list,
 * every questionnaire answer and every case reading sat behind a password that
 * was published with the page that used it.
 *
 * So the password never reaches the browser now. It is posted once, to a login
 * route, which checks it here and hands back a signed cookie. The cookie is
 * HttpOnly — script cannot read it, so nothing can put it back into a bundle —
 * and it carries nothing but its own expiry and a signature over it.
 *
 * Signed with ADMIN_PASSWORD itself, which means changing the password ends
 * every session that was opened under the old one. That is the behaviour you
 * want from a rotation.
 */

export const ADMIN_COOKIE = 'jlp_admin_session'

/** Eight hours: a working day, and no more than one. */
const SESSION_MS = 8 * 60 * 60 * 1000

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/** `<expires-at>.<signature>` — no identity in it, because there is only one admin. */
export function mintAdminSession(secret: string): { value: string; maxAge: number } {
  const expires = Date.now() + SESSION_MS
  return {
    value: `${expires}.${sign(String(expires), secret)}`,
    maxAge: Math.floor(SESSION_MS / 1000),
  }
}

/** Constant-time, so a wrong signature cannot be found one character at a time. */
function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function validAdminSession(token: string | undefined, secret: string): boolean {
  if (!token || !secret) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const expires = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  if (!/^\d+$/.test(expires)) return false
  if (Number(expires) < Date.now()) return false
  return sameString(signature, sign(expires, secret))
}

/**
 * The shortest admin password the login accepts.
 *
 * The login has no attempt limit, by the owner's decision (see
 * app/api/admin/login), so the password's length is the whole lock. An earlier
 * admin key was seven characters and sat in this public repository; anything
 * that short can be guessed by trying. Eleanor's one-click sign-in does not use
 * the password, so the office is never locked out by this.
 */
export const ADMIN_PASSWORD_MIN_LENGTH = 16

/** True when a password is set but too short to sign in with. */
export function adminPasswordTooShort(): boolean {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return secret.length > 0 && secret.length < ADMIN_PASSWORD_MIN_LENGTH
}

/** A key that lives as long as the process, so both sides compare at one length. */
const COMPARE_KEY = randomBytes(32)
const digest = (s: string) => createHmac('sha256', COMPARE_KEY).update(s).digest()

/**
 * The password itself, checked in constant time — over keyed digests of both
 * sides, so not even its length shows in the time taken.
 *
 * Separate from the session so the login route is the only thing in the app
 * that ever compares it.
 */
export function correctAdminPassword(entered: string): boolean {
  const secret = process.env.ADMIN_PASSWORD
  if (!secret || !entered) return false
  if (secret.length < ADMIN_PASSWORD_MIN_LENGTH) return false
  return timingSafeEqual(digest(entered), digest(secret))
}

export function isAdmin(req: NextRequest): boolean {
  const secret = process.env.ADMIN_PASSWORD
  if (!secret) return false
  return validAdminSession(req.cookies.get(ADMIN_COOKIE)?.value, secret)
}
