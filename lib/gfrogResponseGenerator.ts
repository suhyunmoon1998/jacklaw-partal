// Generates formal GFROG responses from client intake form answers
// Converts plain-language answers into discovery response format
// Follows California civil procedure rules for requests for admissions

import {
  GFROG_SECTIONS,
  type GFROGInterrogatory,
} from './gfrogData'
import {
  INTAKE_TO_GFROG_MAPPING,
  getIntakeQuestionsForGFROG,
} from './gfrogIntakeMapping'

export type ResponseType = 'admit' | 'deny' | 'conditional-admit' | 'conditional-deny' | 'object'

export interface ObjectionType {
  type: 'vague' | 'speculation' | 'overbroad' | 'specificity' | 'legal-conclusion' | 'custom'
  description: string
}

export interface GFROGDraftResponse {
  interrogatoryNumber: string
  interrogatoryLabel: string
  interrogatoryText: string // Full question text
  intakeAnswers: Array<{ question: string; answer: string }>
  responseType: ResponseType
  mainResponse: string // "Admit", "Deny", "Admit to the extent that...", etc.
  objections: ObjectionType[]
  detailedExplanation: string // Optional detailed reasoning
  supplementalResponse: string // Brief final response
  draftResponse: string // Full formatted response
  relevantGFROGNumber: string
}

export interface GFROGResponseSet {
  matterName: string
  propoundingParty: string
  respondingParty: string
  setNumber: string
  generatedDate: string
  caseNumber?: string
  judge?: string
  department?: string
  responses: GFROGDraftResponse[]
}

// Standard boilerplate language for legal responses
const BOILERPLATE = {
  openingObjection:
    'Responding Party refers to and incorporates by reference its General Objections set forth hereinabove. Subject to and without waiving the aforementioned objections, Responding Party responds as follows:',
  reservationClause:
    'Responding Party reserves the right to supplement, modify, and/or change this response.',
  objectionPrefix: 'Defendant objects to the Request on the grounds that',
  objectionConnector: 'Defendant further objects to the Request on the grounds that',
} as const

const OBJECTION_LANGUAGE = {
  vague: (term?: string) =>
    `stating Defendant${term ? ` "${term}"` : ''} is abstract, vague, and general, and otherwise lacks specificity to enable Defendant to determine precisely what admission is being requested`,
  speculation: () => 'it calls for speculation',
  overbroad: (term: string) => `it is overbroad as to "${term}", which does not provide a specified time frame to which Defendant can apply its admission to`,
  specificity: (term?: string) =>
    `it lacks specificity${term ? ` regarding "${term}"` : ''} to enable Defendant to determine precisely what is being requested`,
  legalConclusion: () => 'it calls for a legal conclusion',
} as const

function formatAnswerForResponse(answer: unknown): string {
  if (answer === null || answer === undefined) {
    return '(No answer provided)'
  }

  if (typeof answer === 'boolean') {
    return answer ? 'Yes' : 'No'
  }

  if (Array.isArray(answer)) {
    if (answer.length === 0) {
      return '(No items listed)'
    }
    return answer.join(', ')
  }

  if (typeof answer === 'object') {
    return JSON.stringify(answer, null, 2)
  }

  return String(answer).trim()
}

function shouldRaiseObjection(interrogatory: GFROGInterrogatory): ObjectionType[] {
  const objections: ObjectionType[] = []

  // Heuristic: overly broad or vague questions should get objections
  const questionText = interrogatory.label.toLowerCase()

  if (questionText.includes('any') && questionText.includes('all')) {
    objections.push({
      type: 'overbroad',
      description: 'the request uses broad temporal or factual scope',
    })
  }

  return objections
}

function determineResponseType(
  intakeAnswers: Array<{ question: string; answer: string }>
): ResponseType {
  if (intakeAnswers.length === 0) {
    return 'object'
  }

  // Simple heuristic: if all answers are affirmative, suggest admit
  const hasNegativeAnswer = intakeAnswers.some(
    a => a.answer.toLowerCase().includes('no') || a.answer.toLowerCase().includes('deny')
  )

  return hasNegativeAnswer ? 'deny' : 'admit'
}

