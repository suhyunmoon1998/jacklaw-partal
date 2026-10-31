import { NextRequest, NextResponse } from 'next/server'
import { toLang } from '@/lib/langs'
import { isConfigured, sendSms } from '@/lib/twilio'
import { numberOptedOut } from '@/lib/numberOptOut'
import { phoneKey } from '@/lib/phoneNumber'
import { numberOnFile } from '@/lib/selfSignup'
import {
  clientAddress,
  codeHash,
  connectionHash,
  decideCodeRequest,
  newCode,
  phoneHash,
  signUpCodeText,
  usableForSignUp,
} from '@/lib/signUpCode'
import { forgetOldRequests, recentRequests, recordRequest } from '@/lib/signUpCodeStore'

/**
 * POST /api/clients/signup/code  { phone, lang }
 *
 * Texts a six-digit code to a number that is not on file, so its owner can
 * start on the portal (lib/signUpCode.ts). A number already on file is turned
 * back to the ordinary sign-in, which the sign-in page has already told them:
 * it looked the number up first.
 *
 * Every answer carries a `reason` the page shows in the client's language.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const phone = String(body?.phone ?? '')
  const lang = toLang(body?.lang)
  const fail = (status: number, reason: string) => NextResponse.json({ reason }, { status })

  if (!usableForSignUp(phone)) return fail(400, 'bad-number')
  const key = process.env.SESSION_SECRET ?? ''
  if (!key) return fail(500, 'not-configured')

  const onFile = await numberOnFile(phone)
  if (onFile === null) return fail(503, 'unavailable')
  if (onFile) return fail(409, 'on-file')

  if (!isConfigured()) return fail(503, 'texting-off')
  const stopped = await numberOptedOut(phone)
  if (stopped === null) return fail(503, 'unavailable')
  // Twilio refuses to text a number that replied STOP, so no code could arrive.
  if (stopped) return fail(409, 'opted-out')

  const numberHash = phoneHash(phone, key)
  const ipHash = connectionHash(clientAddress(req.headers), key)
  try {
    const decision = decideCodeRequest(await recentRequests(numberHash, ipHash))
    if (decision !== 'send') {
      // Counted even when refused, so hammering the button does not reset the wait.
      await recordRequest({ phoneHash: numberHash, ipHash, codeHash: null })
      return fail(429, 'too-many')
    }

    const code = newCode()
    // Recorded before it is texted: a text that arrives for a code the table
    // never kept would be a code that cannot work.
    await recordRequest({ phoneHash: numberHash, ipHash, codeHash: codeHash(numberHash, code, key) })
    const sent = await sendSms(phoneKey(phone), signUpCodeText(lang, code))
    void forgetOldRequests()
    if (!sent.ok) {
      console.error('sign-up code: text failed:', sent.error)
      return fail(502, 'text-failed')
    }
  } catch (err) {
    console.error('sign-up code:', err instanceof Error ? err.message : err)
    return fail(503, 'unavailable')
  }

  return NextResponse.json({ sent: true })
}
