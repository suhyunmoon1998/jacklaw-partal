/**
 * A round of follow-up questions as plain text, for a person to hold.
 *
 * The panel shows the round on screen, which is where it is approved. This is
 * for everywhere else: a case note, an email to the attorney, a message asking
 * "should we really ask her this one?". A round that can only be read inside a
 * modal in an admin panel is a round that gets approved without a second
 * opinion, and the second opinion is the whole point of a person reading it.
 *
 * Both languages, always. The client reads the Korean and the reviewer may not,
 * so a copy with only one of them is a copy nobody can check.
 */

import { Question } from '@/types'
import { LADDER } from '@/lib/followUpShape'

const RUNG = new Map<number, string>(LADDER.map(l => [l.rung as number, l.key as string]))

export interface RoundNote {
  clientName: string
  questions: Question[]
  meta: { questionKey: string; rung: number; resolvesKind: string; whyItMatters: string }[]
  leftOut: { gap: string; why: string }[]
  builtFrom: { ledger: number; matrix: number; spine: boolean } | null
  factCount: number
  reviewedBy: string | null
}

export function roundAsText(note: RoundNote): string {
  const byKey = new Map(note.meta.map(m => [m.questionKey, m]))
  const out: string[] = []

  out.push(`${note.clientName} — ${note.questions.length} follow-up questions`)
  out.push(note.reviewedBy ? `Approved by ${note.reviewedBy}.` : 'Not approved. Nothing has been sent.')

  const from = note.builtFrom
  out.push(
    from
      ? `Written against ${from.ledger} facts` +
        (from.matrix ? `, ${from.matrix} claims` : '') +
        (from.spine ? ', and the evidence spine' : '') +
        '.'
      : `Written against ${note.factCount} facts. Nothing recorded what else was on file at the time.`
  )
  out.push('')

  note.questions.forEach((q, i) => {
    const m = byKey.get(q.id)
    const rung = m ? (RUNG.get(m.rung) ?? `rung ${m.rung}`) : ''
    const gate = q.showIf ? `  (only after ${q.showIf.questionId})` : ''
    out.push(`${String(i + 1).padStart(2)}. [${rung}] ${q.id}${gate}`)

    const theirs = q.ko ?? q.es ?? q.zh
    if (theirs?.label) out.push(`    ${theirs.label}`)
    out.push(`    ${q.label}`)

    if (q.options?.length) {
      q.options.forEach((o, j) => {
        const t = theirs?.options?.[j]
        out.push(`      · ${t ?? o}${t ? `   /   ${o}` : ''}`)
      })
    }
    if (m?.whyItMatters) out.push(`    Why: ${m.whyItMatters}`)
    out.push('')
  })

  if (note.leftOut.length) {
    out.push(`Deliberately not asked (${note.leftOut.length}):`)
    for (const x of note.leftOut) {
      out.push(`  • ${x.gap}`)
      out.push(`    ${x.why}`)
    }
  }

  return out.join('\n')
}
