'use client'

/**
 * A template's closing checklist, each line with what was found.
 *
 * Shared by the factual sheet (Factual Brief Template, twelve checks) and the
 * case brief's trial-readiness section (Trial Brief Template, fourteen). The
 * four results are coloured apart because they ask different things of the
 * reader: a gap is work, "for a person" is a review nobody has done yet.
 */

import type { Check } from '@/lib/briefStandards'

const RESULT_TONE: Record<Check['result'], string> = {
  met: 'text-green-700',
  gap: 'text-red-700',
  'for a person': 'text-amber-700',
  'not yet': 'text-gray-400',
}

export default function TemplateChecks({ checks }: { checks: Check[] }) {
  return (
    <ol className="text-[14px] leading-[1.7] text-gray-800 space-y-2">
      {checks.map(c => (
        <li key={c.n} className="break-inside-avoid">
          <span className={`font-sans text-[10px] font-bold uppercase tracking-wider ${RESULT_TONE[c.result]}`}>
            {c.n}. {c.result}
          </span>
          <span className="block">{c.text}</span>
          <span className="block text-[12px] text-gray-500">{c.why}</span>
        </li>
      ))}
    </ol>
  )
}

