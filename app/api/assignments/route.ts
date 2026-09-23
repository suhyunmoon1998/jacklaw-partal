import { NextRequest, NextResponse } from 'next/server'
import { listAssignments } from '@/lib/questionSets'
import { denyClient } from '@/lib/clientAuth'

// GET /api/assignments?clientId=xxx — the question sets this client can open.
// Drafts are excluded: the admin has not released them yet.
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ assignments: [] }, { status: 400 })

  const denied = denyClient(req, clientId)
  if (denied) return denied

  const assignments = await listAssignments(clientId, { visibleToClient: true })
  return NextResponse.json({ assignments })
}
