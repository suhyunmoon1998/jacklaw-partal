/**
 * Visual metadata for the intake questionnaire.
 *
 * The questionnaire data itself (EN + ES) is untouched — this file only adds a
 * chapter grouping and an icon per section so the 20 sections stop looking
 * identical to each other. Keyed by section id, which is shared between
 * questionnaireData.ts and questionnaireDataEs.ts.
 */

export type ChapterId = 'basics' | 'pay' | 'records' | 'events' | 'wrap'

export type ChapterLabelKey = 'qc_basics' | 'qc_pay' | 'qc_records' | 'qc_events' | 'qc_wrap'

export const CHAPTER_LABEL: Record<ChapterId, ChapterLabelKey> = {
  basics: 'qc_basics',
  pay: 'qc_pay',
  records: 'qc_records',
  events: 'qc_events',
  wrap: 'qc_wrap',
}

interface SectionMeta {
  chapter: ChapterId
  /** Stroke-only SVG paths, drawn in a 24×24 viewBox. */
  icon: readonly string[]
}

const ICONS = {
  user: ['M16 7a4 4 0 11-8 0 4 4 0 018 0z', 'M5 21a7 7 0 0114 0'],
  building: [
    'M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16',
    'M3 21h18',
    'M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2',
  ],
  calendar: [
    'M8 7V3m8 4V3m-9 8h10',
    'M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  ],
  briefcase: [
    'M16 6V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v1',
    'M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    'M3 12.5A24 24 0 0012 14a24 24 0 009-1.5',
  ],
  cash: [
    'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2',
    'M9 20h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z',
    'M16 15a2 2 0 11-4 0 2 2 0 014 0z',
  ],
  clock: ['M12 8v4l3 3', 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z'],
  clipboard: [
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2',
    'M9 5a2 2 0 002 2h2a2 2 0 002-2 2 2 0 00-2-2h-2a2 2 0 00-2 2z',
    'M9 12l2 2 4-4',
  ],
  mug: [
    'M4 8h11v6a4 4 0 01-4 4H8a4 4 0 01-4-4V8z',
    'M15 10h2a2 2 0 110 4h-2',
    'M7 4.5V3M10 4.5V3M13 4.5V3',
  ],
  pause: ['M10 9v6m4-6v6', 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z'],
  bolt: ['M13 10V3L4 14h7v7l9-11h-7z'],
  document: [
    'M9 12h6m-6 4h6',
    'M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  ],
  list: ['M9 6h12M9 12h12M9 18h12', 'M4 6h.01M4 12h.01M4 18h.01'],
  refund: ['M3 10h11a7 7 0 017 7v2', 'M3 10l5 5M3 10l5-5'],
  exit: ['M17 16l4-4-4-4', 'M21 12H9', 'M13 8V6a3 3 0 00-3-3H6a3 3 0 00-3 3v12a3 3 0 003 3h4a3 3 0 003-3v-2'],
  shieldAlert: ['M12 3l7 4v5c0 4.418-3 8.418-7 9-4-.582-7-4.582-7-9V7l7-4z', 'M12 9v3m0 3h.01'],
  heart: [
    'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  ],
  alert: [
    'M12 9v3m0 3.5h.01',
    'M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z',
  ],
  users: [
    'M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    'M6 20v-1a5 5 0 0110 0v1',
    'M18 9.5a2 2 0 11-3 1.72',
    'M18 20v-1a4 4 0 00-1.2-2.85',
  ],
  folder: ['M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'],
  chat: [
    'M8 12h.01M12 12h.01M16 12h.01',
    'M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  ],
} as const

export const SECTION_META: Record<string, SectionMeta> = {
  contact: { chapter: 'basics', icon: ICONS.user },
  employer: { chapter: 'basics', icon: ICONS.building },
  dates_worked: { chapter: 'basics', icon: ICONS.calendar },
  position: { chapter: 'basics', icon: ICONS.briefcase },

  pay_rate: { chapter: 'pay', icon: ICONS.cash },
  schedule: { chapter: 'pay', icon: ICONS.clock },
  timekeeping: { chapter: 'pay', icon: ICONS.clipboard },
  meal_breaks: { chapter: 'pay', icon: ICONS.mug },
  rest_breaks: { chapter: 'pay', icon: ICONS.pause },
  overtime: { chapter: 'pay', icon: ICONS.bolt },

  final_wages: { chapter: 'records', icon: ICONS.document },
  wage_statements: { chapter: 'records', icon: ICONS.list },
  reimbursements: { chapter: 'records', icon: ICONS.refund },

  wrongful_termination: { chapter: 'events', icon: ICONS.exit },
  retaliation: { chapter: 'events', icon: ICONS.shieldAlert },
  disability_leave: { chapter: 'events', icon: ICONS.heart },
  harassment: { chapter: 'events', icon: ICONS.alert },

  witnesses: { chapter: 'wrap', icon: ICONS.users },
  documents_available: { chapter: 'wrap', icon: ICONS.folder },
  additional: { chapter: 'wrap', icon: ICONS.chat },
}

const FALLBACK: SectionMeta = { chapter: 'wrap', icon: ICONS.document }

export function sectionMeta(sectionId: string): SectionMeta {
  return SECTION_META[sectionId] ?? FALLBACK
}
