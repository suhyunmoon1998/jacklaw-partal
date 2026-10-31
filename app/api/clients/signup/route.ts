import { NextRequest, NextResponse } from 'next/server'
import { toLang } from '@/lib/langs'
import { setClientCookie } from '@/lib/clientAuth'
import { origin } from '@/lib/assignmentInvite'
import { createSelfSignupClient, notifyFirmOfSelfSignup, numberOnFile } from '@/lib/selfSignup'
import { codeHash, phoneHash, readCode, readName, sameHash, usableForSignUp } from '@/lib/signUpCode'
import { consume, liveChallenge, takeAttempt } from '@/lib/signUpCodeStore'

/**
 * POST /api/clients/signup  { phone, code, name, lang }
 *
 * A new client, started by themselves: checks the code texted to their number
 * (app/api/clients/signup/code), makes their row with Step 1 open, signs this
 * browser in to it, and emails the office (lib/selfSignup.ts).
 *
 * Every refusal carries a `reason` the page shows in the client's language.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const phone = String(body?.phone ?? '')
  const lang = toLang(body?.lang)
  const fail = (status: number, reason: string) => NextResponse.json({ reason }, { status })

  if (!usableForSignUp(phone)) return fail(400, 'bad-number')
  const name = readName(body?.name)
  if (!name) return fail(400, 'bad-name')
  const code = readCode(body?.code)
  if (!code) return fail(400, 'wrong-code')
  const key = process.env.SESSION_SECRET ?? ''
  if (!key) return fail(500, 'not-configured')

  const numberHash = phoneHash(phone, key)
  try {
    const challenge = await liveChallenge(numberHash)
    if (!challenge) return fail(400, 'expired')
    // The attempt is taken before the comparison, so parallel guesses cannot
    // all be measured against the same count.
    const took = await takeAttempt(challenge)
    if (took === 'used-up') return fail(400, 'expired')
    if (took === 'raced') return fail(409, 'try-again')
    if (!sameHash(challenge.codeHash, codeHash(numberHash, code, key))) return fail(400, 'wrong-code')
    if (!(await consume(challenge))) return fail(409, 'try-again')
  } catch (err) {
    console.error('sign-up:', err instanceof Error ? err.message : err)
    return fail(503, 'unavailable')
  }

  // Asked again: the office may have added this number since the code went out.
  const onFile = await numberOnFile(phone)
  if (onFile === null) return fail(503, 'unavailable')
  if (onFile) return fail(409, 'on-file')

  let client
  try {
    client = await createSelfSignupClient({ name, phone, lang })
  } catch (err) {
    console.error('sign-up:', err instanceof Error ? err.message : err)
    return fail(500, 'unavailable')
  }

  const res = NextResponse.json({
    client: { id: client.id, name: client.name, case_type: client.case_type, portal_lang: client.portal_lang },
  })
  if (!setClientCookie(res, client.id)) return fail(500, 'not-configured')
  // Awaited: a function is frozen once it has answered, and an email still
  // being written then would never leave. It never throws.
  await notifyFirmOfSelfSignup(client, phone, origin(req))
  return res
}
