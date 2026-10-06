import { NextRequest, NextResponse, after } from 'next/server'
import { sessionSecret } from '@/lib/clientAuth'
import { clientsOnNumber } from '@/lib/clientCases'
import {
  asSignInLang,
  clientAddress,
  codeHash,
  connectionHash,
  decideCodeRequest,
  newCode,
  phoneHash,
  phoneKey,
  signInCodeText,
  usableForSignIn,
} from '@/lib/signInCode'
import { SignInStoreUnavailable, forgetOldRequests, recentRequests, recordRequest } from '@/lib/signInCodeStore'
import { isConfigured, sendSms } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store' }

/**
 * POST /api/clients/code  { phone, lang }
 *
 * Texts a six-digit code to the number, if the number is on file.
 *
 * The answer is the same whether it is or not — "if it is on file, a code is
 * on its way" — and the text itself is sent after the answer, so neither the
 * words nor the time taken say which numbers belong to clients. Only things
 * that do not depend on the number are said plainly: texting is not set up,
 * or this connection has asked too often.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const raw = String(body?.phone ?? '')
  if (!usableForSignIn(raw)) {
    return NextResponse.json({ error: 'phone' }, { status: 400, headers: noStore })
  }
  const key = sessionSecret()
  if (!key || !isConfigured()) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: noStore })
  }

  const number = phoneKey(raw)
  const numberHash = phoneHash(number, key)
  const ipHash = connectionHash(clientAddress(req.headers), key)

  try {
    const decision = decideCodeRequest(await recentRequests(numberHash, ipHash))
    if (decision === 'too-many-from-here') {
      await recordRequest({ phoneHash: numberHash, ipHash, codeHash: null })
      return NextResponse.json({ error: 'wait' }, { status: 429, headers: noStore })
    }

    const rows = decision === 'send' ? await clientsOnNumber(number) : []
    // Somebody who told the office to stop texting is not texted, even a
    // code. They can still call; the screen says so.
    const textable = rows.length > 0 && !rows.some(r => r.sms_opt_out)
    if (!textable) {
      await recordRequest({ phoneHash: numberHash, ipHash, codeHash: null })
      return NextResponse.json({ sent: true }, { headers: noStore })
    }

    const code = newCode()
    await recordRequest({ phoneHash: numberHash, ipHash, codeHash: codeHash(numberHash, code, key) })
    const lang = asSignInLang(body?.lang ?? rows[0]?.portal_lang)
    after(async () => {
      const sent = await sendSms(number, signInCodeText(lang, code))
      if (!sent.ok) console.error('sign-in code: the text did not go out')
      await forgetOldRequests()
    })
    return NextResponse.json({ sent: true }, { headers: noStore })
  } catch (err) {
    if (!(err instanceof SignInStoreUnavailable)) console.error('sign-in code request failed:', err)
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: noStore })
  }
}
