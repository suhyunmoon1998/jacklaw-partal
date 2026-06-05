import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// GET /api/documents?clientId=xxx
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ documents: [] }, { status: 400 })

  const { data, error } = await getSupabase()
    .from('documents')
    .select('id, name, category, uploaded_at, storage_path')
    .eq('client_id', clientId)
    .order('uploaded_at', { ascending: false })

  if (error) return NextResponse.json({ documents: [] }, { status: 500 })

  return NextResponse.json({
    documents: (data ?? []).map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      uploadedAt: d.uploaded_at,
      hasFile: !!d.storage_path,
    })),
  })
}

// POST /api/documents  — multipart/form-data: file, clientId, category
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  const clientId = form.get('clientId') as string | null
  const category = form.get('category') as string | null

  if (!clientId || !category) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  let storagePath: string | null = null

  if (file && file.size > 0) {
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${clientId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const bytes = await file.arrayBuffer()
    const { error: uploadError } = await getSupabase()
      .storage
      .from('documents')
      .upload(path, bytes, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      // Continue without storage path — still record metadata
    } else {
      storagePath = path
    }
  }

  const { data, error } = await getSupabase()
    .from('documents')
    .insert({
      client_id: clientId,
      name: file?.name ?? 'Unknown',
      category,
      storage_path: storagePath,
    })
    .select('id, name, category, uploaded_at, storage_path')
    .single()

  if (error) return NextResponse.json({ error: 'Insert failed' }, { status: 500 })

  return NextResponse.json({
    document: {
      id: data.id,
      name: data.name,
      category: data.category,
      uploadedAt: data.uploaded_at,
      hasFile: !!data.storage_path,
    },
  })
}

// DELETE /api/documents?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Get storage path before deleting row
  const { data: doc } = await getSupabase()
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()

  if (doc?.storage_path) {
    await getSupabase().storage.from('documents').remove([doc.storage_path])
  }

  const { error } = await getSupabase().from('documents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}
