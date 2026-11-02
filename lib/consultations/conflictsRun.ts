import { getSupabase } from '@/lib/supabase'
import { BookingParties, ConflictHit, PartyOnFile, PartyRole, findConflicts, splitNames } from './conflicts'

/**
 * Every name the office has on file, read for the conflict check.
 *
 * Clients and what their intake says about the other side (employer,
 * supervisor, HR contact — only those answers are read, never the rest), and
 * every earlier consultation. Paged, because PostgREST stops at 1,000 rows and
 * a check that silently read the first thousand clients would be worse than
 * none.
 */

const PAGE = 1000

async function allRows<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await getSupabase()
      .from(table)
      .select(columns)
      .order(table === 'questionnaire_states' ? 'client_id' : 'id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) return rows
  }
}

interface ClientRow {
  id: string
  name: string
  phone: string | null
}

interface AnswerRow {
  client_id: string
  employer_name: string | null
  current_employer_name: string | null
  supervisor_name: string | null
  hr_contact: string | null
}

interface ConsultationRow {
  id: string
  name: string
  phone: string
  adverse_party: string
  other_parties: string
}

export async function partiesOnFile(excludeConsultationId?: string): Promise<PartyOnFile[]> {
  const [clients, answers, consultations] = await Promise.all([
    allRows<ClientRow>('clients', 'id, name, phone'),
    allRows<AnswerRow>(
      'questionnaire_states',
      'client_id, employer_name:answers->>employer_name, current_employer_name:answers->>current_employer_name, supervisor_name:answers->>supervisor_name, hr_contact:answers->>hr_contact'
    ),
    allRows<ConsultationRow>('consultations', 'id, name, phone, adverse_party, other_parties'),
  ])

  const parties: PartyOnFile[] = []
  const nameOf = new Map(clients.map(c => [c.id, c.name]))

  for (const c of clients) {
    parties.push({ source: 'client', recordId: c.id, recordLabel: c.name, role: 'client', name: c.name, phone: c.phone ?? '' })
  }

  const fromAnswer = (row: AnswerRow, role: PartyRole, value: string | null) => {
    const label = nameOf.get(row.client_id)
    if (!label || !value?.trim()) return
    for (const name of role === 'employer' ? [value.trim()] : splitNames(value)) {
      parties.push({ source: 'client', recordId: row.client_id, recordLabel: label, role, name })
    }
  }
  for (const row of answers) {
    fromAnswer(row, 'employer', row.employer_name)
    if (row.current_employer_name !== row.employer_name) fromAnswer(row, 'employer', row.current_employer_name)
    fromAnswer(row, 'supervisor', row.supervisor_name)
    fromAnswer(row, 'hr', row.hr_contact)
  }

  for (const c of consultations) {
    if (c.id === excludeConsultationId) continue
    parties.push({ source: 'consultation', recordId: c.id, recordLabel: c.name, role: 'prospect', name: c.name, phone: c.phone })
    if (c.adverse_party.trim()) {
      parties.push({ source: 'consultation', recordId: c.id, recordLabel: c.name, role: 'adverse', name: c.adverse_party.trim() })
    }
    for (const name of splitNames(c.other_parties)) {
      parties.push({ source: 'consultation', recordId: c.id, recordLabel: c.name, role: 'other', name })
    }
  }

  return parties
}

/**
 * Runs the check for one booking and stores what it found. Never throws: a
 * check that could not run is stored as null, which the panel shows as "not
 * checked" rather than as clear.
 */
export async function runConflictCheck(consultationId: string, booking: BookingParties): Promise<ConflictHit[] | null> {
  let hits: ConflictHit[] | null = null
  try {
    hits = findConflicts(booking, await partiesOnFile(consultationId))
  } catch (err) {
    console.error('consultation conflict check:', err instanceof Error ? err.message : err)
    return null
  }
  const { error } = await getSupabase().from('consultations').update({ conflicts: hits }).eq('id', consultationId)
  if (error) console.error('consultation conflict check (store):', error.message)
  return hits
}
