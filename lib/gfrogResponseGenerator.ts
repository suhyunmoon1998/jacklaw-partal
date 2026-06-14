// Generates formal GFROG responses from client intake form answers
// Converts plain-language answers into discovery response format

import {
  GFROG_SECTIONS,
  type GFROGInterrogatory,
} from './gfrogData'
import {
  INTAKE_TO_GFROG_MAPPING,
  getIntakeQuestionsForGFROG,
} from './gfrogIntakeMapping'

export interface GFROGDraftResponse {
  interrogatoryNumber: string
  interrogatoryLabel: string
  intakeAnswers: Array<{ question: string; answer: string }>
  draftResponse: string
  relevantGFROGNumber: string
}

export interface GFROGResponseSet {
  matterName: string
  respondingParty: string
  setNumber: string
  generatedDate: string
  responses: GFROGDraftResponse[]
}

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

function generateFormalResponse(
  interrogatoryNumber: string,
  interrogatoryLabel: string,
  intakeAnswers: Array<{ question: string; answer: string }>
): string {
  if (intakeAnswers.length === 0) {
    return `Interrogatory No. ${interrogatoryNumber}: As to this Interrogatory, Responding Party states: This interrogatory is not applicable to the facts of this case. [ATTORNEY: Please review and revise as appropriate.]`
  }

  // Build a comprehensive response from multiple intake answers
  const answerSummary = intakeAnswers
    .map(({ question, answer }) => `- ${question}: ${answer}`)
    .join('\n')

  return `Interrogatory No. ${interrogatoryNumber}: As to this Interrogatory, Responding Party states:

${answerSummary}

Based on the foregoing, Responding Party responds that: [ATTORNEY: Please draft the formal response based on the above information. Consider whether objections apply.]`
}

export function generateGFROGResponses(
  matterName: string,
  respondingParty: string,
  setNumber: string,
  selectedGFROGNumbers: string[],
  intakeAnswers: Record<string, unknown>
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

    // Generate the draft response
    const draftResponse = generateFormalResponse(
      gfrogNum,
      interrogatory.label,
      relatedAnswers
    )

    responses.push({
      interrogatoryNumber: gfrogNum,
      interrogatoryLabel: interrogatory.label,
      intakeAnswers: relatedAnswers,
      draftResponse,
      relevantGFROGNumber: gfrogNum,
    })
  }

  return {
    matterName,
    respondingParty,
    setNumber,
    generatedDate: new Date().toLocaleDateString('en-US'),
    responses,
  }
}

export function exportGFROGResponsesToText(responseSet: GFROGResponseSet): string {
  let text = ''

  // Header
  text += `RESPONSES TO INTERROGATORIES\n`
  text += `Set No. ${responseSet.setNumber}\n\n`
  text += `Matter: ${responseSet.matterName}\n`
  text += `Responding Party: ${responseSet.respondingParty}\n`
  text += `Generated: ${responseSet.generatedDate}\n\n`
  text += '='.repeat(80) + '\n\n'

  // Responses
  for (const response of responseSet.responses) {
    text += `${response.draftResponse}\n\n`
    text += '-'.repeat(80) + '\n\n'
  }

  // Footer
  text += `[END OF RESPONSES]\n\n`
  text += `NOTES FOR ATTORNEY:\n`
  text += `1. This document was generated from client intake form answers.\n`
  text += `2. Review and revise all responses for accuracy and completeness.\n`
  text += `3. Add appropriate objections where necessary.\n`
  text += `4. Verify that all referenced documents are attached.\n`
  text += `5. Ensure responses comply with local court rules.\n`

  return text
}

export function exportGFROGResponsesToHTML(responseSet: GFROGResponseSet): string {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>GFROG Responses - ${responseSet.matterName}</title>
  <style>
    body { font-family: 'Courier New', monospace; line-height: 1.5; margin: 40px; }
    h1 { text-align: center; }
    .header { text-align: center; margin-bottom: 30px; }
    .response { margin-bottom: 30px; page-break-inside: avoid; }
    .response-number { font-weight: bold; margin-bottom: 10px; }
    .intake-answer { margin-left: 20px; font-size: 0.9em; color: #666; }
    .draft { margin: 15px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid #ddd; }
    .divider { border-top: 1px solid #ccc; margin: 20px 0; }
    .notes { margin-top: 40px; padding: 20px; background: #ffffcc; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>RESPONSES TO INTERROGATORIES</h1>
  <div class="header">
    <p><strong>Set No.</strong> ${responseSet.setNumber}</p>
    <p><strong>Matter:</strong> ${responseSet.matterName}</p>
    <p><strong>Responding Party:</strong> ${responseSet.respondingParty}</p>
    <p><strong>Generated:</strong> ${responseSet.generatedDate}</p>
  </div>

  <div class="divider"></div>\n`

  // Responses
  for (const response of responseSet.responses) {
    html += `  <div class="response">
    <div class="response-number">Interrogatory No. ${response.interrogatoryNumber}</div>
    <div class="intake-answer">
      <strong>Related Intake Answers:</strong><br/>`

    for (const answer of response.intakeAnswers) {
      html += `      <em>${answer.question}:</em> ${answer.answer}<br/>`
    }

    html += `    </div>
    <div class="draft"><pre>${response.draftResponse}</pre></div>
  </div>\n`
  }

  html += `
  <div class="notes">
    <h3>Notes for Attorney:</h3>
    <ol>
      <li>This document was generated from client intake form answers.</li>
      <li>Review and revise all responses for accuracy and completeness.</li>
      <li>Add appropriate objections where necessary.</li>
      <li>Verify that all referenced documents are attached.</li>
      <li>Ensure responses comply with local court rules.</li>
    </ol>
  </div>
</body>
</html>`

  return html
}
