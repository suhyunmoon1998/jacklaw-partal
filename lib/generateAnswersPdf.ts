import PDFDocument from 'pdfkit'
import { legacyAnswerGroups, liveQuestionIds } from '@/lib/questionnaireLegacy'
import { canonicalAnswers } from '@/lib/answerCompat'
import { answersForReading } from '@/lib/modules'
import { AnswerValue, Question, QuestionnaireSection } from '@/types'

const GOLD = '#E07820'
const NAVY = '#111111'
const GRAY = '#6b7280'
const LIGHT_GRAY = '#d1d5db'

function hasAnswer(val: AnswerValue | undefined): boolean {
  if (!val) return false
  if (Array.isArray(val)) return val.length > 0
  return String(val).trim().length > 0
}

/**
 * Characters PDFKit's built-in fonts can actually draw.
 *
 * Those fonts are Latin-1: Spanish accents render, Chinese and Korean do not —
 * they come out blank. The routes translate a client's answers to English
 * before they reach this file, but a translation can fail (offline, the free
 * endpoint rate-limited), and a silently blank answer in a case file is worse
 * than a visible gap.
 */
const RENDERABLE = /^[\u0009\u000a\u000d\u0020-\u007e\u00a0-\u017f\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20ac]*$/

const UNRENDERABLE_NOTE =
  '[Answer is in a language this PDF cannot display. Open this client in the portal to read it in English.]'

/** Drops what the font cannot draw. For headings, where a note would not fit. */
function safeHeading(text: string): string {
  return text.replace(
    /[^\u0009\u000a\u000d\u0020-\u007e\u00a0-\u017f\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20ac]+/g,
    ''
  ).trim()
}

function formatAnswer(val: AnswerValue | undefined, question: Question): string {
  if (!hasAnswer(val)) return 'Not answered'
  if (Array.isArray(val)) return val.join(', ')
  const s = String(val).trim()
  if (s === 'yes') return 'Yes'
  if (s === 'no') return 'No'
  if (s === 'not_sure') return 'Not Sure'
  if (question.type === 'currency') return `$${s}`
  return s
}

/**
 * Renders a client's answers as a PDF.
 *
 * `options` lets an assigned question set reuse this exact layout by passing its
 * own questions and heading; omitting it keeps the original behaviour — the
 * default onboarding questionnaire, section by section.
 */
