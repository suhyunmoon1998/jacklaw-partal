import { useState } from 'react'

export default function Step3ClientAnswers({
  interrogatories,
  answers,
  setAnswers,
  caseData,
  onNext,
  onBack,
  setLoading,
  setDraft
}) {
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleAnswerChange = (id, value) => {
    setAnswers(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const generateResponses = async () => {
    if (Object.keys(answers).length === 0) {
      setError('Please provide at least one answer')
      return
    }

    setGenerating(true)
    setError('')
    setLoading(true)

    try {
      const pairs = interrogatories.map(rog => ({
        question: rog.question,
        answer: answers[rog.id] || ''
      }))

      const response = await fetch('/api/generate-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: caseData.clientName,
          caseNumber: caseData.caseNumber,
          caseTypes: caseData.caseTypes,
          jurisdiction: 'California Superior Court',
          objectionPosture: 'standard',
          pairs
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate responses')
      }

      const data = await response.json()
      setDraft(data.draft)
      onNext()
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2>Step 3: Client Answers</h2>
      <p style={{ marginBottom: '1.5rem', color: '#666' }}>
        Enter the client's answers in plain language. We'll convert these to formal legal responses.
      </p>

      <div>
        {interrogatories.map((rog, idx) => (
          <div key={rog.id} style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #eee' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Question {idx + 1}
            </label>
            <p style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#555' }}>
              {rog.question.replace(/^INTERROGATORY NO\. [\d.]+:\s*/, '').trim()}
            </p>
            <textarea
              value={answers[rog.id] || ''}
              onChange={(e) => handleAnswerChange(rog.id, e.target.value)}
              placeholder="Just tell us in your own words — no legal language needed…"
              style={{ minHeight: '100px' }}
            />
          </div>
        ))}
      </div>

      {error && <p style={{ color: '#e74c3c', marginBottom: '1rem' }}>{error}</p>}

      <div className="button-group">
        <button className="btn-secondary" onClick={onBack} disabled={generating}>
          Back
        </button>
        <button
          className="btn-primary"
          onClick={generateResponses}
          disabled={Object.keys(answers).length === 0 || generating}
        >
          {generating ? (
            <>
              <span className="spinner" style={{ marginRight: '0.5rem' }} /> Generating...
            </>
          ) : (
            '✍️ Generate Formal Responses'
          )}
        </button>
      </div>
    </div>
  )
}
