/**
 * MOCK DATA — FOR DEVELOPMENT ONLY
 *
 * In production, replace this with real database queries.
 * Client data must be stored in an encrypted, HIPAA/attorney-client
 * privilege-compliant backend (e.g., Supabase with RLS, or a custom API).
 *
 * Phone numbers here are digits-only and completely fictional.
 * Do NOT use real client names or phone numbers here.
 */

import { MockClient } from '@/types'

export const MOCK_CLIENTS: MockClient[] = [
  {
    id: 'client-001',
    name: 'Client A',
    phone: '5550001',        // User types: 555-0001 or (555) 000-1
    caseType: 'Wage & Hour',
    onboardingStatus: 'in_progress',
    lastUpdated: '2026-05-20',
  },
  {
    id: 'client-002',
    name: 'Client B',
    phone: '5550002',        // User types: 555-0002
    caseType: 'Wrongful Termination',
    onboardingStatus: 'not_started',
    lastUpdated: '2026-05-28',
  },
]

export const DOCUMENT_CATEGORIES = [
  'Paystubs',
  'W-2 Forms',
  '1099 Forms',
  'Time Records / Timesheets',
  'Work Schedules',
  'Text Messages',
  'Emails',
  'Termination Letter',
  "Doctor's Notes / Medical Records",
  'Photographs / Videos',
  'Company Handbook / Policies',
  'Employment Contract',
  'Performance Reviews',
  'Warning Letters / Write-Ups',
  'Other Documents',
]

// MOCK ADMIN PASSWORD — replace with real auth (e.g., Clerk, Auth0, or Firebase Admin)
export const MOCK_ADMIN_PASSWORD = 'jacklaw'
