'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { getDeckById } from '@/lib/flashcardData'
import { useLanguage } from '@/lib/i18n'
import { Flashcard } from '@/types'

export default function StudyModePage({ params }: { params: { deckId: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()

  const mode = (searchParams.get('mode') as 'study' | 'quiz' | 'write') || 'study'
  const deck = getDeckById(params.deckId)

  const [currentCardIdx, setCurrentCardIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [cardProgress, setCardProgress] = useState<Record<string, 'new' | 'learning' | 'known'>>({})
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [writeAnswers, setWriteAnswers] = useState<Record<number, string>>({})
  const [writeRevealed, setWriteRevealed] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (deck) {
      setCards([...deck.cards])
      const progress: Record<string, 'new' | 'learning' | 'known'> = {}
      deck.cards.forEach(card => {
        progress[card.id] = 'new'
      })
      setCardProgress(progress)
    }
  }, [deck])

  if (!deck || cards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header showBack backHref="/study" showLogout />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">{t('no_decks')}</p>
        </main>
      </div>
    )
  }

  const currentCard = cards[currentCardIdx]
  const isLast = currentCardIdx === cards.length - 1
  const isFirst = currentCardIdx === 0

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5)
    setCards(shuffled)
    setCurrentCardIdx(0)
    setIsFlipped(false)
  }

  const handleNext = () => {
    if (!isLast) {
      setCurrentCardIdx(prev => prev + 1)
      setIsFlipped(false)
    }
  }

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentCardIdx(prev => prev - 1)
      setIsFlipped(false)
    }
  }

  const handleMark = (status: 'learning' | 'known') => {
    setCardProgress(prev => ({
      ...prev,
      [currentCard.id]: status,
    }))
    if (!isLast) handleNext()
  }

  const handleQuizAnswer = (answer: string) => {
    setQuizAnswers(prev => ({ ...prev, [currentCardIdx]: answer }))
    const isCorrect = answer.toLowerCase().trim() === currentCard.back.toLowerCase().trim()
    setCardProgress(prev => ({
      ...prev,
      [currentCard.id]: isCorrect ? 'known' : 'learning',
    }))
  }

  const handleWriteReveal = (idx: number) => {
    setWriteRevealed(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const progressCount = Object.values(cardProgress).filter(s => s === 'known').length
  const progressPct = Math.round((progressCount / cards.length) * 100)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in">
      <Header showBack backHref="/study" showLogout subtitle={deck.title} />

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full flex flex-col">
        {/* Progress Bar */}
        <div className="mb-6 animate-slide-up">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">
              {t('progress')}: {progressCount}/{cards.length}
            </span>
            <span className="text-sm text-gray-600">{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Card Counter */}
        <p className="text-center text-sm text-gray-500 mb-4 animate-slide-up stagger-1">
          {t('card_of')} {currentCardIdx + 1} of {cards.length}
        </p>

        {/* Flash Card */}
        <div className="flex-1 flex items-center justify-center animate-slide-up stagger-2 mb-6">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full max-w-md aspect-square bg-white border-2 border-gold rounded-2xl p-8 shadow-lg cursor-pointer flex items-center justify-center transition-transform duration-300 hover:shadow-xl active:scale-[0.98]"
          >
            <div className="text-center">
              <p className="text-xs font-semibold text-gold uppercase mb-4">
                {isFlipped ? 'Answer' : 'Question'}
              </p>
              <p className="text-xl font-semibold text-black leading-relaxed">
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
              <p className="text-xs text-gray-400 mt-6">{t('flip_card')}</p>
            </div>
          </div>
        </div>

        {/* Mode-Specific Content */}
        {mode === 'study' && (
          <div className="space-y-3 mb-6 animate-slide-up stagger-3">
            <div className="flex gap-3">
              <button
                onClick={() => handleMark('learning')}
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition-all duration-150 active:scale-[0.97]"
              >
                {t('need_review')}
              </button>
              <button
                onClick={() => handleMark('known')}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition-all duration-150 active:scale-[0.97]"
              >
                {t('know_it')}
              </button>
            </div>
          </div>
        )}

        {mode === 'quiz' && (
          <div className="mb-6 animate-slide-up stagger-3">
            <p className="text-sm font-semibold text-gray-700 mb-3">{t('select_answer')}:</p>
            <div className="space-y-2">
              {[
                currentCard.back,
                ...cards.filter((_, i) => i !== currentCardIdx).slice(0, 3).map(c => c.back),
              ]
                .sort(() => Math.random() - 0.5)
                .map((option, idx) => {
                  const isSelected = quizAnswers[currentCardIdx] === option
                  const isCorrect = option === currentCard.back
                  const answered = quizAnswers[currentCardIdx] !== undefined

                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuizAnswer(option)}
                      disabled={answered}
                      className={`w-full p-3 rounded-xl text-sm font-medium transition-all text-left ${
                        !answered
                          ? 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gold active:scale-[0.98]'
                          : isSelected
                            ? isCorrect
                              ? 'bg-green-100 border-2 border-green-500 text-green-700'
                              : 'bg-red-100 border-2 border-red-500 text-red-700'
                            : isCorrect
                              ? 'bg-green-100 border-2 border-green-500 text-green-700'
                              : 'bg-gray-50 border-2 border-gray-200 text-gray-500'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
            </div>
          </div>
        )}

        {mode === 'write' && (
          <div className="mb-6 animate-slide-up stagger-3">
            <input
              type="text"
              placeholder={t('type_answer')}
              value={writeAnswers[currentCardIdx] || ''}
              onChange={e => setWriteAnswers(prev => ({ ...prev, [currentCardIdx]: e.target.value }))}
              className="input-field mb-3"
            />
            {!writeRevealed[currentCardIdx] && (
              <button
                onClick={() => handleWriteReveal(currentCardIdx)}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 transition-all duration-150 active:scale-[0.97]"
              >
                {t('reveal_answer')}
              </button>
            )}
            {writeRevealed[currentCardIdx] && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 mb-2">{t('your_answer')}:</p>
                <p className="text-sm text-gray-800 mb-4">{writeAnswers[currentCardIdx] || '(blank)'}</p>
                <p className="text-xs font-semibold text-blue-600 mb-2">Correct Answer:</p>
                <p className="text-sm text-gray-800">{currentCard.back}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 animate-slide-up stagger-4">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="flex-1 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold transition-all duration-150 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
          >
            ← {t('prev_card')}
          </button>
          <button
            onClick={handleShuffle}
            className="flex-1 py-4 bg-gray-600 text-white rounded-xl font-semibold transition-all duration-150 hover:bg-gray-700 active:scale-[0.97]"
          >
            🔀 {t('shuffle')}
          </button>
          <button
            onClick={handleNext}
            disabled={isLast}
            className="flex-1 py-4 bg-gold text-white rounded-xl font-semibold transition-all duration-150 hover:bg-gold-dark disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
          >
            {t('next_card')} →
          </button>
        </div>
      </main>
    </div>
  )
}
