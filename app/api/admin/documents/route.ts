import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD
}

// GET /api/admin/documents?clientId=xxx
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ documents: [] }, { status: 400 })

  const { data } = await getSupabase()
    .from('documents')
    .select('id, name, category, uploaded_at, storage_path, downloaded_at, download_count')
    .eq('client_id', clientId)
    .order('uploaded_at', { ascending: false })

  return NextResponse.json({
    documents: (data ?? []).map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      uploadedAt: d.uploaded_at,
      hasFile: !!d.storage_path,
      // When the office last took a copy, and how many times. Null means this
      // file has never left the portal.
      downloadedAt: d.downloaded_at ?? null,
      downloadCount: d.download_count ?? 0,
    })),
  })
}
