import { NextRequest, NextResponse } from 'next/server'
import { sessionSecret, setClientCookie, setVerifiedPhoneCookie } from '@/lib/clientAuth'
import { caseChoices, clientsOnNumber } from '@/lib/clientCases'
import { MAX_ATTEMPTS, codeHash, phoneHash, phoneKey, readCode, sameHash, usableForSignIn } from '@/lib/signInCode'
import { SignInStoreUnavailable, consume, liveChallenge, takeAttempt } from '@/lib/signInCodeStore'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store' }
const refuse = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: noStore })

/**
 * POST /api/clients/code/verify  { phone, code }
 *
 * The code texted to the number, checked here and nowhere else. Five wrong
 * tries use a code up; each try is counted before it is compared, so tries
 * sent in parallel are counted too.
 *
 * Right, it proves this browser holds the number: the cases on it are listed
 * for the first time, and with one case the client is signed straight in.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const raw = String(body?.phone ?? '')
  const code = readCode(body?.code)
  if (!usableForSignIn(raw) || !code) return refuse('code_invalid')
  const key = sessionSecret()
  if (!key) return refuse('unavailable', 503)

  const number = phoneKey(raw)
  const numberHash = phoneHash(number, key)

  try {
    const challenge = await liveChallenge(numberHash)
    if (!challenge) return refuse('code_invalid')
    const attempt = await takeAttempt(challenge)
    if (attempt === 'used-up') return refuse('code_too_many')
    if (attempt === 'raced') return refuse('code_invalid')
    if (!sameHash(codeHash(numberHash, code, key), challenge.codeHash)) {
      return refuse(challenge.attempts + 1 >= MAX_ATTEMPTS ? 'code_too_many' : 'code_invalid')
    }
    if (!(await consume(challenge))) return refuse('code_invalid')

    const rows = await clientsOnNumber(number)
    if (!rows.length) return refuse('not_found', 404)
    const cases = await caseChoices(rows)

    const res =
      cases.length === 1
        ? NextResponse.json(
            { signedIn: { id: cases[0].id, name: cases[0].name, case_type: cases[0].case_type } },
            { headers: noStore }
          )
        : NextResponse.json({ cases }, { headers: noStore })
    if (!setVerifiedPhoneCookie(res, number)) return refuse('unavailable', 503)
    if (cases.length === 1 && !setClientCookie(res, cases[0].id, rows[0].phone)) return refuse('unavailable', 503)
    return res
  } catch (err) {
    if (!(err instanceof SignInStoreUnavailable)) console.error('sign-in code check failed:', err)
    return refuse('unavailable', 503)
  }
}
