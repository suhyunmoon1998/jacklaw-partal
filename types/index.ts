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
  questionId: string
  value: string
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
