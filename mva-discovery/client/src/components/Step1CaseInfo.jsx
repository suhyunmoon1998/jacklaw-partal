import { useState } from 'react'

const CASE_TYPES = [
  'Discrimination (race, gender, age, disability)',
  'Wage & Hour Violations',
  'Wrongful Termination',
  'Harassment / Hostile Work Environment',
  'Retaliation',
  'FMLA Violations',
  'Failure to Accommodate',
  'Breach of Contract'
]

const ISSUES = [
  'Identity & Contact',
  'Employment History',
  'Termination/Discipline',
  'Discrimination Evidence',
  'Harassment/Retaliation',
  'Wage Calculation',
  'Medical/Disability',
  'Witness Information',
  'Documentation',
  'Damages'
]

export default function Step1CaseInfo({ data, onNext }) {
  const [formData, setFormData] = useState(data)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
      if (name === 'caseTypes') {
        setFormData(prev => ({
          ...prev,
          caseTypes: checked
            ? [...prev.caseTypes, value]
            : prev.caseTypes.filter(ct => ct !== value)
        }))
      } else if (name === 'reportedIssues') {
        setFormData(prev => ({
          ...prev,
          reportedIssues: checked
            ? [...prev.reportedIssues, value]
            : prev.reportedIssues.filter(ri => ri !== value)
        }))
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleNext = () => {
    const newErrors = {}

    if (!formData.clientName.trim()) newErrors.clientName = 'Required'
    if (!formData.caseNumber.trim()) newErrors.caseNumber = 'Required'
    if (formData.caseTypes.length === 0) newErrors.caseTypes = 'Select at least one'
    if (!formData.caseSummary.trim()) newErrors.caseSummary = 'Required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onNext(formData)
  }

  return (
    <div className="card">
      <h2>Step 1: Case Information</h2>

      <div className="form-group">
        <label>Client's Full Legal Name *</label>
        <input
          type="text"
          name="clientName"
          value={formData.clientName}
          onChange={handleChange}
          placeholder="e.g., Jane Smith"
        />
        {errors.clientName && <span style={{ color: '#e74c3c' }}>{errors.clientName}</span>}
      </div>

      <div className="form-group">
        <label>Case Number *</label>
        <input
          type="text"
          name="caseNumber"
          value={formData.caseNumber}
          onChange={handleChange}
          placeholder="e.g., 24STCV00123"
        />
        {errors.caseNumber && <span style={{ color: '#e74c3c' }}>{errors.caseNumber}</span>}
      </div>

      <div className="form-group">
        <label>Case Types (Select all that apply) *</label>
        <div className="checkbox-group">
          {CASE_TYPES.map(type => (
            <div key={type} className="checkbox-chip">
              <input
                type="checkbox"
                id={`case-${type}`}
                name="caseTypes"
                value={type}
                checked={formData.caseTypes.includes(type)}
                onChange={handleChange}
              />
              <label htmlFor={`case-${type}`}>{type}</label>
            </div>
          ))}
        </div>
        {errors.caseTypes && <span style={{ color: '#e74c3c' }}>{errors.caseTypes}</span>}
      </div>

      <div className="form-group">
        <label>Employment Dates</label>
        <input
          type="text"
          name="employmentDates"
          value={formData.employmentDates}
          onChange={handleChange}
          placeholder="e.g., January 2020 - September 2024"
        />
      </div>

      <div className="form-group">
        <label>Job Title</label>
        <input
          type="text"
          name="jobTitle"
          value={formData.jobTitle}
          onChange={handleChange}
          placeholder="e.g., Senior Software Engineer"
        />
      </div>

      <div className="form-group">
        <label>Issues Reported (Check relevant areas)</label>
        <div className="checkbox-group">
          {ISSUES.map(issue => (
            <div key={issue} className="checkbox-chip">
              <input
                type="checkbox"
                id={`issue-${issue}`}
                name="reportedIssues"
                value={issue}
                checked={formData.reportedIssues.includes(issue)}
                onChange={handleChange}
              />
              <label htmlFor={`issue-${issue}`}>{issue}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Brief Case Summary *</label>
        <textarea
          name="caseSummary"
          value={formData.caseSummary}
          onChange={handleChange}
          placeholder="Summarize the key facts of the case. E.g., Employee was terminated after reporting workplace discrimination. Prior performance reviews were positive but employment was terminated one week after protected complaint."
        />
        {errors.caseSummary && <span style={{ color: '#e74c3c' }}>{errors.caseSummary}</span>}
      </div>

      <div className="button-group">
        <button className="btn-primary" onClick={handleNext}>
          Next: Generate Interrogatories
        </button>
      </div>
    </div>
  )
}
