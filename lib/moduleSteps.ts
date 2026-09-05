/**
 * Which step a client is on, and which ones are not theirs to open yet.
 *
 * The office sends modules. The client does steps. Those are the same objects
 * seen from two sides, and until now only one side had a name for them: the
 * dashboard showed Module 1 to everybody whether or not it had been sent, and
 * Module 2 only if it had, so sending Module 1 changed nothing on the client's
 * screen and the office had no way to tell it had worked.
 *
 * One rule decides everything here, and it is deliberately narrow:
 *
 *   A step is open when the office has sent it and every step they sent BEFORE
 *   it has been submitted.
 *
 * "Before it" counts only steps that were actually sent. If the office hands
 * someone Step 2 and nothing else, Step 2 opens — an unsent step is not a
 * prerequisite, because nobody ever asked this client to do it. Today that is a
 * hatch the office has to open deliberately, by unsending Step 1; it is not
 * reachable by accident, since every client on the books has Step 1.
 *
 * A submitted step is always readable, sent or not. Six clients filled the
 * intake before any of this existed, and taking their own answers away from
 * them over a missing row would be indefensible.
 *
 * Both the client's dashboard and the office's admin panel compute their view
 * from this one function. They have to: a screen that tells a client she is
 * blocked while the paralegal's screen says she is ignoring us is how someone
 * gets chased for work they were never able to start.
 */

import { ModuleId, MODULES } from '@/lib/modules'
import { sectionProgressPercent } from '@/lib/questionLogic'

export type StepState =
  /** Submitted. */
  | 'done'
  /** Sent, and everything sent before it is finished. This is the one to do. */
  | 'open'
  /** Sent, but an earlier sent step is unfinished. */
  | 'waiting'
  /** The office has not handed this over. */
  | 'unsent'

/** A row of client_module_sends, as either side sees it. */
export interface ModuleSend {
  sentAt: string
  /** Null until the client opens the questionnaire itself. */
  openedAt: string | null
}

export interface ModuleProgress {
  submitted: boolean
  completedSections: number[]
  totalSections: number
}

export interface StepView {
  id: ModuleId
  /** 1, 2, 3 — what the client is shown. */
  step: number
  state: StepState
  /** For 'waiting' only: the step they have to finish first. */
  blockedBy: number | null
  /**
   * Sent since the last time they opened it, and open to them now. What the
   * "New" badge and the dashboard banner are for.
   */
  isNew: boolean
  /**
   * Sent since they last opened it, whatever state it is in. The office reads
   * this one: a step can be unread and still correctly locked, and chasing that
   * client would be chasing them for work they cannot start.
   */
  isUnread: boolean
  percent: number
  /** The office has handed this over. Same thing as sentAt being set. */
  granted: boolean
  /**
   * Every section answered, and never submitted. Ester has been sitting here
   * since July. A bar reading 100% beside "In progress" is a screen arguing
   * with itself, so the step list says what is actually left to do.
   */
  finishedNotSubmitted: boolean
  sentAt: string | null
  openedAt: string | null
  /** False for a step that exists on paper but has no questions yet. */
  built: boolean
}

/** The modules in the order the client meets them. */
export const ORDERED_MODULES = [...MODULES].sort((a, b) => a.step - b.step)

export const stepNumber = (id: ModuleId): number =>
  ORDERED_MODULES.find(m => m.id === id)?.step ?? 0

/**
 * Whether this send has arrived since the client last looked.
 *
 * Compared as instants, not as strings: Postgres hands back
 * "2026-09-05 17:50:23.661+00" and the browser writes
 * "2026-09-05T18:00:00.000Z", and those two sort against each other wrongly.
 *
 * A re-send bumps sent_at past opened_at and so becomes unread again without
 * erasing the date the office is looking at. That matters — the office sends a
 * second time precisely because the first went unanswered, and the answer to
 * "have they ever been in?" should survive the nudge.
 */
