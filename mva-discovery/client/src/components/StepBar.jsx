export default function StepBar({ currentStep, onStepClick }) {
  const steps = [
    { num: 1, label: 'Case Info' },
    { num: 2, label: 'Interrogatories' },
    { num: 3, label: 'Client Answers' },
    { num: 4, label: 'Draft Responses' }
  ]

  return (
    <div className="step-bar">
      {steps.map(s => (
        <div
          key={s.num}
          className={`step ${currentStep === s.num ? 'active' : ''} ${
            s.num < currentStep ? 'completed' : ''
          }`}
          onClick={() => onStepClick(s.num)}
        >
          <div className="step-number">
            {s.num < currentStep ? '✓' : s.num}
          </div>
          <div className="step-label">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
