import { useState } from 'react'

export default function Step2Interrogatories({
  caseData,
  interrogatories,
  setInterrogatories,
  onNext,
  onBack
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generateInterrogatories = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/generate-interrogatories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: caseData.clientName,
          caseNumber: caseData.caseNumber,
          caseTypes: caseData.caseTypes,
          employmentDates: caseData.employmentDates,
          jobTitle: caseData.jobTitle,
          reportedIssues: caseData.reportedIssues,
          caseSummary: caseData.caseSummary,
          mode: 'generate'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate interrogatories')
      }

      const data = await response.json()
      setInterrogatories(data.interrogatories)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addInterrogatory = () => {
    const newId = `rog-${interrogatories.length + 1}`
    setInterrogatories([
      ...interrogatories,
      {
        id: newId,
        number: `${interrogatories.length + 1}.1`,
        question: 'INTERROGATORY NO. XX: ',
        category: 'Other'
      }
    ])
  }

  const deleteInterrogatory = (id) => {
    setInterrogatories(interrogatories.filter(r => r.id !== id))
  }

  const updateQuestion = (id, newText) => {
    setInterrogatories(
      interrogatories.map(r =>
        r.id === id ? { ...r, question: newText } : r
      )
    )
  }

  const handleNext = () => {
    if (interrogatories.length === 0) {
      setError('Please generate or add at least one interrogatory')
      return
    }
    onNext()
  }

  return (
    <div className="card">
      <h2>Step 2: Interrogatories</h2>

      {interrogatories.length === 0 ? (
        <div>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Generate labor law interrogatories based on your case facts, or manually add them below.
          </p>
          <button
            className="btn-success"
            onClick={generateInterrogatories}
            disabled={loading}
            style={{ marginBottom: '1.5rem' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ marginRight: '0.5rem' }} /> Generating...
              </>
            ) : (
              '🤖 Auto-Generate Interrogatories'
            )}
          </button>
          {error && <p style={{ color: '#e74c3c', marginBottom: '1rem' }}>{error}</p>}
        </div>
      ) : (
        <div>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            {interrogatories.length} interrogatories ready. Edit as needed.
          </p>
          <div className="interrogatory-list">
            {interrogatories.map((rog, idx) => (
              <div key={rog.id} className="interrogatory-card">
                <div className="interrogatory-number">{idx + 1}</div>
                <div className="interrogatory-content" style={{ flex: 1 }}>
                  <textarea
                    value={rog.question}
                    onChange={(e) => updateQuestion(rog.id, e.target.value)}
                    style={{ width: '100%' }}
                  />
                  {rog.relevanceReason && (
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      Why: {rog.relevanceReason}
                    </p>
                  )}
                </div>
                <button
                  className="btn-danger"
                  onClick={() => deleteInterrogatory(rog.id)}
                  style={{ height: '40px', padding: '0.5rem' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            className="btn-secondary"
            onClick={addInterrogatory}
            style={{ marginTop: '1rem' }}
          >
            + Add Interrogatory
          </button>
        </div>
      )}

      <div className="button-group">
        <button className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button
          className="btn-primary"
          onClick={handleNext}
          disabled={interrogatories.length === 0 || loading}
        >
          Next: Client Answers
        </button>
      </div>
    </div>
  )
}