function generateFormalResponse(
  interrogatoryNumber: string,
  interrogatoryLabel: string,
  interrogatoryText: string,
  intakeAnswers: Array<{ question: string; answer: string }>,
  objections: ObjectionType[]
): { mainResponse: string; explanation: string; supplemental: string } {
  const responseType = determineResponseType(intakeAnswers)

  let mainResponse = ''
  let explanation = ''

  if (objections.length > 0) {
    // Build objection language
    const objectionsList = objections
      .map((obj, idx) => {
        let text = idx === 0 ? BOILERPLATE.objectionPrefix : BOILERPLATE.objectionConnector
        if (obj.type === 'vague') {
          text += ` ${OBJECTION_LANGUAGE.vague()}`
        } else if (obj.type === 'speculation') {
          text += ` ${OBJECTION_LANGUAGE.speculation()}`
        } else if (obj.type === 'overbroad') {
          text += ` ${OBJECTION_LANGUAGE.overbroad('the request')}`
        } else if (obj.type === 'specificity') {
          text += ` ${OBJECTION_LANGUAGE.specificity()}`
        } else {
          text += ` ${obj.description}`
        }
        text += '.'
        return text
      })
      .join(' ')

    mainResponse = `${objectionsList} Subject to and without waiving the aforementioned objections, Defendant responds as follows:`

    if (intakeAnswers.length > 0) {
      explanation = formatAnswersForExplanation(intakeAnswers)
    } else {
      explanation = 'Deny. The request is unclear and calls for impermissible objections.'
    }
  } else {
    // No objections - generate direct response
    if (intakeAnswers.length === 0) {
      mainResponse = 'Admit to the extent that this interrogatory is not applicable to the facts of this case. [ATTORNEY: Please review.]'
    } else if (responseType === 'admit') {
      mainResponse = 'Admit.'
      explanation = formatAnswersForExplanation(intakeAnswers)
    } else {
      mainResponse = 'Deny.'
      explanation = `Defendant responds as follows: ${formatAnswersForExplanation(intakeAnswers)}`
    }
  }

  const supplemental = responseType === 'admit' ? 'Admit.' : 'Deny.'

  return {
    mainResponse,
    explanation,
    supplemental,
  }
}

function formatAnswersForExplanation(answers: Array<{ question: string; answer: string }>): string {
  if (answers.length === 0) return ''
  return answers.map(({ question, answer }) => `${question}: ${answer}`).join(' ')
}

export function generateGFROGResponses(
  matterName: string,
  respondingParty: string,
  setNumber: string,
  selectedGFROGNumbers: string[],
  intakeAnswers: Record<string, unknown>,
  propoundingParty: string = 'Plaintiff',
  caseNumber?: string,
  judge?: string,
  department?: string
): GFROGResponseSet {
  const responses: GFROGDraftResponse[] = []

  for (const gfrogNum of selectedGFROGNumbers.sort((a, b) => parseFloat(a) - parseFloat(b))) {
    // Find the interrogatory details
    let interrogatory: GFROGInterrogatory | undefined

    for (const section of GFROG_SECTIONS) {
      interrogatory = section.interrogatories.find(i => i.number === gfrogNum)
      if (interrogatory) break
    }

    if (!interrogatory) continue

    // Find all intake questions that map to this GFROG number
    const relevantMappings = getIntakeQuestionsForGFROG(gfrogNum)

    // Collect answers from intake form that relate to this interrogatory
    const relatedAnswers: Array<{ question: string; answer: string }> = []

    for (const mapping of relevantMappings) {
      const answer = intakeAnswers[mapping.intakeQuestionId]
      if (answer !== null && answer !== undefined && answer !== '') {
        relatedAnswers.push({
          question: mapping.intakeLabel,
          answer: formatAnswerForResponse(answer),
        })
      }
    }

    // Determine objections
    const objections = shouldRaiseObjection(interrogatory)

    // Generate response components
    const responseType = determineResponseType(relatedAnswers)
    const { mainResponse, explanation, supplemental } = generateFormalResponse(
      gfrogNum,
      interrogatory.label,
      interrogatory.label,
      relatedAnswers,
      objections
    )

    // Build full formatted response
    const draftResponse = buildFormattedResponse(
      gfrogNum,
      interrogatory.label,
      mainResponse,
      explanation,
      supplemental
    )

    responses.push({
      interrogatoryNumber: gfrogNum,
      interrogatoryLabel: interrogatory.label,
      interrogatoryText: interrogatory.label,
      intakeAnswers: relatedAnswers,
      responseType,
      mainResponse,
      objections,
      detailedExplanation: explanation,
      supplementalResponse: supplemental,
      draftResponse,
      relevantGFROGNumber: gfrogNum,
    })
  }

  return {
    matterName,
    propoundingParty,
    respondingParty,
    setNumber,
    generatedDate: new Date().toLocaleDateString('en-US'),
    caseNumber,
    judge,
    department,
    responses,
  }
}

