'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  GFROG_SECTIONS,
  GFROG_PRESETS,
  expandInterrogatoriesFromPreset,
  type GFROGPreset,
} from '@/lib/gfrogData'

export default function GFROGBuilderPage() {
  const router = useRouter()
  const [matterName, setMatterName] = useState('')
  const [propoundingParty, setPropoundingParty] = useState('')
  const [respondingParty, setRespondingParty] = useState('')
  const [setNumber, setSetNumber] = useState('1')
  const [notes, setNotes] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<GFROGPreset | null>(null)
  const [selectedInterrogatories, setSelectedInterrogatories] = useState<Set<string>>(new Set())
  const [showPreview, setShowPreview] = useState(false)

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

  const selectAll = () => {
    const all = new Set<string>()
    for (const section of GFROG_SECTIONS) {
      for (const interrog of section.interrogatories) {
        all.add(interrog.id)
      }
    }
    setSelectedInterrogatories(all)
  }

  const clearAll = () => {
    setSelectedInterrogatories(new Set())
  }

  const selectedCount = selectedInterrogatories.size
  const totalCount = GFROG_SECTIONS.reduce((sum, s) => sum + s.interrogatories.length, 0)

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
              <p className="text-white/40 text-xs">GFROG Discovery Tool</p>
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
          <h1 className="text-3xl font-bold text-black mb-2">GFROG Discovery Builder</h1>
          <p className="text-gray-600">Create interrogatory sets for formal discovery requests</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Builder Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Information */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-black mb-4">Case Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Matter/Case Name</label>
                  <input
                    type="text"
                    value={matterName}
                    onChange={e => setMatterName(e.target.value)}
                    placeholder="e.g., Smith v. ABC Corporation"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Propounding Party</label>
                    <input
                      type="text"
                      value={propoundingParty}
                      onChange={e => setPropoundingParty(e.target.value)}
                      placeholder="e.g., Plaintiff"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Responding Party</label>
                    <input
                      type="text"
                      value={respondingParty}
                      onChange={e => setRespondingParty(e.target.value)}
                      placeholder="e.g., Defendant"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
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
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any additional instructions or notes for the discovery request"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Preset Selection */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-black mb-4">Quick Start Templates</h2>
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

            {/* Selection Controls */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-black">Interrogatory Selection</h2>
                <span className="text-sm font-semibold text-gold">
                  {selectedCount} / {totalCount} selected
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="flex-1 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearAll}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Interrogatory Selection */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-black">Select Interrogatories</h2>
              {GFROG_SECTIONS.map(section => (
                <div key={section.id} className="border-b border-gray-100 pb-6 last:border-0">
                  <h3 className="font-bold text-black mb-3">
                    {section.number} {section.title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {section.interrogatories.map(interrog => (
                      <label
                        key={interrog.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedInterrogatories.has(interrog.id)}
                          onChange={() => toggleInterrogatory(interrog.id)}
                          className="w-4 h-4 text-gold rounded"
                        />
                        <span className="text-sm text-gray-700">
                          <span className="font-semibold text-black">{interrog.number}</span> {interrog.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-black mb-4">Preview</h2>

              <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Matter</p>
                  <p className="text-sm text-black font-medium">{matterName || '(No case name)'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Parties</p>
                  <p className="text-sm text-black">
                    {propoundingParty || '(Propounding)'} → {respondingParty || '(Responding)'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Set</p>
                  <p className="text-sm text-black">Set No. {setNumber}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase">Selected Interrogatories</p>
                <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3">
                  {selectedCount === 0 ? (
                    <p className="text-xs text-gray-400">No interrogatories selected</p>
                  ) : (
                    <div className="space-y-1">
                      {Array.from(selectedInterrogatories)
                        .sort()
                        .map(id => {
                          for (const section of GFROG_SECTIONS) {
                            const interrog = section.interrogatories.find(i => i.id === id)
                            if (interrog) {
                              return (
                                <div key={id} className="text-xs text-gray-700">
                                  <span className="font-semibold">{interrog.number}</span>
                                </div>
                              )
                            }
                          }
                          return null
                        })}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowPreview(true)}
                disabled={selectedCount === 0 || !matterName || !propoundingParty || !respondingParty}
                className="w-full bg-gold hover:bg-gold-dark disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Generate Preview
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">GFROG Discovery Set Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="border-b border-gray-200 pb-6">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Case:</span> {matterName}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Set Number:</span> {setNumber}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">From:</span> {propoundingParty} <br />
                  <span className="font-semibold">To:</span> {respondingParty}
                </p>
              </div>

              {/* Interrogatories */}
              <div className="space-y-4">
                <h3 className="font-bold text-black">Interrogatories</h3>
                {Array.from(selectedInterrogatories)
                  .sort((a, b) => {
                    const numA = parseFloat(a)
                    const numB = parseFloat(b)
                    return numA - numB
                  })
                  .map(id => {
                    for (const section of GFROG_SECTIONS) {
                      const interrog = section.interrogatories.find(i => i.id === id)
                      if (interrog) {
                        return (
                          <div key={id} className="border-l-2 border-gold pl-4">
                            <p className="font-semibold text-black">Interrogatory No. {interrog.number}</p>
                            <p className="text-sm text-gray-600 mt-1">{interrog.label}</p>
                            {interrog.description && (
                              <p className="text-xs text-gray-500 mt-1 italic">{interrog.description}</p>
                            )}
                          </div>
                        )
                      }
                    }
                    return null
                  })}
              </div>

              {/* Notes */}
              {notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Additional Notes</p>
                  <p className="text-sm text-blue-900">{notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    const text = `${matterName}\nSet No. ${setNumber}\nFrom: ${propoundingParty} To: ${respondingParty}\n\n${Array.from(selectedInterrogatories)
                      .sort((a, b) => parseFloat(a) - parseFloat(b))
                      .map(id => {
                        for (const section of GFROG_SECTIONS) {
                          const interrog = section.interrogatories.find(i => i.id === id)
                          if (interrog) return `Interrogatory ${interrog.number}: ${interrog.label}`
                        }
                        return ''
                      })
                      .join('\n')}`
                    navigator.clipboard.writeText(text)
                    alert('Copied to clipboard!')
                  }}
                  className="flex-1 bg-gold hover:bg-gold-dark text-white py-3 rounded-xl font-semibold transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-semibold transition-colors"
                >
                  Print
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex-1 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
