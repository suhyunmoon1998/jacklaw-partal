import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { RECOMMENDED_BANKS, banksForCaseType } from '@/lib/recommendedQuestions'

// GET /api/admin/recommended-questions[?caseType=Wage%20%26%20Hour]
// Served from the server so the ~100 suggested questions never ship in the
// admin page's bundle; the editor fetches them only when the panel is opened.
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const caseType = req.nextUrl.searchParams.get('caseType')
  const banks = caseType ? banksForCaseType(caseType) : RECOMMENDED_BANKS

  return NextResponse.json({ banks })
}