function buildFormattedResponse(
  interrogatoryNumber: string,
  interrogatoryLabel: string,
  mainResponse: string,
  explanation: string,
  supplemental: string
): string {
  let formatted = `REQUEST FOR ADMISSION NO. ${interrogatoryNumber}:\n\n`
  formatted += `${interrogatoryLabel}\n\n`
  formatted += `RESPONSE TO REQUEST FOR ADMISSION NO. ${interrogatoryNumber}:\n\n`
  formatted += `${mainResponse}\n`

  if (explanation) {
    formatted += `\n${explanation}`
  }

  formatted += `\n\n${BOILERPLATE.reservationClause}\n\n`
  formatted += `SUPPLEMENTAL RESPONSE TO REQUEST FOR ADMISSION NO. ${interrogatoryNumber}:\n\n`
  formatted += `${supplemental}`

  return formatted
}

export function exportGFROGResponsesToText(responseSet: GFROGResponseSet): string {
  let text = ''

  // Case caption header
  if (responseSet.caseNumber) {
    text += buildCaseCaption(responseSet)
  }

  text += `\n${'='.repeat(80)}\n\n`

  // Title
  text += `DEFENDANT ${responseSet.respondingParty.toUpperCase()}'S\n`
  text += `RESPONSES TO ${responseSet.propoundingParty.toUpperCase()}'S\n`
  text += `REQUEST FOR ADMISSIONS, SET ${responseSet.setNumber}\n\n`

  text += `${'='.repeat(80)}\n\n`

  // Responses
  for (const response of responseSet.responses) {
    text += response.draftResponse
    text += `\n\n${'-'.repeat(80)}\n\n`
  }

  // Footer with verification/signature block
  text += `[END OF RESPONSES]\n\n`
  text += `[VERIFICATION - To be added by attorney]\n\n`
  text += `I declare under penalty of perjury under the laws of the State of California that the\n`
  text += `foregoing is true and correct.\n\n`
  text += `Executed on: [DATE] at [LOCATION]\n`
  text += `_________________________\n`
  text += `[SIGNATURE]\n`
  text += `[PRINTED NAME]\n\n`

  text += `NOTES FOR ATTORNEY:\n`
  text += `1. This document was generated from client intake form answers.\n`
  text += `2. Each response includes related intake answers for reference.\n`
  text += `3. Review and revise all responses for legal accuracy and completeness.\n`
  text += `4. Add or refine objections where appropriate under discovery rules.\n`
  text += `5. Remove attorney notes and placeholders before filing.\n`
  text += `6. Verify all responses comply with California Code of Civil Procedure.\n`
  text += `7. Include proof of service with filed document.\n`

  return text
}

function buildCaseCaption(responseSet: GFROGResponseSet): string {
  let caption = ''
  caption += `SUPERIOR COURT OF THE STATE OF CALIFORNIA\n`
  caption += `[COUNTY]\n\n`
  caption += `[PLAINTIFF NAME], An Individual\n`
  caption += `Plaintiff,\n\n`
  caption += `vs.\n\n`
  caption += `[DEFENDANT NAME],\n`
  caption += `Defendants\n\n`
  caption += `CASE NO. ${responseSet.caseNumber || '[CASE NO.]'}\n`
  if (responseSet.judge) {
    caption += `Hon. ${responseSet.judge}\n`
  }
  if (responseSet.department) {
    caption += `Dept. ${responseSet.department}\n`
  }

  return caption
}

