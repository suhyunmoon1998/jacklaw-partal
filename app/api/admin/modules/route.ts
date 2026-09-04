import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'

// GET /api/admin/modules?clientId=xxx — which modules this client has been sent
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

  const { data, error } = await getSupabase()
    .from('client_module_sends')
    .select('module_id, sent_at, sent_to, sent_lang')
    .eq('client_id', clientId)

  if (error) {
    console.error('module sends fetch failed:', error)
    return NextResponse.json({ error: 'Could not read what has been sent.' }, { status: 500 })
  }

  return NextResponse.json({
    sends: (data ?? []).map(s => ({
      moduleId: s.module_id,
      sentAt: s.sent_at,
      sentTo: s.sent_to ?? '',
      sentLang: s.sent_lang ?? '',
    })),
  })
}