export function generateAnswersPdf(
  clientName: string,
  caseType: string,
  phone: string,
  rawAnswers: Record<string, AnswerValue>,
  options: { sections?: QuestionnaireSection[]; title?: string } = {}
): Promise<Buffer> {
  // An answer chosen in Spanish before Module 1 prints as the choice it was,
  // rather than as a word the reader of this file will not recognise.
  // What the client stands behind, and what they took back — kept apart. Both
  // modules, with this client's repeating branches expanded, so a wage-and-hour
  // answer prints under its own heading rather than as an unrecognised leftover.
  const reading = answersForReading(rawAnswers)
  const answers = reading.filed
  const retracted = reading.retracted
  const sections = options.sections ?? reading.sections
  const title = options.title ?? 'CLIENT INTAKE QUESTIONNAIRE'
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER', bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const bottom = () => doc.page.height - doc.page.margins.bottom
    const ensureSpace = (needed: number) => {
      if (doc.y + needed > bottom()) doc.addPage()
    }

    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(16)
      .text('Law Offices of Jack D. Josephson, APC', { align: 'center' })
    doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9)
      .text(title.toUpperCase(), { align: 'center', characterSpacing: 1 })
    doc.moveDown(1.2)

    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(13).text(clientName)
    doc.fillColor(GRAY).font('Helvetica').fontSize(10)
      .text(`Case Type: ${caseType}`)
      .text(`Phone: ${phone}`)
      .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)
    doc.moveDown(0.8)

    doc.strokeColor(LIGHT_GRAY).lineWidth(1)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke()
    doc.moveDown(1)

    let anySections = false
    /** Set when an answer could not be drawn, so the reader is told why. */
    let untranslated = false

    for (const section of sections) {
      const answered = section.questions.filter(q => hasAnswer(answers[q.id]))
      if (answered.length === 0) continue
      anySections = true

      ensureSpace(40)
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(11)
        .text((safeHeading(section.title) || section.id).toUpperCase(), { characterSpacing: 0.5 })
      doc.moveDown(0.4)

      for (const q of answered) {
        ensureSpace(30)
        const answer = formatAnswer(answers[q.id], q)
        const shown = RENDERABLE.test(answer) ? answer : UNRENDERABLE_NOTE
        if (shown === UNRENDERABLE_NOTE) untranslated = true

        doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(9).text(safeHeading(q.label) || q.id)
        doc.fillColor('#000000').font('Helvetica').fontSize(10.5).text(shown)
        doc.moveDown(0.5)
      }
      doc.moveDown(0.5)
    }

    // Answers the client gave and then withdrew by changing the question above
    // them. Printed apart from the file rather than in it, and never left out —
    // a reader deciding a case should know they were said and taken back.
    const retractedEntries = sections.flatMap(section =>
      section.questions
        .filter(q => q.id in retracted)
        .map(q => ({ label: q.label, value: formatAnswer(retracted[q.id], q) }))
    )
    if (retractedEntries.length > 0) {
      anySections = true
      ensureSpace(40)
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(11)
        .text('ANSWERS THE CLIENT LATER TOOK BACK', { characterSpacing: 0.5 })
      doc.fillColor(GRAY).font('Helvetica').fontSize(9)
        .text('Given, then withdrawn by changing an earlier answer. Not part of what they submitted.')
      doc.moveDown(0.4)

      for (const entry of retractedEntries) {
        ensureSpace(30)
        const shown = RENDERABLE.test(entry.value) ? entry.value : UNRENDERABLE_NOTE
        if (shown === UNRENDERABLE_NOTE) untranslated = true
        doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(9).text(safeHeading(entry.label))
        doc.fillColor('#000000').font('Helvetica').fontSize(10.5).text(shown)
        doc.moveDown(0.5)
      }
      doc.moveDown(0.5)
    }

    // Answers to questions this questionnaire no longer asks. A file printed for
    // the office has to hold everything the client told us, not only what the
    // current version happens to ask.
    const legacy = legacyAnswerGroups(answers, liveQuestionIds(sections))
    for (const group of legacy) {
      anySections = true
      ensureSpace(40)
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(11)
        .text(`${safeHeading(group.section).toUpperCase() || 'EARLIER ANSWERS'} (EARLIER VERSION)`, { characterSpacing: 0.5 })
      doc.moveDown(0.4)

      for (const entry of group.entries) {
        ensureSpace(30)
        const answer = formatAnswer(entry.value as AnswerValue, { id: entry.id, label: entry.label, type: 'text' })
        const shown = RENDERABLE.test(answer) ? answer : UNRENDERABLE_NOTE
        if (shown === UNRENDERABLE_NOTE) untranslated = true

        doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(9).text(safeHeading(entry.label) || entry.id)
        doc.fillColor('#000000').font('Helvetica').fontSize(10.5).text(shown)
        doc.moveDown(0.5)
      }
      doc.moveDown(0.5)
    }

    if (!anySections) {
      doc.fillColor(GRAY).font('Helvetica').fontSize(11).text('No answers submitted yet.')
    }

    if (untranslated) {
      ensureSpace(40)
      doc.moveDown(0.5)
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9)
        .text('Some answers are missing from this PDF')
      doc.fillColor(GRAY).font('Helvetica').fontSize(9).text(
        'This client answered in a language this document cannot display, and the ' +
        'translation did not come through. Their answers are complete in the portal, ' +
        'where they are shown in English.'
      )
    }

    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      // Writing past the bottom margin trips pdfkit's auto-pagination and
      // silently appends a blank page, so the margin is dropped to 0 only
      // for this one write.
      const originalBottomMargin = doc.page.margins.bottom
      doc.page.margins.bottom = 0
      doc.fillColor(GRAY).font('Helvetica').fontSize(8)
        .text(
          'Attorney-Client Privileged & Confidential · Generated by JACKLAW Client Portal',
          doc.page.margins.left,
          doc.page.height - originalBottomMargin + 18,
          { align: 'center', width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
        )
      doc.page.margins.bottom = originalBottomMargin
    }

    doc.end()
  })
}
