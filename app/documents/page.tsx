'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { getSession } from '@/lib/auth'
import { DOCUMENT_CATEGORIES } from '@/lib/mockData'
import { Session, UploadedDocument } from '@/types'

export default function DocumentsPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [selectedCategory, setSelectedCategory] = useState(DOCUMENT_CATEGORIES[0])
  const [uploading, setUploading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/client'); return }
    setSession(s)
    fetch(`/api/documents?clientId=${s.clientId}`)
      .then(r => r.json())
      .then(({ documents }) => setDocuments(documents ?? []))
  }, [router])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !session) return

    setUploading(true)

    const newDocs: UploadedDocument[] = []
    for (const f of files) {
      const form = new FormData()
      form.append('file', f)
      form.append('clientId', session.clientId)
      form.append('category', selectedCategory)
      const res = await fetch('/api/documents', { method: 'POST', body: form })
      const { document } = await res.json()
      if (document) newDocs.push(document)
    }
    setDocuments(prev => [...newDocs, ...prev])

    setSuccessMsg(`${files.length} file${files.length !== 1 ? 's' : ''} added successfully.`)
    setTimeout(() => setSuccessMsg(''), 4000)
    setUploading(false)

    // Reset both file inputs
    if (fileRef.current) fileRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  const handleRemove = async (index: number) => {
    const doc = documents[index] as UploadedDocument & { id?: number }
    if (doc.id) {
      await fetch(`/api/documents?id=${doc.id}`, { method: 'DELETE' })
    }
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return iso
    }
  }

  const byCategory = DOCUMENT_CATEGORIES.reduce<Record<string, UploadedDocument[]>>((acc, cat) => {
    acc[cat] = documents.filter(d => d.category === cat)
    return acc
  }, {})

  if (!session) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showBack backHref="/dashboard" showLogout subtitle="Documents" />

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-navy">Upload Documents</h2>
          <p className="text-gray-500 text-sm mt-1">
            Upload any documents that may be helpful to your case.
          </p>
        </div>

        {/* Privacy notice */}
        <div className="card mb-6 bg-navy/5 border border-navy/20">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-navy shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-navy text-sm">
              <strong>Your documents are confidential.</strong> All files are protected by attorney-client privilege.
              In production, files are encrypted and stored securely — never shared without your consent.
            </p>
          </div>
        </div>

        {/* Upload card */}
        <div className="card mb-6">
          <h3 className="font-semibold text-navy mb-4">Add a Document</h3>

          {/* Category selector */}
          <div className="mb-4">
            <label className="label">Document Category</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="input-field appearance-none bg-white"
            >
              {DOCUMENT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.heic"
          />
          {/* capture="environment" opens the back camera directly on mobile */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {uploading ? (
            <div className="border-2 border-dashed border-navy/30 rounded-xl p-8 flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-navy" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-navy font-medium">Processing…</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Take Photo button */}
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-navy hover:bg-navy/5 transition-colors group"
              >
                <div className="w-12 h-12 bg-navy/10 rounded-full flex items-center justify-center group-hover:bg-navy transition-colors">
                  <svg className="w-6 h-6 text-navy group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700 group-hover:text-navy transition-colors">Take Photo</p>
                  <p className="text-xs text-gray-400 mt-0.5">Use camera</p>
                </div>
              </button>

              {/* Select File button */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-navy hover:bg-navy/5 transition-colors group"
              >
                <div className="w-12 h-12 bg-navy/10 rounded-full flex items-center justify-center group-hover:bg-navy transition-colors">
                  <svg className="w-6 h-6 text-navy group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700 group-hover:text-navy transition-colors">Select File</p>
                  <p className="text-xs text-gray-400 mt-0.5">PDF, doc, image</p>
                </div>
              </button>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-700 text-sm font-medium">{successMsg}</p>
            </div>
          )}
        </div>

        {/* Document list */}
        {documents.length > 0 && (
          <div className="card mb-6">
            <h3 className="font-semibold text-navy mb-4">
              Uploaded Documents ({documents.length})
            </h3>
            <div className="space-y-4">
              {DOCUMENT_CATEGORIES.map(cat => {
                const catDocs = byCategory[cat]
                if (!catDocs?.length) return null
                return (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
                    <div className="space-y-2">
                      {catDocs.map((doc, i) => {
                        const globalIndex = documents.indexOf(doc)
                        return (
                          <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                            <div className="w-8 h-8 bg-navy/10 rounded-lg flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                              <p className="text-xs text-gray-400">{formatDate(doc.uploadedAt)}</p>
                            </div>
                            <button
                              onClick={() => handleRemove(globalIndex)}
                              className="text-gray-300 hover:text-red-400 transition-colors p-1"
                              aria-label="Remove document"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Document checklist */}
        <div className="card">
          <h3 className="font-semibold text-navy mb-1">Helpful Documents to Gather</h3>
          <p className="text-sm text-gray-500 mb-4">Don&apos;t worry if you don&apos;t have all of these. Upload what you have.</p>
          <div className="space-y-1.5">
            {DOCUMENT_CATEGORIES.map(cat => {
              const uploaded = (byCategory[cat] ?? []).length > 0
              return (
                <div key={cat} className="flex items-center gap-3 py-1.5">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    uploaded ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  }`}>
                    {uploaded && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${uploaded ? 'text-green-700 line-through' : 'text-gray-600'}`}>{cat}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 pb-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-secondary"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  )
}
