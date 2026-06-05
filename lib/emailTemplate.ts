import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import { AnswerValue } from '@/types'

function formatAnswer(val: AnswerValue): string {
  if (!val) return '<em style="color:#9ca3af;">Not answered</em>'
  if (Array.isArray(val)) {
    if (val.length === 0) return '<em style="color:#9ca3af;">Not answered</em>'
    return val.map(v => `• ${v}`).join('<br/>')
  }
  const s = String(val).trim()
  if (!s) return '<em style="color:#9ca3af;">Not answered</em>'
  if (s === 'yes') return '✓ Yes'
  if (s === 'no') return '✗ No'
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
  answers: Record<string, AnswerValue>
): string {
  const sectionsHtml = QUESTIONNAIRE_SECTIONS.map(section => {
    const answeredQuestions = section.questions.filter(q => hasAnswer(answers[q.id]))
    if (answeredQuestions.length === 0) return ''

    const questionsHtml = answeredQuestions.map(q => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;vertical-align:top;width:38%;color:#6b7280;font-size:13px;line-height:1.6;">
          ${q.label}
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;vertical-align:top;color:#111827;font-size:13px;line-height:1.6;font-weight:500;">
          ${formatAnswer(answers[q.id])}
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
