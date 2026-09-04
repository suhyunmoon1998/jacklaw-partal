import { Lang } from '@/lib/langs'
import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import { AnswerValue, QuestionnaireSection, Question } from '@/types'

function formatAnswer(val: AnswerValue, question?: Question): string {
  if (!val) return '<em style="color:#9ca3af;">Not answered</em>'
  if (Array.isArray(val)) {
    if (val.length === 0) return '<em style="color:#9ca3af;">Not answered</em>'
    return val.map(v => `• ${v}`).join('<br/>')
  }
  const s = String(val).trim()
  if (!s) return '<em style="color:#9ca3af;">Not answered</em>'
  if (s === 'yes') return '✓ Yes'
  if (s === 'no') return '✗ No'
  if (s === 'not_sure') return '? Not Sure'
  if (question?.type === 'currency') return `$${s}`
  return s.replace(/\n/g, '<br/>')
}

function hasAnswer(val: AnswerValue | undefined): boolean {
  if (!val) return false
  if (Array.isArray(val)) return val.length > 0
  return String(val).trim().length > 0
}

export function generateIntakeEmailHtml(
  clientName: string,
  caseType: string,
  submittedAt: string,
  answers: Record<string, AnswerValue>,
  /**
   * The sections to print. Defaults to the intake questionnaire, which is what
   * every caller wanted while it was the only one; a wage-and-hour submission
   * passes its own, with that client's repeating branches already expanded.
   */
  sections: QuestionnaireSection[] = QUESTIONNAIRE_SECTIONS
): string {
  const sectionsHtml = sections.map(section => {
    const answeredQuestions = section.questions.filter(q => hasAnswer(answers[q.id]))
    if (answeredQuestions.length === 0) return ''

    const questionsHtml = answeredQuestions.map(q => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;vertical-align:top;width:38%;color:#6b7280;font-size:13px;line-height:1.6;">
          ${q.label}
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;vertical-align:top;color:#111827;font-size:13px;line-height:1.6;font-weight:500;">
          ${formatAnswer(answers[q.id], q)}
        </td>
      </tr>
    `).join('')

    return `
      <div style="margin-bottom:28px;">
        <div style="background:#111111;padding:10px 16px;border-radius:8px 8px 0 0;">
          <h3 style="margin:0;color:#E07820;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${section.title}</h3>
        </div>
        <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <tbody>${questionsHtml}</tbody>
        </table>
      </div>
    `
  }).filter(Boolean).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Client Intake — ${clientName}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">

  <!-- Header -->
  <div style="background:#000000;padding:36px 24px;text-align:center;">
    <p style="margin:0 0 6px 0;color:#E07820;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">Law Offices of Jack D. Josephson, APC</p>
    <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:900;letter-spacing:0.04em;">866 JACKLAW</h1>
    <p style="margin:10px 0 0 0;display:inline-block;background:#E07820;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:4px 14px;border-radius:99px;">New Client Intake</p>
  </div>

  <!-- Client summary bar -->
  <div style="background:#E07820;padding:16px 24px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="vertical-align:top;padding-right:16px;">
          <p style="margin:0;color:rgba(0,0,0,0.5);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Client</p>
          <p style="margin:3px 0 0 0;color:#000000;font-size:16px;font-weight:800;">${clientName}</p>
        </td>
        <td style="vertical-align:top;padding-right:16px;">
          <p style="margin:0;color:rgba(0,0,0,0.5);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Case Type</p>
          <p style="margin:3px 0 0 0;color:#000000;font-size:16px;font-weight:800;">${caseType}</p>
        </td>
        <td style="vertical-align:top;text-align:right;">
          <p style="margin:0;color:rgba(0,0,0,0.5);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Submitted</p>
          <p style="margin:3px 0 0 0;color:#000000;font-size:13px;font-weight:600;">${submittedAt}</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Body -->
  <div style="max-width:680px;margin:0 auto;padding:32px 24px;">

    <!-- Privilege notice -->
    <div style="background:#fff7ed;border-left:4px solid #E07820;border-radius:4px;padding:12px 16px;margin-bottom:28px;">
      <p style="margin:0;color:#7c2d12;font-size:12px;font-weight:700;">⚖ ATTORNEY-CLIENT PRIVILEGED &amp; CONFIDENTIAL</p>
      <p style="margin:4px 0 0 0;color:#9a3412;font-size:12px;line-height:1.6;">
        This document contains confidential attorney-client privileged information intended solely for authorized personnel
        at the Law Offices of Jack D. Josephson, APC. Do not forward or disclose to unauthorized parties.
      </p>
    </div>

    <!-- Sections -->
    ${sectionsHtml}

    <!-- Footer -->
    <div style="border-top:2px solid #e5e7eb;padding-top:24px;margin-top:8px;text-align:center;">
      <p style="margin:0;color:#111111;font-weight:800;font-size:14px;">Law Offices of Jack D. Josephson, APC</p>
      <p style="margin:4px 0 0 0;color:#9ca3af;font-size:11px;">California Employment Law · Attorney-Client Confidential</p>
      <p style="margin:4px 0 0 0;color:#9ca3af;font-size:11px;">Generated by JACKLAW Client Portal · ${submittedAt}</p>
    </div>
  </div>

</body>
</html>`.trim()
}

export function generateClientThankYouEmailHtml(clientName: string, calendlyUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Thank You — Law Offices of Jack D. Josephson, APC</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">

  <!-- Header -->
  <div style="background:#000000;padding:36px 24px;text-align:center;">
    <p style="margin:0 0 6px 0;color:#E07820;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">Law Offices of Jack D. Josephson, APC</p>
    <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:900;letter-spacing:0.04em;">866 JACKLAW</h1>
  </div>

  <!-- Body -->
  <div style="max-width:560px;margin:0 auto;padding:36px 24px;">
    <h2 style="margin:0 0 12px 0;color:#111827;font-size:22px;font-weight:800;">Thank you, ${clientName}!</h2>
    <p style="margin:0 0 16px 0;color:#374151;font-size:14px;line-height:1.7;">
      We've received your intake questionnaire. Our legal team will review your information, and we would
      like to schedule a consultation with you to discuss your case in more detail.
    </p>
    <p style="margin:0 0 24px 0;color:#374151;font-size:14px;line-height:1.7;">
      Please use the link below to pick a time that works for you:
    </p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${calendlyUrl}" style="display:inline-block;background:#E07820;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:99px;">
        Schedule Your Consultation
      </a>
    </div>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:8px;">
      <p style="margin:0;color:#b91c1c;font-size:12px;font-weight:700;">Do not use this portal or email for emergencies.</p>
      <p style="margin:4px 0 0 0;color:#991b1b;font-size:12px;">For urgent matters, please call our office directly.</p>
    </div>

    <!-- Footer -->
    <div style="border-top:2px solid #e5e7eb;padding-top:20px;margin-top:24px;text-align:center;">
      <p style="margin:0;color:#111111;font-weight:800;font-size:14px;">Law Offices of Jack D. Josephson, APC</p>
      <p style="margin:4px 0 0 0;color:#9ca3af;font-size:11px;">California Employment Law · Attorney-Client Confidential</p>
    </div>
  </div>

</body>
</html>`.trim()
}

/**
 * Sent when an admin releases one specific question set to a client. The link
 * points at that client's own assignment, never at the shared template.
 */
const ASSIGNMENT_EMAIL_COPY = {
  en: {
    title: (s: string) => `${s} — Law Offices of Jack D. Josephson, APC`,
    greeting: (n: string) => `Hello ${n},`,
    intro: 'Our office has a short set of questions for you about your case.',
    questions: (n: number) => `${n} question${n === 1 ? '' : 's'}`,
    autosave: 'Your answers save automatically, so you can stop partway and pick up where you left off.',
    cta: 'Answer the Questions',
    fallback: 'If the button does not work, paste this into your browser:',
    emergencyTitle: 'Do not use this portal or email for emergencies.',
    emergencyBody: 'For urgent matters, please call our office directly.',
    footer: 'California Employment Law · Attorney-Client Confidential',
  },
  es: {
    title: (s: string) => `${s} — Oficinas Legales de Jack D. Josephson, APC`,
    greeting: (n: string) => `Hola ${n}:`,
    intro: 'Nuestra oficina tiene unas preguntas cortas para usted sobre su caso.',
    questions: (n: number) => `${n} pregunta${n === 1 ? '' : 's'}`,
    autosave: 'Sus respuestas se guardan solas, así que puede parar y seguir después donde se quedó.',
    cta: 'Responder las Preguntas',
    fallback: 'Si el botón no funciona, copie esta dirección en su navegador:',
    emergencyTitle: 'No use este portal ni el correo para emergencias.',
    emergencyBody: 'Para asuntos urgentes, por favor llame directamente a nuestra oficina.',
    footer: 'Derecho Laboral de California · Confidencial Abogado-Cliente',
  },
  zh: {
    title: (s: string) => `${s} — Jack D. Josephson 律师事务所`,
    greeting: (n: string) => `${n} 您好：`,
    intro: '本所有几个关于您案件的简短问题想请您回答。',
    questions: (n: number) => `共 ${n} 题`,
    autosave: '您的答案会自动保存，中途停下也可以随时回来接着填。',
    cta: '开始回答',
    fallback: '如果按钮无法使用，请把下面的网址复制到浏览器中打开：',
    emergencyTitle: '紧急情况请勿使用本门户或电子邮件。',
    emergencyBody: '如有急事，请直接致电本所。',
    footer: '加州劳动法 · 律师与当事人保密',
  },
  ko: {
    title: (s: string) => `${s} — Jack D. Josephson 법률사무소`,
    greeting: (n: string) => `${n} 님, 안녕하세요.`,
    intro: '저희 사무실에서 고객님 사건에 대해 짧은 질문 몇 가지를 드리려 합니다.',
    questions: (n: number) => `총 ${n}문항`,
    autosave: '답변은 자동으로 저장되므로, 중간에 멈추셨다가 이어서 하셔도 됩니다.',
    cta: '질문에 답하기',
    fallback: '버튼이 작동하지 않으면 아래 주소를 브라우저에 붙여넣어 주세요:',
    emergencyTitle: '긴급한 일에는 이 포털이나 이메일을 사용하지 마세요.',
    emergencyBody: '급한 사안은 사무실로 직접 전화해 주세요.',
    footer: '캘리포니아 노동법 · 변호사-의뢰인 비밀유지',
  },
} as const

export function generateAssignmentEmailHtml(
  clientName: string,
  setName: string,
  questionCount: number,
  link: string,
  lang: Lang = 'en'
): string {
  const c = ASSIGNMENT_EMAIL_COPY[lang]
  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${c.title(setName)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">

  <!-- Header -->
  <div style="background:#000000;padding:36px 24px;text-align:center;">
    <p style="margin:0 0 6px 0;color:#E07820;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">Law Offices of Jack D. Josephson, APC</p>
    <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:900;letter-spacing:0.04em;">866 JACKLAW</h1>
  </div>

  <!-- Body -->
  <div style="max-width:560px;margin:0 auto;padding:36px 24px;">
    <h2 style="margin:0 0 12px 0;color:#111827;font-size:22px;font-weight:800;">${c.greeting(clientName)}</h2>
    <p style="margin:0 0 16px 0;color:#374151;font-size:14px;line-height:1.7;">${c.intro}</p>

    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 4px 0;color:#111827;font-size:17px;font-weight:800;">${setName}</p>
      <p style="margin:0;color:#6b7280;font-size:13px;">${c.questions(questionCount)}</p>
    </div>

    <p style="margin:0 0 24px 0;color:#374151;font-size:14px;line-height:1.7;">${c.autosave}</p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${link}" style="display:inline-block;background:#E07820;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:99px;">
        ${c.cta}
      </a>
    </div>

    <p style="margin:0 0 24px 0;color:#9ca3af;font-size:12px;line-height:1.6;word-break:break-all;text-align:center;">
      ${c.fallback}<br/>${link}
    </p>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:8px;">
      <p style="margin:0;color:#b91c1c;font-size:12px;font-weight:700;">${c.emergencyTitle}</p>
      <p style="margin:4px 0 0 0;color:#991b1b;font-size:12px;">${c.emergencyBody}</p>
    </div>

    <!-- Footer -->
    <div style="border-top:2px solid #e5e7eb;padding-top:20px;margin-top:24px;text-align:center;">
      <p style="margin:0;color:#111111;font-weight:800;font-size:14px;">Law Offices of Jack D. Josephson, APC</p>
      <p style="margin:4px 0 0 0;color:#9ca3af;font-size:11px;">${c.footer}</p>
    </div>
  </div>

</body>
</html>`.trim()
}

/** Tells the firm a client finished one assigned question set. */
export function generateAssignmentCompletedEmailHtml(
  clientName: string,
  setName: string,
  completedAt: string,
  questions: Question[],
  answers: Record<string, AnswerValue>
): string {
  const rows = questions
    .filter(q => hasAnswer(answers[q.id]))
    .map(q => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;vertical-align:top;width:38%;color:#6b7280;font-size:13px;line-height:1.6;">
          ${q.label}
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;vertical-align:top;color:#111827;font-size:13px;line-height:1.6;font-weight:500;">
          ${formatAnswer(answers[q.id], q)}
        </td>
      </tr>`).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${setName} completed — ${clientName}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">

  <div style="background:#000000;padding:28px 24px;text-align:center;">
    <p style="margin:0 0 6px 0;color:#E07820;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">Question Set Completed</p>
    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;">${clientName}</h1>
  </div>

  <div style="max-width:680px;margin:0 auto;padding:28px 20px;">
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:18px 22px;margin-bottom:20px;">
      <p style="margin:0 0 4px 0;color:#111827;font-size:17px;font-weight:800;">${setName}</p>
      <p style="margin:0;color:#6b7280;font-size:13px;">Completed ${completedAt}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      ${rows || '<tr><td style="padding:16px;color:#9ca3af;font-size:13px;">No answers recorded.</td></tr>'}
    </table>

    <div style="border-top:2px solid #e5e7eb;padding-top:20px;margin-top:24px;text-align:center;">
      <p style="margin:0;color:#111111;font-weight:800;font-size:14px;">Law Offices of Jack D. Josephson, APC</p>
      <p style="margin:4px 0 0 0;color:#9ca3af;font-size:11px;">California Employment Law · Attorney-Client Confidential</p>
    </div>
  </div>

</body>
</html>`.trim()
}
