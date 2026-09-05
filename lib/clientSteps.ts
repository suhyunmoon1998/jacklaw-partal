/**
 * A client's steps, read from the database, for code running on the server.
 *
 * The client's browser assembles the same view from two fetches it already
 * makes. The server has no such fetches, and two places need the answer before
 * anything is sent: the office has to be told when a module will land locked,
 * and the emailed link has to point somewhere the client can actually get in.
 *
 * Same `stepViews` as the dashboard, deliberately. The office being shown a
 * different answer from the client is the failure mode this whole file exists
 * to prevent.
 */

import { getSupabase } from '@/lib/supabase'
import { ModuleId } from '@/lib/modules'
import { ModuleProgress, ModuleSend, StepView, stepViews } from '@/lib/moduleSteps'
import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import { MODULE_2_SECTIONS } from '@/lib/module2Data'

export async function readSteps(clientId: string): Promise<StepView[]> {
  const supabase = getSupabase()

  const [{ data: sendRows }, { data: state }] = await Promise.all([
    supabase
      .from('client_module_sends')
      .select('module_id, sent_at, opened_at')
      .eq('client_id', clientId),
    supabase
      .from('questionnaire_states')
      .select('completed_sections, submitted, m2_completed_sections, m2_submitted')
      .eq('client_id', clientId)
      .maybeSingle(),
  ])

  const sends: Partial<Record<ModuleId, ModuleSend>> = {}
  for (const row of sendRows ?? []) {
    sends[row.module_id as ModuleId] = {
      sentAt: row.sent_at,
      openedAt: row.opened_at ?? null,
    }
  }

  const progress: Partial<Record<ModuleId, ModuleProgress>> = {
    module1: {
      submitted: Boolean(state?.submitted),
      completedSections: state?.completed_sections ?? [],
      totalSections: QUESTIONNAIRE_SECTIONS.length,
    },
    module2: {
      submitted: Boolean(state?.m2_submitted),
      completedSections: state?.m2_completed_sections ?? [],
      totalSections: MODULE_2_SECTIONS.length,
    },
  }

  return stepViews(sends, progress)
}
