export default function Step4DraftResponses({ draft, caseData, onBack, onReset }) {
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(draft).then(() => {
      alert('Copied to clipboard!')
    }).catch(err => {
      alert('Failed to copy: ' + err.message)
    })
  }

  const handleDownload = () => {
    const element = document.createElement('a')
    const file = new Blob([draft], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `GFROG_Responses_${caseData.caseNumber}_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=900,height=600')
    printWindow.document.write('<pre>' + draft + '</pre>')
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="card">
      <h2>Step 4: Draft Formal Responses</h2>

      <div style={{ marginBottom: '1.5rem' }}>
        <p><strong>Case:</strong> {caseData.clientName}</p>
        <p><strong>Case Number:</strong> {caseData.caseNumber}</p>
        <p><strong>Case Types:</strong> {caseData.caseTypes.join(', ')}</p>
        <p style={{ color: '#e74c3c', marginTop: '1rem', fontSize: '0.9rem' }}>
          ⚠️ This is an AI-generated draft. An attorney MUST review, edit, and approve all responses before filing.
        </p>
      </div>

      <div className="output-box">{draft}</div>

      <div className="button-group">
        <button className="btn-primary" onClick={handleCopyToClipboard}>
          📋 Copy to Clipboard
        </button>
        <button className="btn-primary" onClick={handleDownload}>
          💾 Download as Text
        </button>
        <button className="btn-secondary" onClick={handlePrint}>
          🖨️ Print
        </button>
      </div>

      <div className="button-group">
        <button className="btn-secondary" onClick={onBack}>
          ← Revise Answers
        </button>
        <button className="btn-success" onClick={onReset}>
          ✨ Start New Case
        </button>
      </div>
    </div>
  )
}
