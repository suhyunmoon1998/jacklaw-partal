import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { denyClient } from '@/lib/clientAuth'

// GET /api/documents/[id]/view  → redirect to signed URL
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { data: doc } = await getSupabase()
    .from('documents')
    .select('storage_path, name, client_id')
    .eq('id', params.id)
    .maybeSingle()

  // A file is one client's, and the id in the URL is not a claim to it.
  const denied = denyClient(req, doc?.client_id)
  if (denied) return denied

  if (!doc?.storage_path) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await getSupabase()
    .storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 60 * 60) // 1 hour

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
