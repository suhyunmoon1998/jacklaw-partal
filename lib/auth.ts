/**
 * AUTH UTILITIES — MOCK IMPLEMENTATION
 *
 * Production replacement:
 * - Use Twilio Verify for real SMS OTP (https://www.twilio.com/docs/verify)
 * - Use Clerk, Auth0, or Supabase Auth for session management
 * - Never store sensitive tokens in localStorage — use httpOnly cookies
 * - Add CSRF protection for any form submissions
 */

import { Session, QuestionnaireState, UploadedDocument, MockClient } from '@/types'

const SESSION_KEY = 'jlp_session'
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours
const OTP_KEY = 'jlp_pending_otp'
const OTP_PHONE_KEY = 'jlp_pending_phone'
const OTP_CLIENT_KEY = 'jlp_pending_client_id'
const OTP_CLIENT_NAME_KEY = 'jlp_pending_client_name'
const OTP_CLIENT_CASE_KEY = 'jlp_pending_client_case'

// Strips all non-digit characters for consistent phone comparison
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

// Generates a mock 6-digit OTP
export function generateMockOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Stores pending OTP and phone during verification step
export function storePendingVerification(
  phone: string, clientId: string, otp: string,
  clientName: string, caseType: string,
): void {
  sessionStorage.setItem(OTP_PHONE_KEY, phone)
  sessionStorage.setItem(OTP_CLIENT_KEY, clientId)
  sessionStorage.setItem(OTP_KEY, otp)
  sessionStorage.setItem(OTP_CLIENT_NAME_KEY, clientName)
  sessionStorage.setItem(OTP_CLIENT_CASE_KEY, caseType)
}

export function getPendingVerification(): {
  phone: string; clientId: string; otp: string; clientName: string; caseType: string
} | null {
  const phone = sessionStorage.getItem(OTP_PHONE_KEY)
  const clientId = sessionStorage.getItem(OTP_CLIENT_KEY)
  const otp = sessionStorage.getItem(OTP_KEY)
  const clientName = sessionStorage.getItem(OTP_CLIENT_NAME_KEY) ?? ''
  const caseType = sessionStorage.getItem(OTP_CLIENT_CASE_KEY) ?? ''
  if (!phone || !clientId || !otp) return null
  return { phone, clientId, otp, clientName, caseType }
}

export function clearPendingVerification(): void {
  sessionStorage.removeItem(OTP_PHONE_KEY)
  sessionStorage.removeItem(OTP_CLIENT_KEY)
  sessionStorage.removeItem(OTP_KEY)
  sessionStorage.removeItem(OTP_CLIENT_NAME_KEY)
  sessionStorage.removeItem(OTP_CLIENT_CASE_KEY)
}

// Client session management
export function setSession(session: Omit<Session, 'expiresAt'>): void {
  const full: Session = { ...session, expiresAt: Date.now() + SESSION_DURATION_MS }
  localStorage.setItem(SESSION_KEY, JSON.stringify(full))
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session: Session = JSON.parse(raw)
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

// Questionnaire state per client
export function getQuestionnaireState(clientId: string): QuestionnaireState {
  try {
    const raw = localStorage.getItem(`jlp_questionnaire_${clientId}`)
    if (!raw) return { answers: {}, completedSections: [], lastSaved: '', submitted: false }
    return JSON.parse(raw)
  } catch {
    return { answers: {}, completedSections: [], lastSaved: '', submitted: false }
  }
}

export function saveQuestionnaireState(clientId: string, state: QuestionnaireState): void {
  localStorage.setItem(`jlp_questionnaire_${clientId}`, JSON.stringify({
    ...state,
    lastSaved: new Date().toISOString(),
  }))
}

// Document list per client
export function getDocuments(clientId: string): UploadedDocument[] {
  try {
    const raw = localStorage.getItem(`jlp_documents_${clientId}`)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveDocuments(clientId: string, docs: UploadedDocument[]): void {
  localStorage.setItem(`jlp_documents_${clientId}`, JSON.stringify(docs))
}

// Admin session (separate from client session)
export function setAdminSession(): void {
  localStorage.setItem('jlp_admin', JSON.stringify({ authenticated: true, expiresAt: Date.now() + SESSION_DURATION_MS }))
}

export function getAdminSession(): boolean {
  try {
    const raw = localStorage.getItem('jlp_admin')
    if (!raw) return false
    const s = JSON.parse(raw)
    if (Date.now() > s.expiresAt) { localStorage.removeItem('jlp_admin'); return false }
    return s.authenticated === true
  } catch {
    return false
  }
}

export function clearAdminSession(): void {
  localStorage.removeItem('jlp_admin')
}

// Submission notifications for admin
const NOTIFICATIONS_KEY = 'jlp_notifications'
const ADMIN_LAST_SEEN_KEY = 'jlp_admin_last_seen'

export interface SubmissionNotification {
  id: string
  clientId: string
  clientName: string
  caseType: string
  submittedAt: string
}

export function addSubmissionNotification(n: Omit<SubmissionNotification, 'id'>): void {
  const existing = getSubmissionNotifications()
  const next: SubmissionNotification = { ...n, id: `notif-${Date.now()}` }
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([next, ...existing]))
}

export function getSubmissionNotifications(): SubmissionNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getUnreadNotificationCount(): number {
  const lastSeen = Number(localStorage.getItem(ADMIN_LAST_SEEN_KEY) ?? 0)
  return getSubmissionNotifications().filter(
    n => new Date(n.submittedAt).getTime() > lastSeen
  ).length
}

export function markNotificationsRead(): void {
  localStorage.setItem(ADMIN_LAST_SEEN_KEY, String(Date.now()))
}

// Dynamic client management (stored in localStorage)
const CUSTOM_CLIENTS_KEY = 'jlp_clients'

export function getCustomClients(): MockClient[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CLIENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}


export function addCustomClient(data: { name: string; phone: string; caseType: string }): MockClient {
  const client: MockClient = {
    id: `client-${Date.now()}`,
    name: data.name,
    phone: data.phone.replace(/\D/g, ''),
    caseType: data.caseType,
    onboardingStatus: 'not_started',
    lastUpdated: new Date().toISOString().split('T')[0],
  }
  const existing = getCustomClients()
  localStorage.setItem(CUSTOM_CLIENTS_KEY, JSON.stringify([...existing, client]))
  return client
}

export function deleteCustomClient(clientId: string): void {
  const updated = getCustomClients().filter(c => c.id !== clientId)
  localStorage.setItem(CUSTOM_CLIENTS_KEY, JSON.stringify(updated))
}

export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`
}

export function maskPhone(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length < 4) return '•••-••••'
  return `(•••) •••-${d.slice(-4)}`
}
