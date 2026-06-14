'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  getIntakeSubmissions,
  type IntakeSubmission,
} from '@/lib/auth'
import {
  GFROG_SECTIONS,
  GFROG_PRESETS,
  expandInterrogatoriesFromPreset,
  type GFROGPreset,
} from '@/lib/gfrogData'
import {
  generateGFROGResponses,
  exportGFROGResponsesToText,
  exportGFROGResponsesToHTML,
  type GFROGResponseSet,
} from '@/lib/gfrogResponseGenerator'

export default function GFROGResponseGeneratorPage() {
  const router = useRouter()
  const [intakeSubmissions, setIntakeSubmissions] = useState<IntakeSubmission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<IntakeSubmission | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<GFROGPreset | null>(null)
  const [matterName, setMatterName] = useState('')
  const [respondingParty, setRespondingParty] = useState('')
  const [setNumber, setSetNumber] = useState('1')
  const [selectedInterrogatories, setSelectedInterrogatories] = useState<Set<string>>(new Set())
  const [generatedResponses, setGeneratedResponses] = useState<GFROGResponseSet | null>(null)
  const [editedResponses, setEditedResponses] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const submissions = getIntakeSubmissions()
    setIntakeSubmissions(submissions)
  }, [])

  const handlePresetSelect = (preset: GFROGPreset) => {
    setSelectedPreset(preset)
    const expanded = expandInterrogatoriesFromPreset(preset)
    const ids = new Set(expanded.map(e => e.interrogatory.id))
    setSelectedInterrogatories(ids)
  }

  const toggleInterrogatory = (id: string) => {
    const next = new Set(selectedInterrogatories)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedInterrogatories(next)
  }

  const generateResponses = () => {
    if (!selectedSubmission || selectedInterrogatories.size === 0 || !matterName || !respondingParty) {
      alert('Please select submission, GFROG set, and fill case info')
      return
    }

    const interrogatoryNumbers = Array.from(selectedInterrogatories)
      .map(id => {
        for (const section of GFROG_SECTIONS) {
          const interrog = section.interrogatories.find(i => i.id === id)
          if (interrog) return interrog.number
        }
        return ''
      })
      .filter(Boolean)

    const responses = generateGFROGResponses(
      matterName,
      respondingParty,
      setNumber,
      interrogatoryNumbers,
      selectedSubmission.answers as Record<string, unknown>
    )

    setGeneratedResponses(responses)
    setEditedResponses({})
  }

  const getEditedResponse = (interrogatoryNumber: string) => {
    return editedResponses[interrogatoryNumber] ?? ''
  }

  const handleEditResponse = (interrogatoryNumber: string, text: string) => {
    setEditedResponses(prev => ({
      ...prev,
      [interrogatoryNumber]: text,
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-black border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Image src="/logo.png" alt="866 JACK LAW" width={40} height={40} className="rounded-sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">JACKLAW</span>
                <span className="bg-gold text-white text-xs font-bold px-2 py-0.5 rounded">ADMIN</span>
              </div>
              <p className="text-white/40 text-xs">GFROG Response Generator</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="text-white/40 hover:text-white text-sm transition-colors"
          >
            Back to Admin
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">GFROG Response Generator</h1>
          <p className="text-gray-600">Auto-generate formal responses from client intake answers</p>
        </div>

        {!generatedResponses ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Selection Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Select Intake Submission */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-black mb-4">1. Select Client Submission</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {intakeSubmissions.length === 0 ? (
                    <p className="text-gray-500">No intake submissions found</p>
                  ) : (
                    intakeSubmissions.map(submission => (
                      <button
                        key={submission.id}
                        onClick={() => setSelectedSubmission(submission)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                          selectedSubmission?.id === submission.id
                            ? 'border-gold bg-gold/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-black text-sm">
                          {new Date(submission.timestamp).toLocaleDateString()} at{' '}
                          {new Date(submission.timestamp).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {submission.reviewed ? '✓ Reviewed' : 'Pending'} •{' '}
                          {Object.keys(submission.answers).length} fields
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Case Information */}
              {selectedSubmission && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-black mb-4">2. Case Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Matter Name</label>
                      <input
                        type="text"
                        value={matterName}
                        onChange={e => setMatterName(e.target.value)}
                        placeholder="e.g., Smith v. ABC Corporation"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Responding Party</label>
                      <input
                        type="text"
                        value={respondingParty}
                        onChange={e => setRespondingParty(e.target.value)}
                        placeholder="e.g., Plaintiff"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Set Number</label>
                      <input
                        type="number"
                        value={setNumber}
                        onChange={e => setSetNumber(e.target.value)}
                        min="1"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Presets */}
              {selectedSubmission && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-black mb-4">3. Select GFROG Template</h2>
                  <div className="space-y-2">
                    {GFROG_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                          selectedPreset?.id === preset.id
                            ? 'border-gold bg-gold/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-black">{preset.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{preset.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Interrogatory Selection */}
              {selectedSubmission && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-black mb-4">
                    4. Fine-Tune Interrogatories ({selectedInterrogatories.size} selected)
                  </h2>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {GFROG_SECTIONS.map(section => (
                      <div key={section.id} className="border-b border-gray-100 pb-4 last:border-0">
                        <h3 className="font-semibold text-black text-sm mb-2">
                          {section.number} {section.title}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {section.interrogatories.map(interrog => (
                            <label key={interrog.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                              <input
                                type="checkbox"
                                checked={selectedInterrogatories.has(interrog.id)}
                                onChange={() => toggleInterrogatory(interrog.id)}
                                className="w-4 h-4 text-gold rounded"
                              />
                              <span className="text-xs text-gray-700">
                                <span className="font-semibold">{interrog.number}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-black mb-6">Summary</h2>

                <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Submission</p>
                    <p className="text-sm text-black font-medium truncate">
                      {selectedSubmission
                        ? new Date(selectedSubmission.timestamp).toLocaleDateString()
                        : '(No submission selected)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Matter</p>
                    <p className="text-sm text-black font-medium truncate">{matterName || '(No name)'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">GFROG Set</p>
                    <p className="text-sm text-black font-medium truncate">
                      {selectedPreset?.name || 'Manual selection'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Interrogatories</p>
                    <p className="text-sm text-gold font-bold">{selectedInterrogatories.size} selected</p>
                  </div>
                </div>

                <button
                  onClick={generateResponses}
                  disabled={!selectedSubmission || selectedInterrogatories.size === 0 || !matterName || !respondingParty}
                  className="w-full bg-gold hover:bg-gold-dark disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold transition-colors"
                >
                  Generate Responses
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Response Editor */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-black">Generated Responses</h2>
                <p className="text-gray-600 mt-1">
                  {generatedResponses.matterName} • Set {generatedResponses.setNumber}
                </p>
              </div>
              <button
                onClick={() => setGeneratedResponses(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Response Cards */}
            <div className="space-y-4">
              {generatedResponses.responses.map(response => (
                <div key={response.interrogatoryNumber} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="mb-4">
                    <p className="font-bold text-black">Interrogatory No. {response.interrogatoryNumber}</p>
                    <p className="text-sm text-gray-600 mt-1">{response.interrogatoryLabel}</p>
                  </div>

                  {response.intakeAnswers.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                      <p className="text-xs font-semibold text-blue-700 mb-2">Related Intake Answers:</p>
                      <div className="space-y-1">
                        {response.intakeAnswers.map((answer, idx) => (
                          <p key={idx} className="text-xs text-blue-900">
                            <span className="font-semibold">{answer.question}:</span> {answer.answer}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Draft Response:</label>
                    <textarea
                      value={
                        getEditedResponse(response.interrogatoryNumber) || response.draftResponse
                      }
                      onChange={e => handleEditResponse(response.interrogatoryNumber, e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold font-mono text-sm resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Export Options */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const text = exportGFROGResponsesToText(generatedResponses)
                  navigator.clipboard.writeText(text)
                  alert('Copied to clipboard!')
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Copy All to Clipboard
              </button>
              <button
                onClick={() => {
                  const html = exportGFROGResponsesToHTML(generatedResponses)
                  const blob = new Blob([html], { type: 'text/html' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `GFROG_Responses_Set_${generatedResponses.setNumber}.html`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex-1 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-semibold transition-colors"
              >
                Download as HTML
              </button>
              <button
                onClick={() => setGeneratedResponses(null)}
                className="flex-1 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-semibold transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
