import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { getAssignmentDetail } from '@/lib/questionSets'
import { generateAnswersPdf } from '@/lib/generateAnswersPdf'
import { formatPhone } from '@/lib/auth'

// GET /api/admin/assignments/[id]/pdf — that one assignment's answers, as a PDF.
// Same generator and layout the default intake download already uses.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assignment = await getAssignmentDetail(params.id)
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: client } = await getSupabase()
    .from('clients')
    .select('name, phone, case_type')
    .eq('id', assignment.clientId)
    .maybeSingle()

  const pdf = await generateAnswersPdf(
    client?.name ?? assignment.clientName,
    client?.case_type ?? '',
    formatPhone(client?.phone ?? ''),
    assignment.answers,
    {
      // One flat section: a question set has no chapter structure of its own.
      sections: [{ id: assignment.questionSetId, title: assignment.questionSetName, questions: assignment.questions }],
      title: assignment.questionSetName,
    }
  )

  const safeName = (client?.name ?? 'client').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')
  const safeSet = assignment.questionSetName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName || 'client'}-${safeSet || 'question-set'}.pdf"`,
    },
  })
}
