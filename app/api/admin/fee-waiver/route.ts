import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import {
  FEE_WAIVER_SET_ID,
  FW001_INCOME_TABLE,
  ensureFeeWaiverSet,
  feeWaiverVerdict,
  readFeeWaiverAnswers,
} from '@/lib/feeWaiver'
import { AnswerValue } from '@/types'

/**
 * GET /api/admin/fee-waiver — every client, with where their fee waiver
 * questions stand and what the answers come to.
 *
 * Every client rather than only those sent the questions, because the tab is
 * also where they are sent from.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureFeeWaiverSet()
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not set up the questions.' }, { status: 500 })
  }

  const db = getSupabase()
  // Ranged explicitly: PostgREST stops an unbounded select at 1000 rows.
  const [clients, folders, assignments] = await Promise.all([
    db.from('clients').select('id, name, case_name, case_folder_id, portal_lang').range(0, 99_999),
    db.from('case_folders').select('id, name').range(0, 99_999),
    db
      .from('client_question_set_assignments')
      .select('id, client_id, status, assigned_at, sent_at, completed_at')
      .eq('question_set_id', FEE_WAIVER_SET_ID)
      .order('assigned_at', { ascending: false })
      .range(0, 99_999),
  ])
  // A half-read list would show clients as never asked who were.
  const failed = clients.error ?? folders.error ?? assignments.error
  if (failed) return NextResponse.json({ error: `Could not read the fee waiver list: ${failed.message}` }, { status: 500 })

  // Newest first, so the first one met is the one that counts.
  const latest = new Map<string, NonNullable<typeof assignments.data>[number]>()
  for (const a of assignments.data ?? []) if (!latest.has(String(a.client_id))) latest.set(String(a.client_id), a)

  const ids = [...latest.values()].map(a => a.id)
  const responses = ids.length
    ? await db.from('question_set_responses').select('assignment_id, question_key, answer').in('assignment_id', ids).range(0, 99_999)
    : { data: [], error: null }
  if (responses.error) {
    return NextResponse.json({ error: `Could not read the answers: ${responses.error.message}` }, { status: 500 })
  }

  const answersOf = new Map<string, Record<string, AnswerValue>>()
  for (const r of responses.data ?? []) {
    const id = String(r.assignment_id)
    if (!answersOf.has(id)) answersOf.set(id, {})
    answersOf.get(id)![String(r.question_key)] = r.answer as AnswerValue
  }

  const folderName = new Map((folders.data ?? []).map(f => [String(f.id), String(f.name ?? '')]))

  const rows = (clients.data ?? []).map(c => {
    const a = latest.get(String(c.id))
    const answers = readFeeWaiverAnswers(a ? answersOf.get(String(a.id)) ?? {} : {})
    return {
      clientId: String(c.id),
      name: String(c.name ?? ''),
      caseLabel: folderName.get(String(c.case_folder_id ?? '')) || String(c.case_name ?? ''),
      lang: c.portal_lang ?? null,
      assignment: a
        ? { id: String(a.id), status: String(a.status), sentAt: a.sent_at, completedAt: a.completed_at }
        : null,
      answers,
      verdict: feeWaiverVerdict(answers),
    }
  })

  return NextResponse.json({ rows, table: FW001_INCOME_TABLE ? { effective: FW001_INCOME_TABLE.effective } : null })
}

/**
 * POST /api/admin/fee-waiver  { clientId } — the assignment to send.
 *
 * A client already given the questions gets the same assignment back, so a
 * second send reaches the answers they started instead of a blank copy beside
 * them.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId } = await req.json().catch(() => ({}))
  if (typeof clientId !== 'string' || !clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

  try {
    await ensureFeeWaiverSet()
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not set up the questions.' }, { status: 500 })
  }

  const db = getSupabase()
  const { data: existing, error } = await db
    .from('client_question_set_assignments')
    .select('id')
    .eq('client_id', clientId)
    .eq('question_set_id', FEE_WAIVER_SET_ID)
    .order('assigned_at', { ascending: false })
    .limit(1)
  if (error) return NextResponse.json({ error: `Could not read the assignment: ${error.message}` }, { status: 500 })
  if (existing?.length) return NextResponse.json({ id: existing[0].id })

  // A draft until the send goes out: the portal hides drafts, so a client is
  // never shown questions the office opened the dialog for and then cancelled.
  const { data, error: insertError } = await db
    .from('client_question_set_assignments')
    .insert({ client_id: clientId, question_set_id: FEE_WAIVER_SET_ID, status: 'draft', created_by: 'admin' })
    .select('id')
    .single()
  if (insertError || !data) {
    return NextResponse.json({ error: `Could not give the client the questions: ${insertError?.message ?? 'no row'}` }, { status: 500 })
  }
  return NextResponse.json({ id: data.id })
}
