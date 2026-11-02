import { escapeHtml } from '@/lib/emailTemplate'
import { FIRM_PHONE_DISPLAY } from '@/lib/contact'
import { Lang } from '@/lib/langs'
import { DURATION_MINUTES, OFFICE_TIME_ZONE } from './config'
import { CONFLICT_LABEL, ConflictHit, needsReview } from './conflicts'

/**
 * Every email a consultation sends: to the client in their language, and to
 * the office in English.
 *
 * Rendering is kept apart from sending (lib/consultations/notify.ts) so the
 * wording of each can be read in a test without Resend.
 */

export interface BookingForEmail {
  id: string
  name: string
  email: string
  phone: string
  lang: Lang
  start: Date
  end: Date
  meetUrl: string | null
  manageUrl: string
  hostName: string
  adverseParty: string
  otherParties: string
  summary: string
  conflicts: ConflictHit[] | null
}

export type ClientEmailKind = 'booked' | 'reminder' | 'cancelled-by-client' | 'cancelled-by-office'

const LOCALE: Record<Lang, string> = { en: 'en-US', es: 'es-US', zh: 'zh-CN', ko: 'ko-KR' }

const PACIFIC: Record<Lang, string> = {
  en: 'Pacific Time',
  es: 'hora del Pacífico',
  zh: '太平洋时间',
  ko: '태평양 시간',
}

/** "Tuesday, November 4, 2026 at 10:00 AM (Pacific Time)", in the client's language. */
export function formatWhen(start: Date, lang: Lang): string {
  const when = new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: OFFICE_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(start)
  return `${when} (${PACIFIC[lang]})`
}

