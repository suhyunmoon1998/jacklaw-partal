import { useState } from 'react'
import StepBar from './components/StepBar'
import Step1CaseInfo from './components/Step1CaseInfo'
import Step2Interrogatories from './components/Step2Interrogatories'
import Step3ClientAnswers from './components/Step3ClientAnswers'
import Step4DraftResponses from './components/Step4DraftResponses'

export default function App() {
  const [step, setStep] = useState(1)
  const [caseData, setCaseData] = useState({
    clientName: '',
    caseNumber: '',
    caseTypes: [],
    employmentDates: '',
    jobTitle: '',
    reportedIssues: [],
    caseSummary: ''
  })

  const [interrogatories, setInterrogatories] = useState([])
  const [answers, setAnswers] = useState({})
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)

  const handleNextStep = (newData = null) => {
    if (newData) {
      setCaseData(prev => ({ ...prev, ...newData }))
    }
    setStep(prev => prev + 1)
  }

  const handleBackStep = () => {
    setStep(prev => Math.max(1, prev - 1))
  }

  const handleStepClick = (stepNum) => {
    if (stepNum <= step) {
      setStep(stepNum)
    }
  }

  return (
    <div>
      <header className="header">
        <h1>⚖️ Labor Law Discovery Generator</h1>
        <p>Generate interrogatories and formal responses for employment law cases</p>
      </header>

      <main>
        <StepBar currentStep={step} onStepClick={handleStepClick} />

        {step === 1 && (
          <Step1CaseInfo
            data={caseData}
            onNext={handleNextStep}
          />
        )}

        {step === 2 && (
          <Step2Interrogatories
            caseData={caseData}
            interrogatories={interrogatories}
            setInterrogatories={setInterrogatories}
            onNext={handleNextStep}
            onBack={handleBackStep}
          />
        )}

        {step === 3 && (
          <Step3ClientAnswers
            interrogatories={interrogatories}
            answers={answers}
            setAnswers={setAnswers}
            caseData={caseData}
            onNext={handleNextStep}
            onBack={handleBackStep}
            setLoading={setLoading}
            setDraft={setDraft}
          />
        )}

        {step === 4 && (
          <Step4DraftResponses
            draft={draft}
            caseData={caseData}
            onBack={handleBackStep}
            onReset={() => {
              setStep(1)
              setCaseData({
                clientName: '',
                caseNumber: '',
                caseTypes: [],
                employmentDates: '',
                jobTitle: '',
                reportedIssues: [],
                caseSummary: ''
              })
              setInterrogatories([])
              setAnswers({})
              setDraft('')
            }}
          />
        )}
      </main>
    </div>
  )
}
