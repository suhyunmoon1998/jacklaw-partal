import { TranslatedLang } from '@/lib/langs'

export interface MockClient {
  id: string
  name: string
  phone: string // digits only, e.g. "5550001"
  caseType: string
  onboardingStatus: 'not_started' | 'in_progress' | 'completed'
  lastUpdated: string
}

export interface Session {
  clientId: string
  phone: string
  name: string
  caseType: string
  expiresAt: number
}

export type QuestionType =
  | 'text'
  | 'time'
  | 'number_range'
  | 'phone'
  | 'date'
  | 'yes_no'
  | 'yes_no_unsure'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'number'
  | 'currency'

export interface ShowIfCondition {
  /** The question whose answer decides whether this one is asked. */
  questionId: string
  /**
   * The answer that reveals this question. When the gate is a multi-select, the
   * question is revealed if this value is among the options chosen.
   *
   * Optional only because of `answered` below, where the gate is about there
   * being an answer at all rather than about which one. Every gate an admin can
   * author still has one.
   */
  value?: string
  /**
   * Further answers that also reveal it — "Yes or Sometimes", "a close guess or
   * a range or I do not know". Additive and optional, so every gate written
   * before this existed, and every gate an admin builds in the question-set
   * editor, still means exactly what it meant.
   */
  orValues?: string[]
  /**
   * A second condition that must hold as well. Module 1 needs it exactly once —
   * "did you enter your end time the same way as your start time" is only worth
   * asking of someone who entered both — and nothing else in the portal reads
   * it, so a consumer that only understands `questionId`/`value` still sees a
   * true, if incomplete, description of the gate.
   */
  and?: { questionId: string; value: string; orValues?: string[] }
  /**
   * A second condition where EITHER is enough. "Unless they never worked over
   * eight hours in a day and never over forty in a week" is two questions, and
   * one of them saying yes is the whole point of asking.
   */
  or?: { questionId: string; value: string; orValues?: string[] }
  /**
   * True when the gating question has any answer at all, whatever it is. Used
   * where the packet says "ask when M2Q070 is shown" — the follow-ups belong to
   * the fact that the worker said something, not to what they said.
   */
  answered?: true
}

/**
 * One question, written in a language other than the English it is authored in.
 *
 * Only what a client reads is translated. `options` is display text matched to
 * the English options BY POSITION — the English string stays the stored answer,
 * so a client answering in any language has their choices arrive in the office
 * in English.
 */
export interface QuestionTranslation {
  label?: string
  helpText?: string
  placeholder?: string
  options?: string[]
}

export interface Question {
  id: string
  label: string
  type: QuestionType
  required?: boolean
  options?: string[]
  /**
   * Choices that cannot be held alongside a substantive one — "None of these",
   * "No", "Not sure". Picking one clears the rest; picking anything else clears
   * it. Without this a worker can file "None of these" and four things at once,
   * and neither the routing nor the office can tell what they meant.
   */
  exclusiveOptions?: string[]
  /**
   * Options taken at render time from what the worker already chose elsewhere,
   * rather than written here — "which of the kinds of unpaid work you picked
   * happened most often". Values are the other questions' ids; their selected
   * answers become this question's options, minus their own exclusive ones.
   */
  optionsFrom?: string[]
  placeholder?: string
  helpText?: string
  showIf?: ShowIfCondition
  /**
   * Optional translations for question sets, one key per non-English language.
   * The default onboarding questionnaire is translated in files of its own
   * instead (lib/questionnaireData*.ts).
   *
   * These are sibling keys rather than a nested map because they live inside
   * the `question` jsonb of rows that were written when `es` was the only
   * translation there was. A set the firm translated into Spanish before
   * Chinese and Korean existed keeps rendering with no migration.
   */
  es?: QuestionTranslation
  zh?: QuestionTranslation
  ko?: QuestionTranslation
}

export interface QuestionnaireSection {
  id: string
  title: string
  questions: Question[]
  showIf?: ShowIfCondition
  /**
   * A section asked once per thing the worker named, instead of once.
   *
   * Module 2 needs the same twenty-eight questions about every kind of unpaid
   * work someone did, and a worker who did three kinds has three sets of
   * answers that must not overwrite each other. The instances come from the
   * answers to `fromQuestionIds`, and each one gets its own copy of every
   * question id, suffixed with the thing it is about. `titleTemplate` puts that
   * thing in the heading so the worker knows which one they are answering about.
   */
  repeatFor?: {
    fromQuestionIds: string[]
    titleTemplate: string
  }
}

export type AnswerValue = string | string[]

export interface QuestionnaireState {
  answers: Record<string, AnswerValue>
  completedSections: number[]
  lastSaved: string
  submitted: boolean
}

export interface UploadedDocument {
  name: string
  category: string
  uploadedAt: string
}

export interface AdminSession {
  authenticated: boolean
  expiresAt: number
}

export interface Flashcard {
  id: string
  front: string
  back: string
}

export interface FlashcardDeck {
  id: string
  title: string
  description: string
  cards: Flashcard[]
  createdAt: string
}

export interface CardProgress {
  cardId: string
  status: 'new' | 'learning' | 'known'
  lastReviewedAt?: string
}

// ─── Question Sets ────────────────────────────────────────────────────────────
// Reusable questionnaire templates an admin can build and assign to individual
// clients, independently of the default onboarding questionnaire.

export type QuestionSetStatus = 'active' | 'archived'

export interface QuestionSet {
  id: string
  name: string
  /**
   * The set's name in each language it has been translated into. Absent keys
   * fall back to `name`, so an English-only set needs nothing here.
   */
  nameTranslations: Partial<Record<TranslatedLang, string>>
  description: string
  status: QuestionSetStatus
  isDefault: boolean
  questionCount: number
  createdAt: string
  updatedAt: string
}

/** A set plus its ordered questions — the shape the renderer needs. */
export interface QuestionSetDetail extends QuestionSet {
  questions: Question[]
}

export type AssignmentStatus = 'draft' | 'assigned' | 'sent' | 'in_progress' | 'completed'

export interface Assignment {
  id: string
  clientId: string
  questionSetId: string
  questionSetName: string
  questionSetNameTranslations: Partial<Record<TranslatedLang, string>>
  questionSetDescription: string
  questionCount: number
  status: AssignmentStatus
  assignedAt: string
  sentAt: string | null
  startedAt: string | null
  completedAt: string | null
  answeredCount: number
}

/** An assignment with the questions to render and the answers so far. */
export interface AssignmentDetail extends Assignment {
  clientName: string
  questions: Question[]
  answers: Record<string, AnswerValue>
}
