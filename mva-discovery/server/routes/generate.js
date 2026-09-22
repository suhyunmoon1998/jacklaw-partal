import { Anthropic } from '@anthropic-ai/sdk'

const client = new Anthropic()

export default async (req, res) => {
  try {
    const {
      clientName,
      caseNumber,
      caseTypes = [],
      employmentDates,
      jobTitle,
      reportedIssues = [],
      caseSummary,
      clientAnswers = null,
      mode = 'generate'
    } = req.body

    if (!caseSummary || caseTypes.length === 0) {
      return res.status(400).json({ error: 'caseSummary and caseTypes required' })
    }

    const caseTypesStr = caseTypes.join(', ')
    const reportedIssuesStr = reportedIssues.length > 0 ? reportedIssues.join(', ') : 'Not specified'

    let systemPrompt = `You are a labor law attorney specializing in California employment litigation. Generate interrogatories under California CCP §2030.210 that are directly relevant to the client's labor law case.

Return ONLY a JSON array of interrogatory objects, no commentary, no markdown, no code fences.
Each object must have:
{
  "number": "1.1",
  "question": "The complete interrogatory starting with 'INTERROGATORY NO. 1.1: State...'",
  "relevanceReason": "Why this is important for THIS specific case",
  "category": "Identity|Employment History|Discrimination|Wage & Hour|Retaliation|Harassment|Documents|Other"
}

Focus interrogatories on the specific labor law issues in this case. Preserve the formal California discovery format.`

    if (mode === 'smart-filter' && clientAnswers) {
      systemPrompt += `\n\nThe client has provided initial answers. Analyze their answers and return ONLY the most relevant interrogatories (top 15-20) that would uncover critical evidence for their case. Each interrogatory must have a clear relevanceReason explaining how it connects to their specific situation.

Priority: Include interrogatories that will help prove the core legal claims.`
    }

    const userPrompt = `Generate interrogatories for a California labor law case under CCP §2030.210.

Client: ${clientName}
Case Number: ${caseNumber}
Case Types: ${caseTypesStr}
Reported Issues: ${reportedIssuesStr}
${employmentDates ? `Employment Dates: ${employmentDates}` : ''}
${jobTitle ? `Job Title: ${jobTitle}` : ''}

Case Summary:
${caseSummary}

${mode === 'smart-filter' && clientAnswers ? `
Client's Initial Answers:
${Object.entries(clientAnswers)
  .map(([q, a]) => `Q: ${q}\nA: ${a}`)
  .join('\n---\n')}

Analyze the above and recommend the MOST RELEVANT interrogatories for discovering evidence related to their claims.
` : ''}

Generate comprehensive but focused interrogatories that cover:
- Employment history and conditions
- Reasons for termination/discipline
- Comparative treatment of similarly situated employees
- Communication and documentation
- Damages and harm suffered
- Any issue-specific areas (wage/hour calculations, discrimination patterns, retaliation evidence, etc.)

Return only a valid JSON array of interrogatory objects.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ],
      system: systemPrompt
    })

    const responseText = response.content[0].text

    // Strip markdown code fences if present
    let jsonStr = responseText
      .replace(/^```json\n?/, '')
      .replace(/\n?```$/, '')
      .trim()

    const interrogatories = JSON.parse(jsonStr)

    if (!Array.isArray(interrogatories)) {
      throw new Error('Response is not an array')
    }

    // Add IDs based on index if not present
    const withIds = interrogatories.map((rog, idx) => ({
      id: `rog-${idx + 1}`,
      ...rog
    }))

    res.json({
      interrogatories: withIds,
      count: withIds.length,
      mode,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error generating interrogatories:', error.message)
    res.status(500).json({
      error: 'Failed to generate interrogatories',
      message: error.message
    })
  }
}
