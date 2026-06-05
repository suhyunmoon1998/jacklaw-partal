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
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'number'

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
