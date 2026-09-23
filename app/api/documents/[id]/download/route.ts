import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { denyClient } from '@/lib/clientAuth'

// GET /api/documents/[id]/download → redirect to a signed URL that forces
// a file download (Content-Disposition: attachment) instead of an inline view
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    .createSignedUrl(doc.storage_path, 60 * 60, { download: doc.name }) // 1 hour

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  /**
   * Mark it taken.
   *
   * Written only once the signed URL exists, so a failure to produce one is not
   * recorded as a download. Not awaited and never allowed to throw: the office
   * asked for a file, and a bookkeeping write that goes wrong must not stand
   * between them and it — the worst case is a file that was fetched and does
   * not show the badge, which is better than a file that will not open.
   *
   * Viewing is deliberately not stamped. Opening a file to see what it is
   * happens constantly, and marking that would make the badge meaningless.
   */
  getSupabase()
    .rpc('mark_document_downloaded', { doc_id: Number(params.id) })
    .then(({ error: stampError }) => {
      if (stampError) console.error('could not stamp download for', params.id, stampError)
    })

  return NextResponse.redirect(data.signedUrl)
}