const COPY = {
  en: {
    subject: {
      booked: (w: string) => `Your consultation is booked — ${w}`,
      reminder: (w: string) => `Reminder: your consultation is tomorrow — ${w}`,
      'cancelled-by-client': () => 'Your consultation is cancelled',
      'cancelled-by-office': () => 'Our office cancelled your consultation',
    },
    heading: {
      booked: 'Your consultation is booked',
      reminder: 'Your consultation is tomorrow',
      'cancelled-by-client': 'Your consultation is cancelled',
      'cancelled-by-office': 'Your consultation is cancelled',
    },
    greeting: (n: string) => `Hello ${n},`,
    intro: {
      booked: 'Thank you for contacting our office. Your free consultation is confirmed.',
      reminder: 'This is a reminder of your free consultation with our office.',
      'cancelled-by-client': 'As you asked, we cancelled your consultation. Nothing else is needed from you.',
      'cancelled-by-office': 'We are sorry — our office had to cancel your consultation. Please choose a new time, or call us.',
    },
    when: 'When',
    how: 'How',
    video: (m: number) => `Google Meet video call · ${m} minutes`,
    join: 'Join the video call',
    joinHint: 'Open this link at the time of your consultation. It works on a phone or a computer.',
    noLink: 'We will email you the video link before the consultation.',
    prepare: 'If you have papers such as pay stubs, a termination letter, or text messages from work, please keep them nearby.',
    manage: 'Need to cancel or pick a different time?',
    manageCta: 'Manage my booking',
    bookAgain: 'Choose a new time',
    notLawyer: 'Booking a consultation does not by itself make this office your lawyer.',
    calendar: 'The attached file adds this consultation to your calendar.',
    emergencyTitle: 'Do not use this portal or email for emergencies.',
    emergencyBody: `For urgent matters, please call our office at ${FIRM_PHONE_DISPLAY}.`,
    footer: 'California Employment Law · Attorney-Client Confidential',
    eventTitle: 'Consultation — 866 JACK LAW',
  },
  es: {
    subject: {
      booked: (w: string) => `Su consulta está reservada — ${w}`,
      reminder: (w: string) => `Recordatorio: su consulta es mañana — ${w}`,
      'cancelled-by-client': () => 'Su consulta fue cancelada',
      'cancelled-by-office': () => 'Nuestra oficina canceló su consulta',
    },
    heading: {
      booked: 'Su consulta está reservada',
      reminder: 'Su consulta es mañana',
      'cancelled-by-client': 'Su consulta fue cancelada',
      'cancelled-by-office': 'Su consulta fue cancelada',
    },
    greeting: (n: string) => `Hola ${n}:`,
    intro: {
      booked: 'Gracias por comunicarse con nuestra oficina. Su consulta gratuita está confirmada.',
      reminder: 'Le recordamos su consulta gratuita con nuestra oficina.',
      'cancelled-by-client': 'Como lo pidió, cancelamos su consulta. No necesita hacer nada más.',
      'cancelled-by-office': 'Lo sentimos: nuestra oficina tuvo que cancelar su consulta. Por favor elija un nuevo horario o llámenos.',
    },
    when: 'Cuándo',
    how: 'Cómo',
    video: (m: number) => `Videollamada por Google Meet · ${m} minutos`,
    join: 'Entrar a la videollamada',
    joinHint: 'Abra este enlace a la hora de su consulta. Funciona en un teléfono o una computadora.',
    noLink: 'Le enviaremos el enlace de video por correo antes de la consulta.',
    prepare: 'Si tiene documentos como talones de pago, una carta de despido o mensajes de texto del trabajo, téngalos a la mano.',
    manage: '¿Necesita cancelar o elegir otro horario?',
    manageCta: 'Administrar mi cita',
    bookAgain: 'Elegir un nuevo horario',
    notLawyer: 'Reservar una consulta no hace, por sí solo, que esta oficina sea su abogado.',
    calendar: 'El archivo adjunto agrega esta consulta a su calendario.',
    emergencyTitle: 'No use este portal ni el correo para emergencias.',
    emergencyBody: `Para asuntos urgentes, llame a nuestra oficina al ${FIRM_PHONE_DISPLAY}.`,
    footer: 'Derecho Laboral de California · Confidencial Abogado-Cliente',
    eventTitle: 'Consulta — 866 JACK LAW',
  },
  zh: {
    subject: {
      booked: (w: string) => `您的咨询已预约 — ${w}`,
      reminder: (w: string) => `提醒：您的咨询在明天 — ${w}`,
      'cancelled-by-client': () => '您的咨询已取消',
      'cancelled-by-office': () => '本所取消了您的咨询',
    },
    heading: {
      booked: '您的咨询已预约',
      reminder: '您的咨询在明天',
      'cancelled-by-client': '您的咨询已取消',
      'cancelled-by-office': '您的咨询已取消',
    },
    greeting: (n: string) => `${n} 您好：`,
    intro: {
      booked: '感谢您联系本所。您的免费咨询已确认。',
      reminder: '提醒您与本所的免费咨询。',
      'cancelled-by-client': '已按您的要求取消咨询，您无需再做任何事。',
      'cancelled-by-office': '非常抱歉，本所不得不取消您的咨询。请重新选择时间，或致电本所。',
    },
    when: '时间',
    how: '方式',
    video: (m: number) => `Google Meet 视频通话 · ${m} 分钟`,
    join: '加入视频通话',
    joinHint: '请在咨询时间打开此链接，手机或电脑都可以使用。',
    noLink: '咨询开始前，我们会把视频链接通过电子邮件发给您。',
    prepare: '如果您有工资单、解雇信或工作上的短信等资料，请放在手边。',
    manage: '需要取消或改时间吗？',
    manageCta: '管理我的预约',
    bookAgain: '重新选择时间',
    notLawyer: '预约咨询本身并不代表本所成为您的律师。',
    calendar: '附件可以把这次咨询加入您的日历。',
    emergencyTitle: '紧急情况请勿使用本门户或电子邮件。',
    emergencyBody: `如有急事，请致电本所：${FIRM_PHONE_DISPLAY}。`,
    footer: '加州劳动法 · 律师与当事人保密',
    eventTitle: '咨询 — 866 JACK LAW',
  },
  ko: {
    subject: {
      booked: (w: string) => `상담 예약이 완료되었습니다 — ${w}`,
      reminder: (w: string) => `알림: 내일 상담이 있습니다 — ${w}`,
      'cancelled-by-client': () => '상담이 취소되었습니다',
      'cancelled-by-office': () => '사무실에서 상담을 취소했습니다',
    },
    heading: {
      booked: '상담 예약이 완료되었습니다',
      reminder: '내일 상담이 있습니다',
      'cancelled-by-client': '상담이 취소되었습니다',
      'cancelled-by-office': '상담이 취소되었습니다',
    },
    greeting: (n: string) => `${n} 님, 안녕하세요.`,
    intro: {
      booked: '저희 사무실에 연락해 주셔서 감사합니다. 무료 상담이 확정되었습니다.',
      reminder: '저희 사무실과의 무료 상담 일정을 알려 드립니다.',
      'cancelled-by-client': '요청하신 대로 상담을 취소했습니다. 따로 하실 일은 없습니다.',
      'cancelled-by-office': '죄송합니다. 사무실 사정으로 상담을 취소하게 되었습니다. 새 시간을 고르시거나 전화해 주세요.',
    },
    when: '일시',
    how: '방식',
    video: (m: number) => `Google Meet 화상 통화 · ${m}분`,
    join: '화상 통화 참여하기',
    joinHint: '상담 시간에 이 링크를 열어 주세요. 휴대폰이나 컴퓨터에서 모두 됩니다.',
    noLink: '상담 전에 화상 통화 링크를 이메일로 보내 드리겠습니다.',
    prepare: '급여명세서, 해고 통지서, 직장에서 받은 문자 같은 자료가 있으면 가까이 두세요.',
    manage: '취소하거나 다른 시간으로 바꾸시려면',
    manageCta: '내 예약 관리',
    bookAgain: '새 시간 고르기',
    notLawyer: '상담 예약만으로 저희 사무실이 고객님의 변호인이 되는 것은 아닙니다.',
    calendar: '첨부 파일을 열면 이 상담이 캘린더에 추가됩니다.',
    emergencyTitle: '긴급한 일에는 이 포털이나 이메일을 사용하지 마세요.',
    emergencyBody: `급한 사안은 사무실(${FIRM_PHONE_DISPLAY})로 직접 전화해 주세요.`,
    footer: '캘리포니아 노동법 · 변호사-의뢰인 비밀유지',
    eventTitle: '상담 — 866 JACK LAW',
  },
} as const

