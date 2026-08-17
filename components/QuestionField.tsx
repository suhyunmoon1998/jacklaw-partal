'use client'

/**
 * The portal's question renderer — one input per question type.
 *
 * Moved verbatim out of app/questionnaire/page.tsx so the default onboarding
 * questionnaire and admin-built question sets render through the same
 * component. Nothing here knows which of the two it is being used for.
 */

import { AnswerValue, Question } from '@/types'

export function QuestionInput({
  question,
  inputId,
  value,
  onChange,
  yesLabel,
  noLabel,
  notSureLabel,
  selectPlaceholder,
  optionLabels,
}: {
  question: Question
  inputId: string
  value: AnswerValue
  onChange: (id: string, val: AnswerValue) => void
  yesLabel: string
  noLabel: string
  notSureLabel: string
  selectPlaceholder: string
  /**
   * Display text for `question.options`, matched by position. The option itself
   * is still what gets stored, so a translated form records the same answer as
   * an untranslated one.
   */
  optionLabels?: string[]
}) {
  const strVal = typeof value === 'string' ? value : ''
  const arrVal = Array.isArray(value) ? value : []
  const labelFor = (opt: string, i: number) => optionLabels?.[i] ?? opt

  const choiceClass = (selected: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl border-2 font-semibold transition-all duration-150 active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold ${
      selected
        ? 'bg-gold text-white border-gold shadow-md shadow-gold/25'
        : 'bg-white text-gray-600 border-gray-200 hover:border-gold/60 hover:text-gold'
    }`

  const checkIcon = (
    <svg className="w-4 h-4 animate-pop" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  )

  switch (question.type) {
    case 'yes_no':
      return (
        <div className="flex gap-3" role="group">
          {(['yes', 'no'] as const).map(opt => {
            const selected = strVal === opt
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(question.id, opt)}
                className={`${choiceClass(selected)} text-base`}
              >
                {selected && checkIcon}
                {opt === 'yes' ? yesLabel : noLabel}
              </button>
            )
          })}
        </div>
      )

    case 'yes_no_unsure':
      return (
        <div className="flex gap-2" role="group">
          {(['yes', 'no', 'not_sure'] as const).map(opt => {
            const selected = strVal === opt
            return (
              // No check icon here — three labels (e.g. "No Estoy Seguro")
              // already fill the row on a 320px screen.
              <button
                key={opt}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(question.id, opt)}
                className={`${choiceClass(selected)} px-1 text-[13px] sm:text-sm leading-tight text-center`}
              >
                {opt === 'yes' ? yesLabel : opt === 'no' ? noLabel : notSureLabel}
              </button>
            )
          })}
        </div>
      )

    case 'currency':
      return (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            value={strVal}
            onChange={e => onChange(question.id, e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder={question.placeholder ?? '0.00'}
            className="input-field pl-8"
          />
        </div>
      )

    case 'select':
      return (
        <div className="relative">
          <select
            id={inputId}
            value={strVal}
            onChange={e => onChange(question.id, e.target.value)}
            className="input-field appearance-none bg-white pr-10"
          >
            <option value="">{selectPlaceholder}</option>
            {question.options?.map((opt, i) => (
              <option key={opt} value={opt}>{labelFor(opt, i)}</option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )

    case 'multiselect':
      return (
        <div className="space-y-2">
          {question.options?.map((opt, i) => {
            const checked = arrVal.includes(opt)
            return (
              <label
                key={opt}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-150 active:scale-[0.99] ${
                  checked
                    ? 'border-gold bg-gold/5 shadow-sm shadow-gold/10'
                    : 'border-gray-200 hover:border-gold/40 hover:bg-gray-50'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                  checked ? 'bg-gold border-gold' : 'bg-white border-gray-300'
                }`}>
                  {checked && (
                    <svg className="w-3 h-3 text-white animate-pop" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${checked ? 'text-gold font-semibold' : 'text-gray-700'}`}>{labelFor(opt, i)}</span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...arrVal, opt]
                      : arrVal.filter(v => v !== opt)
                    onChange(question.id, next)
                  }}
                />
              </label>
            )
          })}
        </div>
      )

    case 'textarea':
      return (
        <textarea
          id={inputId}
          value={strVal}
          onChange={e => onChange(question.id, e.target.value)}
          placeholder={question.placeholder ?? 'Type your answer here…'}
          rows={4}
          className="input-field resize-none"
        />
      )

    case 'date':
      return (
        <input
          id={inputId}
          type="date"
          value={strVal}
          onChange={e => onChange(question.id, e.target.value)}
          className="input-field"
          max={new Date().toISOString().split('T')[0]}
        />
      )

    case 'phone':
      return (
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          value={strVal}
          onChange={e => onChange(question.id, e.target.value)}
          placeholder={question.placeholder ?? '(555) 000-0000'}
          className="input-field"
        />
      )

    default:
      return (
        <input
          id={inputId}
          type="text"
          value={strVal}
          onChange={e => onChange(question.id, e.target.value)}
          placeholder={question.placeholder ?? ''}
          className="input-field"
        />
      )
  }
}
