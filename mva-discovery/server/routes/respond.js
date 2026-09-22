import { Anthropic } from '@anthropic-ai/sdk'

const client = new Anthropic()

export default async (req, res) => {
  try {
    const {
      clientName,
      caseNumber,
      caseTypes = [],
      jurisdiction = 'California Superior Court',
      objectionPosture = 'standard',
      pairs = [] // Array of { question, answer }
    } = req.body

    if (!clientName || !caseNumber || pairs.length === 0) {
      return res.status(400).json({ error: 'clientName, caseNumber, and pairs required' })
    }

    const objectionGuide = {
      standard: 'Include standard objections (overbroad, vague, ambiguous, calls for legal conclusion, privilege) where genuinely warranted. Answer subject to and without waiving objections.',
      minimal: 'Provide full, complete answers. Minimize objections — only object to clearly privileged material or attorney-client communications.',
      protective: 'Object broadly wherever arguable (overbroad, vague, ambiguous, burdensome, calls for speculation, attorney-client privilege, work product). Then provide limited answer.',
      privacy: 'Focus objections on privacy, personnel records, attorney-client privilege, and confidential business information. Protect sensitive employment data.'
    }

    const selectedGuide = objectionGuide[objectionPosture] || objectionGuide.standard

    const systemPrompt = `You are a labor law attorney drafting formal interrogatory responses under California CCP §2030.210.

Your task:
1. Convert client's plain-language answers into properly formatted legal responses
2. Preserve all factual content EXACTLY — do not add, change, or omit facts
3. Transform casual language into formal legal prose
4. Apply appropriate objections: ${selectedGuide}
5. Format each response starting with "RESPONSE TO INTERROGATORY NO. [N]:"

Output only the formatted response document. No preamble or commentary.`

    const pairsFormatted = pairs
      .map(({ question, answer }, idx) => {
        // Extract number if present
        const numberMatch = question.match(/INTERROGATORY NO\. ([\d.]+)/)
        const num = numberMatch ? numberMatch[1] : idx + 1

        return `INTERROGATORY NO. ${num}:
${question.replace(/^INTERROGATORY NO\. [\d.]+:\s*/, '').trim()}

CLIENT'S ANSWER:
${answer.trim()}`
      })
      .join('\n---\n')

    const userPrompt = `Draft formal interrogatory responses for:

Responding Party: ${clientName}
Case Number: ${caseNumber}
Case Types: ${caseTypes.join(', ')}
Jurisdiction: ${jurisdiction}

${pairsFormatted}

---

Format each response as:
RESPONSE TO INTERROGATORY NO. [N]:
[Objections if applicable. Statement: "Subject to and without waiving the foregoing objections, Responding Party responds as follows:"]
[The substantive answer, preserving client's facts exactly]

Responding Party reserves the right to supplement, modify, and/or change these responses.

VERIFICATION:
I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.

Executed on: _____________
Signature: _________________________________
Name (printed): _________________________________`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ],
      system: systemPrompt
    })

    const draft = response.content[0].text

    res.json({
      draft,
      clientName,
      caseNumber,
      caseTypes,
      objectionPosture,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error generating responses:', error.message)
    res.status(500).json({
      error: 'Failed to generate responses',
      message: error.message
    })
  }
}
