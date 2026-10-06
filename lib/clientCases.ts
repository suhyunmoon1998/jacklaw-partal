/**
 * The cases on one phone number, for signing in.
 *
 * A client suing two employers has two rows, because a row carries one set of
 * questionnaire answers and the two employers' facts are not the same facts.
 * So a number can open more than one case, and the person chooses — but only
 * after the number has answered a texted code. Before that, nothing here is
 * said to anyone: not whether the number is on file, not a name, not a case.
 */

import { getSupabase } from '@/lib/supabase'
import { phoneVariants } from '@/lib/signInCode'

export interface ClientOnNumber {
  id: string
  name: string
  phone: string
  case_type: string | null
  case_name: string | null
  case_folder_id: string | null
  created_at: string
  onboarding_status: string | null
  portal_lang: string | null
  sms_opt_out: boolean | null
}

/** One case as the sign-in screen offers it. */
export interface CaseChoice {
  id: string
  name: string
  case_type: string
  case_label: string
  onboarding_status: string | null
  opened: string
}

/** Every row on this number, oldest first. Throws on a failed read. */
export async function clientsOnNumber(key: string): Promise<ClientOnNumber[]> {
  const { data, error } = await getSupabase()
    .from('clients')
    .select('id, name, phone, case_type, case_name, case_folder_id, created_at, onboarding_status, portal_lang, sms_opt_out')
    .in('phone', phoneVariants(key))
    .order('created_at', { ascending: true })
  if (error) throw new Error(`clients on a number could not be read: ${error.message}`)
  return (data ?? []) as ClientOnNumber[]
}

/**
 * What names each case on the picker: the folder (the employer they are
 * suing), else the note the office wrote, else the kind of case — and the day
 * the office opened it, which always differs.
 */
export async function caseChoices(rows: ClientOnNumber[]): Promise<CaseChoice[]> {
  let folders: Record<string, string> = {}
  if (rows.length > 1) {
    const ids = rows.map(r => r.case_folder_id).filter(Boolean) as string[]
    if (ids.length) {
      const { data } = await getSupabase().from('case_folders').select('id, name').in('id', ids)
      folders = Object.fromEntries((data ?? []).map(f => [String(f.id), String(f.name)]))
    }
  }
  return rows.map(c => ({
    id: c.id,
    name: c.name,
    case_type: c.case_type ?? '',
    case_label: (c.case_folder_id && folders[c.case_folder_id]) || (c.case_name ?? '').trim() || c.case_type || '',
    onboarding_status: c.onboarding_status,
    opened: c.created_at,
  }))
}
