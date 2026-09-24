/**
 * The firm's two brief templates, as the portal holds them.
 *
 * Factual Brief Template 1.0 and Trial Brief Template 1.0 are the firm's
 * standards (Drive, owned by the office). Section numbers and titles are copied
 * verbatim so a sheet and the template can be read side by side; a template
 * revision is a change here, with the version bumped, and nowhere else.
 *
 * Only structure lives here. What fills each section is decided by
 * lib/factualTemplate.ts and lib/trialReadiness.ts, from readings that already
 * exist — nothing here is generated.
 */

export interface TemplateSection {
  /** As the template numbers it: 'I', 'V', 'XII'. */
  n: string
  title: string
}

export interface BriefTemplate {
  name: string
  version: string
  /** Where the original is, so a reader can check the sheet against it. */
  source: string
  sections: TemplateSection[]
  /** The template's own closing checklist, verbatim, in its order. */
  qualityControl: string[]
}

export const FACTUAL_TEMPLATE: BriefTemplate = {
  name: 'Factual Brief Template',
  version: '1.0',
  source: 'https://docs.google.com/document/d/1y_9XhT0Dpa_Ff8XdMrycpdiXCdJkSxnq8NqAgQ7YXGs',
  sections: [
    { n: 'I', title: 'Case Snapshot' },
    { n: 'II', title: 'Executive Factual Theory' },
    { n: 'III', title: 'Parties, Employment Relationship, and Control' },
    { n: 'IV', title: 'Chronology' },
    { n: 'V', title: 'Issue-by-Issue Factual Development' },
    { n: 'VI', title: 'Document and Evidence Marshaling' },
    { n: 'VII', title: 'Witnesses — Who’s Who' },
    { n: 'VIII', title: 'Defense Case and Factual Rebuttal' },
    { n: 'IX', title: 'Damages Facts Only' },
    { n: 'X', title: 'Open Issues and Development Plan' },
    { n: 'XI', title: 'Final Factual Summary' },
    { n: 'XII', title: 'Final Quality Control' },
  ],
  qualityControl: [
    'Employment dates, rates, schedule, job duties, and separation are verified or clearly marked as unverified.',
    'Each major issue has at least one concrete example and an identified source where available.',
    'Payroll and time records have been cross-checked rather than summarized independently.',
    'Discovery admissions and defense explanations have been incorporated.',
    'Harmful evidence and contradictions are expressly identified.',
    'The strongest evidence nuggets are easy to find.',
    'Material witnesses are identified with what they actually know.',
    'Missing documents and unexplained record gaps are identified.',
    'Damages inputs are separated from assumptions.',
    'The final narrative distinguishes evidence from inference and does not present inference as confirmed fact.',
    'No legal proposition has been substituted for factual proof.',
    'The open development plan identifies the few steps most likely to materially improve the case.',
  ],
}

export const TRIAL_TEMPLATE: BriefTemplate = {
  name: 'Trial Brief Template',
  version: '1.0',
  source: 'https://docs.google.com/document/d/1J4TncGoHsrmt9QGPN15Z3XSCq6c2YykygIS4wMhHCiw',
  sections: [
    { n: 'Caption', title: 'Caption / Case Information' },
    { n: 'I', title: 'Introduction — The Case in Its Strongest Form' },
    { n: 'II', title: 'Parties and Procedural Posture' },
    { n: 'III', title: 'Undisputed or Objectively Established Facts' },
    { n: 'IV', title: 'Brief Summary of Facts and Evidence' },
    { n: 'V', title: 'Governing Law and Application to Facts' },
    { n: 'VI', title: 'Special Law-to-Fact Modules' },
    { n: 'VII', title: 'Expected Evidence' },
    { n: 'VIII', title: 'Defense Contentions and Rebuttal' },
    { n: 'IX', title: 'Damages' },
    { n: 'X', title: 'Evidentiary or Trial Issues Requiring Advance Ruling' },
    { n: 'XI', title: 'Requested Findings / Verdict' },
    { n: 'XII', title: 'Conclusion — The Sequence to Remember' },
    { n: 'XIII', title: 'Final Trial-Brief Quality Control' },
  ],
  qualityControl: [
    'The introduction identifies the strongest fact and the legal theory immediately.',
    'Undisputed facts are separated from genuinely disputed facts.',
    'Every claim states the current governing rule before applying it.',
    'Every material element is connected to a concrete fact and expected proof.',
    'The brief identifies the source of the strongest evidence rather than relying on conclusory characterization.',
    'The strongest defense is addressed accurately.',
    'Harmful facts are not silently ignored.',
    'Record-driven claims use representative dates, pay periods, entries, or Bates references.',
    'Testimonial claims identify the witness who has firsthand knowledge.',
    'Damages calculations disclose their factual assumptions and credits.',
    'Old authorities from template cases have not been copied without current verification.',
    'The same facts are not repeated in full in the fact section, law section, rebuttal section, and damages section.',
    'The requested ruling or verdict is explicit.',
    'The conclusion reduces the case to a memorable factual sequence.',
  ],
}

/**
 * How a quality-control line stands.
 *
 * `for a person` is not a failure. It is a check the template asks of a
 * lawyer's judgement — whether a narrative overstates, whether a conclusion is
 * memorable — and a machine that ticked it would be claiming a review nobody
 * did.
 */
export type CheckResult = 'met' | 'gap' | 'for a person' | 'not yet'

export interface Check {
  /** 1-based, as the template numbers its checklist. */
  n: number
  text: string
  result: CheckResult
  /** What was found, or what is missing. Always said. */
  why: string
}
