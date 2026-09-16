import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

/**
 * POST /api/clients/lookup  { phone: "3105550000" }
 *
 * Every case on that number, not one.
 *
 * A client suing two employers has two rows, because a row carries one set of
 * questionnaire answers and the two employers' facts are not the same facts.
 * This used to be .maybeSingle(), which returns nothing at all when a number
 * matches twice — so the moment the office put a real second case on a real
 * number, that person could not sign in to either.
 *
 * Ordered oldest first so the case someone has been working on longest is the
 * one offered at the top.
 */
export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (!digits) return NextResponse.json({ clients: [] })

  const { data, error } = await getSupabase()
    .from('clients')
    .select('id, name, phone, case_type, case_name, onboarding_status, case_folder_id, created_at')
    .eq('phone', digits)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('lookup error:', error)
    return NextResponse.json({ clients: [] }, { status: 500 })
  }

  const rows = data ?? []

  // The case folder is what the client recognises — it is the employer they are
  // suing — so the picker is labelled with it rather than with a row id. Read
  // only when there is a choice to make.
  let folders: Record<string, string> = {}
  if (rows.length > 1) {
    const ids = rows.map(r => r.case_folder_id).filter(Boolean) as string[]
    if (ids.length) {
      const { data: f } = await getSupabase().from('case_folders').select('id, name').in('id', ids)
      folders = Object.fromEntries((f ?? []).map(x => [x.id, x.name]))
    }
  }

  return NextResponse.json({
    clients: rows.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      case_type: c.case_type,
      // Whatever names this case on screen: the folder, else the note the
      // office wrote on the client, else the kind of case.
      case_label:
        (c.case_folder_id && folders[c.case_folder_id]) ||
        (c.case_name ?? '').trim() ||
        c.case_type ||
        '',
      onboarding_status: c.onboarding_status,
      // Two cases with no folder and no note would otherwise read identically
      // on the picker, and the client could not tell which was which. The date
      // the office opened the case always differs.
      opened: c.created_at,
    })),
  })
}
