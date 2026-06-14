'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { getAllDecks } from '@/lib/flashcardData'
import { useLanguage } from '@/lib/i18n'

export default function StudyPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)

  const decks = getAllDecks()

  const filteredDecks = useMemo(() => {
    if (!searchQuery.trim()) return decks
    const query = searchQuery.toLowerCase()
    return decks.filter(
      d => d.title.toLowerCase().includes(query) ||
           d.description.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const handleSelectDeck = (deckId: string, mode: 'study' | 'quiz' | 'write') => {
    setSelectedDeckId(deckId)
    setSelectedMode(mode)
    router.push(`/study/${deckId}?mode=${mode}`)
  }

  if (selectedMode && selectedDeckId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in">
      <Header showBack backHref="/client" showLogout subtitle="Study" />

      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
        {/* Page Title */}
        <div className="mb-6 animate-slide-up">
          <h2 className="text-2xl font-bold text-black">{t('flashcards')}</h2>
          <p className="text-gray-500 text-sm mt-1">Master legal concepts with interactive flashcards</p>
        </div>

        {/* Search */}
        <div className="mb-6 animate-slide-up stagger-1">
          <input
            type="text"
            placeholder={t('search_decks')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field w-full"
          />
        </div>

        {/* Decks Grid */}
        {filteredDecks.length === 0 ? (
          <div className="text-center py-16 animate-slide-up stagger-2">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-gray-500 text-sm">{t('no_decks')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDecks.map((deck, idx) => (
              <div
                key={deck.id}
                className={`card-hover animate-slide-up stagger-${Math.min(idx + 2, 5)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-black">{deck.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{deck.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {deck.cards.length} {t('deck_cards')}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gold/15 rounded-xl flex items-center justify-center shrink-0 ml-4">
                    <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>

                {/* Mode Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleSelectDeck(deck.id, 'study')}
                    className="py-2.5 bg-gold text-white rounded-lg text-xs font-semibold hover:bg-gold-dark transition-all duration-150 active:scale-[0.97]"
                  >
                    {t('study_mode')}
                  </button>
                  <button
                    onClick={() => handleSelectDeck(deck.id, 'quiz')}
                    className="py-2.5 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-all duration-150 active:scale-[0.97]"
                  >
                    {t('quiz_mode')}
                  </button>
                  <button
                    onClick={() => handleSelectDeck(deck.id, 'write')}
                    className="py-2.5 bg-purple-500 text-white rounded-lg text-xs font-semibold hover:bg-purple-600 transition-all duration-150 active:scale-[0.97]"
                  >
                    {t('write_mode')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
