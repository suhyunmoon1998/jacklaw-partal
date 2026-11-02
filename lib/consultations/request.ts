import { z } from 'zod'
import { toLang } from '@/lib/langs'
import { phoneKey } from '@/lib/phoneNumber'
import { readName } from '@/lib/signUpCode'
import type { BookingRequest } from './store'

/**
 * The booking form, as it arrives from /book.
 *
 * Every refusal names the field, and the page says it in the client's
 * language. Stored normalised — lowercase address, ten digits — so the
 * per-person limit and the conflict check compare like with like.
 */

export type BookingField = 'start' | 'name' | 'email' | 'phone' | 'adverse' | 'ack'

const Email = z.string().trim().toLowerCase().max(254).pipe(z.email())

const clip = (value: unknown, max: number) =>
  String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max)

export function readBookingRequest(body: unknown): { request: BookingRequest } | { field: BookingField } | { bot: true } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>

  // A field no person can see. Whatever fills it gets a cheerful nothing.
  if (typeof b.website === 'string' && b.website.trim()) return { bot: true }

  const start = new Date(String(b.start ?? ''))
  if (Number.isNaN(start.getTime())) return { field: 'start' }

  const name = readName(b.name)
  if (!name) return { field: 'name' }

  const email = Email.safeParse(b.email)
  if (!email.success) return { field: 'email' }

  const phone = phoneKey(String(b.phone ?? ''))
  if (!/^[2-9]\d{9}$/.test(phone)) return { field: 'phone' }

  const adverseParty = clip(b.adverseParty, 200).replace(/\s+/g, ' ')
  if (adverseParty.length < 2) return { field: 'adverse' }

  if (b.ack !== true) return { field: 'ack' }

  return {
    request: {
      start,
      name,
      email: email.data,
      phone,
      lang: toLang(b.lang),
      adverseParty,
      otherParties: clip(b.otherParties, 500),
      summary: clip(b.summary, 1500),
    },
  }
}
