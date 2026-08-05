import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// GET /api/documents/[id]/download → redirect to a signed URL that forces
// a file download (Content-Disposition: attachment) instead of an inline view
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
    .createSignedUrl(doc.storage_path, 60 * 60, { download: doc.name }) // 1 hour

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
