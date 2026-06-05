import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// GET /api/documents/[id]/view  → redirect to signed URL
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: doc } = await getSupabase()
    .from('documents')
    .select('storage_path, name')
    .eq('id', params.id)
    .maybeSingle()

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