export function clientEmailSubject(kind: ClientEmailKind, b: BookingForEmail): string {
  return COPY[b.lang].subject[kind](formatWhen(b.start, b.lang))
}

export function eventTitle(lang: Lang): string {
  return COPY[lang].eventTitle
}

const button = (href: string, label: string) => `
    <div style="text-align:center;margin:0 0 12px 0;">
      <a href="${escapeHtml(href)}" style="display:inline-block;background:#E07820;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:99px;">${label}</a>
    </div>`

function shell(lang: Lang, title: string, body: string, footer: string): string {
  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="background:#000000;padding:36px 24px;text-align:center;">
    <p style="margin:0 0 6px 0;color:#E07820;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">Law Offices of Jack D. Josephson, APC</p>
    <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:900;letter-spacing:0.04em;">866 JACKLAW</h1>
  </div>
  <div style="max-width:560px;margin:0 auto;padding:36px 24px;">
    ${body}
    <div style="border-top:2px solid #e5e7eb;padding-top:20px;margin-top:24px;text-align:center;">
      <p style="margin:0;color:#111111;font-weight:800;font-size:14px;">Law Offices of Jack D. Josephson, APC</p>
      <p style="margin:4px 0 0 0;color:#9ca3af;font-size:11px;">${footer}</p>
    </div>
  </div>
</body>
</html>`.trim()
}

/** What the client is sent when they book, the day before, and when it is cancelled. */
export function clientEmailHtml(kind: ClientEmailKind, b: BookingForEmail, bookUrl: string): string {
  const c = COPY[b.lang]
  const when = formatWhen(b.start, b.lang)
  const cancelled = kind === 'cancelled-by-client' || kind === 'cancelled-by-office'
  const p = (text: string, extra = '') =>
    `<p style="margin:0 0 16px 0;color:#374151;font-size:14px;line-height:1.7;${extra}">${text}</p>`

  const details = `
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:18px 22px;margin-bottom:24px;">
      <p style="margin:0 0 2px 0;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">${c.when}</p>
      <p style="margin:0 0 14px 0;color:#111827;font-size:16px;font-weight:800;${cancelled ? 'text-decoration:line-through;' : ''}">${escapeHtml(when)}</p>
      <p style="margin:0 0 2px 0;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">${c.how}</p>
      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">${c.video(DURATION_MINUTES)}</p>
    </div>`

  const join = b.meetUrl
    ? `${button(b.meetUrl, c.join)}
    <p style="margin:0 0 24px 0;color:#6b7280;font-size:12px;line-height:1.6;text-align:center;">${c.joinHint}<br/><span style="word-break:break-all;">${escapeHtml(b.meetUrl)}</span></p>`
    : p(c.noLink)

  const body = cancelled
    ? `
    <h2 style="margin:0 0 12px 0;color:#111827;font-size:22px;font-weight:800;">${c.heading[kind]}</h2>
    ${p(escapeHtml(c.greeting(b.name)), 'margin-bottom:8px;')}
    ${p(c.intro[kind])}
    ${details}
    ${button(bookUrl, c.bookAgain)}`
    : `
    <h2 style="margin:0 0 12px 0;color:#111827;font-size:22px;font-weight:800;">${c.heading[kind]}</h2>
    ${p(escapeHtml(c.greeting(b.name)), 'margin-bottom:8px;')}
    ${p(c.intro[kind])}
    ${details}
    ${join}
    ${p(c.prepare)}
    ${kind === 'booked' ? p(c.calendar, 'color:#6b7280;font-size:12px;') : ''}
    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:8px;text-align:center;">
      <p style="margin:0 0 12px 0;color:#374151;font-size:13px;">${c.manage}</p>
      <a href="${escapeHtml(b.manageUrl)}" style="color:#C06010;font-size:14px;font-weight:700;">${c.manageCta}</a>
    </div>
    <p style="margin:24px 0 16px 0;color:#9ca3af;font-size:12px;line-height:1.6;">${c.notLawyer}</p>`

  return shell(
    b.lang,
    c.heading[kind],
    `${body}
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-top:16px;">
      <p style="margin:0;color:#b91c1c;font-size:12px;font-weight:700;">${c.emergencyTitle}</p>
      <p style="margin:4px 0 0 0;color:#991b1b;font-size:12px;">${c.emergencyBody}</p>
    </div>`,
    c.footer
  )
}

/** 20261104T170000Z */
const icsTime = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Folds and escapes one iCalendar text value. */
function icsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

const utf8 = new TextEncoder()

/** Lines longer than 75 octets continue on the next, after a space (RFC 5545 §3.1). */
function fold(line: string): string {
  const out: string[] = []
  let current = ''
  let octets = 0
  for (const ch of line) {
    const size = utf8.encode(ch).length
    if (octets + size > 75) {
      out.push(current)
      current = ' '
      octets = 1
    }
    current += ch
    octets += size
  }
  out.push(current)
  return out.join('\r\n')
}

/** The attachment that puts the consultation on the client's own calendar. */
export function consultationIcs(b: BookingForEmail, now = new Date()): string {
  const c = COPY[b.lang]
  const description = [b.meetUrl ? `${c.join}: ${b.meetUrl}` : c.noLink, `${c.manageCta}: ${b.manageUrl}`].join('\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JACKLAW Portal//Consultations//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${b.id}@jacklaw-portal`,
    `DTSTAMP:${icsTime(now)}`,
    `DTSTART:${icsTime(b.start)}`,
    `DTEND:${icsTime(b.end)}`,
    `SUMMARY:${icsText(c.eventTitle)}`,
    `DESCRIPTION:${icsText(description)}`,
    ...(b.meetUrl ? [`LOCATION:${icsText(b.meetUrl)}`, `URL:${icsText(b.meetUrl)}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(c.eventTitle)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(fold)
    .join('\r\n')
}

/**
 * What goes on the host's calendar event. The client is a guest on it and may
 * see it, so only what they gave us and a link that needs the admin password.
 */
export function calendarDescription(b: Pick<BookingForEmail, 'name' | 'phone' | 'email' | 'adverseParty'>, adminUrl: string): string {
  return [
    'Free consultation booked on the JACKLAW portal.',
    '',
    `Name: ${b.name}`,
    `Phone: ${b.phone}`,
    `Email: ${b.email}`,
    `Employer / other side: ${b.adverseParty}`,
    '',
    `Conflict check and details (staff): ${adminUrl}`,
  ].join('\n')
}

const officeRow = (label: string, value: string) => `
      <tr>
        <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;vertical-align:top;width:34%;color:#6b7280;font-size:13px;">${label}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;vertical-align:top;color:#111827;font-size:13px;font-weight:500;">${value || '<em style="color:#9ca3af;">—</em>'}</td>
      </tr>`

function conflictsHtml(hits: ConflictHit[] | null): string {
  if (hits === null) {
    return `<div style="background:#fffbeb;border-left:4px solid #d97706;padding:12px 16px;margin-bottom:20px;border-radius:4px;">
      <p style="margin:0;color:#92400e;font-size:13px;font-weight:700;">Conflict check did not run.</p>
      <p style="margin:4px 0 0 0;color:#92400e;font-size:12px;">Check the names by hand before the consultation.</p>
    </div>`
  }
  if (!hits.length) {
    return `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;margin-bottom:20px;border-radius:4px;">
      <p style="margin:0;color:#166534;font-size:13px;font-weight:700;">No names matched a client or an earlier consultation.</p>
      <p style="margin:4px 0 0 0;color:#166534;font-size:12px;">An automated name match only. It is not a cleared conflict check.</p>
    </div>`
  }
  const urgent = needsReview(hits)
  const items = hits
    .map(
      h => `<li style="margin:0 0 6px 0;">${CONFLICT_LABEL[h.kind]}: <strong>${escapeHtml(h.ours)}</strong> ↔ ${escapeHtml(h.theirs)} (${h.role}, ${h.source === 'client' ? 'client file' : 'consultation'} of ${escapeHtml(h.recordLabel)})</li>`
    )
    .join('')
  return `<div style="background:${urgent ? '#fef2f2' : '#fffbeb'};border-left:4px solid ${urgent ? '#dc2626' : '#d97706'};padding:12px 16px;margin-bottom:20px;border-radius:4px;">
      <p style="margin:0 0 8px 0;color:${urgent ? '#991b1b' : '#92400e'};font-size:13px;font-weight:700;">${urgent ? 'Possible conflict — an attorney should review before the consultation.' : 'Worth knowing before the consultation.'}</p>
      <ul style="margin:0;padding-left:18px;color:#374151;font-size:12px;line-height:1.6;">${items}</ul>
    </div>`
}

/** Tells the office about a new booking, with the conflict check's result first. */
export function officeBookedHtml(b: BookingForEmail, adminUrl: string): string {
  const when = formatWhen(b.start, 'en')
  return shell(
    'en',
    `Consultation booked — ${b.name}`,
    `
    <h2 style="margin:0 0 6px 0;color:#111827;font-size:20px;font-weight:800;">Consultation booked</h2>
    <p style="margin:0 0 20px 0;color:#374151;font-size:14px;">${escapeHtml(when)} · with ${escapeHtml(b.hostName)}</p>
    ${conflictsHtml(b.conflicts)}
    <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
      ${officeRow('Name', escapeHtml(b.name))}
      ${officeRow('Phone', escapeHtml(b.phone))}
      ${officeRow('Email', escapeHtml(b.email))}
      ${officeRow('Language', b.lang.toUpperCase())}
      ${officeRow('Employer / other side', escapeHtml(b.adverseParty))}
      ${officeRow('Others involved', escapeHtml(b.otherParties))}
      ${officeRow('What happened', escapeHtml(b.summary).replace(/\n/g, '<br/>'))}
      ${officeRow('Video', b.meetUrl ? `<a href="${escapeHtml(b.meetUrl)}">${escapeHtml(b.meetUrl)}</a>` : 'No Meet link was made — send one by hand.')}
    </table>
    ${button(adminUrl, 'Open in the admin panel')}`,
    'Attorney-Client Confidential · Generated by JACKLAW Client Portal'
  )
}

export function officeCancelledHtml(b: BookingForEmail, by: 'client' | 'office', adminUrl: string): string {
  const when = formatWhen(b.start, 'en')
  return shell(
    'en',
    `Consultation cancelled — ${b.name}`,
    `
    <h2 style="margin:0 0 6px 0;color:#111827;font-size:20px;font-weight:800;">Consultation cancelled</h2>
    <p style="margin:0 0 20px 0;color:#374151;font-size:14px;">${escapeHtml(b.name)} · ${escapeHtml(when)} · ${by === 'client' ? 'cancelled by the client' : 'cancelled by the office'}</p>
    <p style="margin:0 0 20px 0;color:#374151;font-size:14px;">The event was taken off ${escapeHtml(b.hostName)}'s calendar and the time is open again.</p>
    ${button(adminUrl, 'Open in the admin panel')}`,
    'Attorney-Client Confidential · Generated by JACKLAW Client Portal'
  )
}
