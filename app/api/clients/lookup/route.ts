import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// POST /api/clients/lookup  { phone: "3105550000" }
export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ client: null })

  const { data, error } = await getSupabase()
    .from('clients')
    .select('id, name, phone, case_type, onboarding_status')
    .eq('phone', phone.replace(/\D/g, ''))
    .maybeSingle()

  if (error) {
    console.error('lookup error:', error)
    return NextResponse.json({ client: null }, { status: 500 })
  }

  return NextResponse.json({ client: data })
}
