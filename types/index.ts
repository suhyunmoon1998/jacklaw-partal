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

export interface Question {
  id: string
  label: string
  type: QuestionType
  required?: boolean
  options?: string[]
  placeholder?: string
  helpText?: string
  showIf?: ShowIfCondition
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