const isUnread = (send: ModuleSend | null): boolean => {
  if (!send) return false
  if (!send.openedAt) return true
  const sent = Date.parse(send.sentAt)
  const opened = Date.parse(send.openedAt)
  if (Number.isNaN(sent) || Number.isNaN(opened)) return !send.openedAt
  return sent > opened
}

export function stepViews(
  sends: Partial<Record<ModuleId, ModuleSend>>,
  progress: Partial<Record<ModuleId, ModuleProgress>>
): StepView[] {
  const views: StepView[] = []

  for (const mod of ORDERED_MODULES) {
    const send = sends[mod.id] ?? null
    /**
     * Whether this step is the client's to do at all.
     *
     * Strictly "is there a send row", with no charitable default for the
     * intake. A missing row has to mean something, because taking one away is
     * how the office un-sends a module they sent by mistake and how they clear
     * a client stuck behind an unfinished Step 1. A code path that quietly
     * granted the intake back would undo both.
     *
     * What guards the client instead is at the two ends: the row is written and
     * verified when they are added, and a failed read holds the screen rather
     * than reporting an empty list as "nothing was sent".
     */
    const granted = Boolean(send)
    const prog = progress[mod.id]
    const submitted = Boolean(prog?.submitted)
    const raw = prog ? sectionProgressPercent(prog.completedSections ?? [], prog.totalSections) : 0

    // The first earlier step this client actually has and has not finished.
    // Steps they were never given are skipped — they were never this client's
    // work to do, so they cannot be in this client's way.
    const blocker = views.find(v => v.granted && v.state !== 'done')

    const state: StepState = submitted
      ? 'done'
      : !granted
      ? 'unsent'
      : blocker
      ? 'waiting'
      : 'open'

    const unread = isUnread(send)

    views.push({
      id: mod.id,
      step: mod.step,
      state,
      blockedBy: state === 'waiting' ? (blocker?.step ?? null) : null,
      isNew: state === 'open' && unread,
      isUnread: unread,
      // 100% is reserved for submitted. Anything short of that is short of
      // done, however many sections have been filled in, and a full bar over an
      // unfinished step reads as a portal that lost the answers.
      percent: submitted ? 100 : Math.min(raw, 99),
      granted,
      finishedNotSubmitted: !submitted && raw >= 100,
      sentAt: send?.sentAt ?? null,
      openedAt: send?.openedAt ?? null,
      built: mod.built,
    })
  }

  return views
}

/** The one step the client should be doing, if there is one. */
export const currentStep = (views: StepView[]): StepView | null =>
  views.find(v => v.state === 'open') ?? null

/** The step to announce, if the office has sent something they have not seen. */
export const unseenStep = (views: StepView[]): StepView | null =>
  views.find(v => v.isNew) ?? null

/** True once every step the office sent has been submitted. */
export const allSentStepsDone = (views: StepView[]): boolean =>
  views.some(v => v.state === 'done') &&
  views.every(v => v.state === 'done' || v.state === 'unsent')

/**
 * The steps a client is shown.
 *
 * A module with no questions is not on anyone's road yet. Listing it would
 * promise a Step 3 the firm cannot deliver and cannot date, so it stays in the
 * admin panel — where "Not built yet" is a fact about our work — until either
 * it has questions or this client has somehow been sent it anyway.
 */
export const visibleSteps = (views: StepView[]): StepView[] =>
  views.filter(v => v.built || v.granted || v.state === 'done')

/**
 * How far along this client is across everything the office asked of them.
 *
 * Averaged over the steps they were actually sent, so finishing Step 1 out of
 * two sent steps reads as half done rather than as finished — which is what the
 * old card said, in green, directly above an open Step 2.
 */
export function overallPercent(views: StepView[]): number {
  const asked = views.filter(v => v.granted || v.state === 'done')
  if (asked.length === 0) return 0
  return Math.round(asked.reduce((sum, v) => sum + v.percent, 0) / asked.length)
}
