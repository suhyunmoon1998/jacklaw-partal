import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

/**
 * GET /api/modules?clientId=xxx — the modules this client has been given.
 *
 * Unauthenticated like the other client-facing routes here: it takes a client id
 * and returns which questionnaires are open to them. A wrong id shows someone
 * else's list of module names, which carries nothing about anybody's case.
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ sent: [] }, { status: 400 })

  const { data, error } = await getSupabase()
    .from('client_module_sends')
    .select('module_id')
    .eq('client_id', clientId)

  if (error) {
    console.error('module list failed:', error)
    return NextResponse.json({ sent: [] }, { status: 500 })
  }

  return NextResponse.json({ sent: (data ?? []).map(r => r.module_id) })
}