export function exportGFROGResponsesToHTML(responseSet: GFROGResponseSet): string {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>GFROG Responses - ${responseSet.matterName}</title>
  <style>
    body { font-family: 'Times New Roman', serif; line-height: 1.5; margin: 1in; color: #000; }
    .caption { text-align: center; margin-bottom: 20px; font-weight: bold; }
    .title { text-align: center; margin: 30px 0; font-weight: bold; text-decoration: underline; }
    .header { text-align: center; margin-bottom: 30px; font-size: 0.95em; }
    .response { margin-bottom: 30px; page-break-inside: avoid; }
    .response-header { font-weight: bold; text-decoration: underline; margin-bottom: 10px; }
    .intake-source { margin-left: 20px; font-size: 0.9em; color: #444; margin-bottom: 15px; padding: 10px; background: #f0f0f0; }
    .intake-source strong { color: #000; }
    .response-text { margin: 15px 0; padding-left: 20px; white-space: pre-wrap; font-family: 'Courier New', monospace; }
    .divider { border-top: 1px solid #000; margin: 20px 0; }
    .notes { margin-top: 40px; padding: 15px; background: #fffacd; border: 1px solid #ddd; font-size: 0.9em; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #000; font-size: 0.85em; }
    @media print { body { margin: 0.5in; } }
  </style>
</head>
<body>
  <div class="caption">
    SUPERIOR COURT OF THE STATE OF CALIFORNIA<br/>
    [COUNTY]
  </div>

  <div class="title">
    ${responseSet.respondingParty.toUpperCase()}'S<br/>
    RESPONSES TO ${responseSet.propoundingParty.toUpperCase()}'S<br/>
    REQUEST FOR ADMISSIONS, SET ${responseSet.setNumber}
  </div>

  <div class="header">
    <p><strong>Matter:</strong> ${responseSet.matterName}</p>
    <p><strong>Case No.:</strong> ${responseSet.caseNumber || '[Case Number]'}</p>
    <p><strong>Responding Party:</strong> ${responseSet.respondingParty}</p>
    <p><strong>Propounding Party:</strong> ${responseSet.propoundingParty}</p>
    <p><strong>Generated:</strong> ${responseSet.generatedDate}</p>
  </div>

  <div class="divider"></div>`

  // Responses
  for (const response of responseSet.responses) {
    html += `
  <div class="response">
    <div class="response-header">REQUEST FOR ADMISSION NO. ${response.interrogatoryNumber}:</div>
    <div class="response-text">${escapeHtml(response.interrogatoryText)}</div>

    <div class="response-header">RESPONSE TO REQUEST FOR ADMISSION NO. ${response.interrogatoryNumber}:</div>`

    if (response.intakeAnswers.length > 0) {
      html += `
    <div class="intake-source">
      <strong>Related Intake Answers:</strong><br/>`
      for (const answer of response.intakeAnswers) {
        html += `<strong>${escapeHtml(answer.question)}:</strong> ${escapeHtml(answer.answer)}<br/>`
      }
      html += `</div>`
    }

    html += `
    <div class="response-text">${escapeHtml(response.draftResponse)}</div>
  </div>`
  }

  html += `
  <div class="divider"></div>

  <div class="notes">
    <strong>NOTES FOR ATTORNEY:</strong>
    <ol>
      <li>This document was generated from client intake form answers.</li>
      <li>Related intake answers are shown for each interrogatory to provide context.</li>
      <li>Review and revise all responses for legal accuracy and completeness.</li>
      <li>Refine objections to comply with California Code of Civil Procedure § 2030.240.</li>
      <li>Remove all attorney notes and placeholders before filing with court.</li>
      <li>Include proper case caption and attorney information headers.</li>
      <li>Add verification under penalty of perjury before execution.</li>
      <li>File proof of service with the court.</li>
    </ol>
  </div>

  <div class="footer">
    <p>[END OF RESPONSES]</p>
    <p style="margin-top: 30px;">
      VERIFICATION<br/>
      [To be completed by attorney]<br/>
      Date: ________________<br/>
      Signature: _________________________________
    </p>
  </div>
</body>
</html>`

  return html
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m])
}
