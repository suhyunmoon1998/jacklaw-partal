/**
 * How far a client has got with everything the office asked of them.
 *
 * The admin list used to answer this from the default onboarding questionnaire
 * alone, which was true when that was the only thing a client could be given.
 * It stopped being true the day question sets could be assigned: a client added
 * purely so a set could be sent to them would finish it, and still show as
 * "Not Started · 0%" — while the office had an email in their inbox saying the
 * opposite.
 *
 * So work is counted in units. The onboarding questionnaire is one unit, and
 * every question set the client can actually see is another. Drafts are not
 * counted: a set the office has built but not released was never asked of
 * anyone.
 */

export interface AssignmentRollup {
  /** Sets the client can see — drafts excluded. */
  total: number
  completed: number
}

export interface ClientWork {
  questionnaire: { submitted: boolean; completedSections: number[] }
  assignments?: AssignmentRollup
}

export type ClientStatus =
  | 'submitted'
  | 'in_progress'
  | 'sets_done'
  | 'sets_sent'
  | 'not_started'

export const STATUS_LABEL: Record<ClientStatus, { label: string; cls: string }> = {
  submitted: { label: 'Submitted', cls: 'bg-green-100 text-green-700' },
  in_progress: { label: 'In Progress', cls: 'bg-amber-100 text-amber-700' },
  sets_done: { label: 'Questions Done', cls: 'bg-green-100 text-green-700' },
  sets_sent: { label: 'Questions Sent', cls: 'bg-blue-100 text-blue-700' },
  not_started: { label: 'Not Started', cls: 'bg-gray-100 text-gray-500' },
}

export function clientStatus(client: ClientWork): ClientStatus {
  const { submitted, completedSections } = client.questionnaire
  if (submitted) return 'submitted'
  if (completedSections.length > 0) return 'in_progress'

  const sets = client.assignments
  if (sets && sets.total > 0) {
    // They have not touched the onboarding questionnaire, but they did the thing
    // the office actually sent them. Saying "Not Started" of that person is what
    // this exists to stop.
    if (sets.completed > 0) return sets.completed === sets.total ? 'sets_done' : 'in_progress'
    return 'sets_sent'
  }

  return 'not_started'
}

/**
 * Percentage across every unit of work, for the bar in the client list.
 *
 * A section count is not used here even for the onboarding questionnaire: the
 * questionnaire has had different numbers of sections over its life, and a row
 * saved under an older one carries indices this one does not have. A unit is
 * either finished or it is not.
 */
export function clientProgressPercent(client: ClientWork): number {
  const sets = client.assignments ?? { total: 0, completed: 0 }
  const totalUnits = 1 + sets.total
  const doneUnits = (client.questionnaire.submitted ? 1 : 0) + Math.min(sets.completed, sets.total)
  return Math.min(100, Math.round((doneUnits / totalUnits) * 100))
}
