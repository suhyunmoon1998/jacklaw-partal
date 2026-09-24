/**
 * The factual brief, in the order Factual Brief Template 1.0 lays it out.
 *
 * buildFactualBrief groups the ledger; this puts the groups where the firm's
 * template puts them — I Case Snapshot through XII Final Quality Control — and
 * fills the template's parts the grouping did not have: the snapshot fields,
 * admissions, parties and control, the eight parts of each issue, the nine
 * record categories, the defence case, and the twelve checks.
 *
 * ASSEMBLED, NOT GENERATED, like everything under it. Where the template asks
 * for something nothing on file supplies, the part says so in a sentence. An
 * empty heading reads as "nothing to report"; "no payroll record is on file"
 * reads as the job it is. The template's own rule 1 — distinguish confirmed
 * from reported, inferred, disputed or unknown — is why every fact keeps its
 * status wherever it appears.
 *
 * Pure.
 */

import { FactualBrief, LedgerFact, isProof, legalConclusionsIn, proofWeight, shortIds } from '@/lib/factualBrief'
import { isEmployerStatement } from '@/lib/defenceRecord'
import type { SpineRecord } from '@/lib/evidenceSpine'
import { Check, FACTUAL_TEMPLATE } from '@/lib/briefStandards'
import type { SearchRecord } from '@/lib/sourceSearch'

/** One line of the analysis baseline: 'Hourly rate' · '$18' · FACT. */
export interface BaselineRow {
  label: string
  value: string
  basis: string
}

export interface FactualTemplateInput {
  brief: FactualBrief
  /** The whole ledger, superseded rows included; only standing facts are read. */
  ledger: LedgerFact[]
  /** The damages reading's employment baseline. Empty when it has not run. */
  baseline: BaselineRow[]
  caseName?: string
  spine: {
    records?: SpineRecord[]
    anomalies?: { what?: string; facts?: string[]; wouldConfirmIt?: string }[]
    dateConflicts?: { what?: string }[]
  } | null
  /** What the extraction searched. Undefined when not loaded. */
  searched?: SearchRecord | null
}

export interface SnapshotField {
  field: string
  value: string
  /** Where it came from, or why it is not on file. */
  source: string
  onFile: boolean
}

export interface IssueByTemplate {
  issue: string
  account: LedgerFact[]
  documentary: LedgerFact[]
  defendant: LedgerFact[]
  corroboration: LedgerFact[]
  consistentWith: LedgerFact[]
  contrary: { fact: LedgerFact; contrary: string }[]
  disputed: LedgerFact[]
  anomalies: string[]
  nugget: { fact: LedgerFact; proof: boolean } | null
  missing: string[]
}

export interface RecordCategory {
  key: string
  title: string
  inHand: SpineRecord[]
  toObtain: SpineRecord[]
  /** Facts that already rest on a record of this kind. */
  facts: LedgerFact[]
}

export interface FactualByTemplate {
  template: typeof FACTUAL_TEMPLATE
  snapshot: SnapshotField[]
  theory: {
    admissions: LedgerFact[]
    provenNext: string[]
  }
  parties: {
    employer: string[]
    job: string[]
    control: { name: string; knows: number; about: string[] }[]
    pay: string[]
  }
  /** Issues with enough on file to develop, each in the template's eight parts. */
  issues: IssueByTemplate[]
  /** The rest, named with their count so nothing is silently dropped. */
  otherIssues: { issue: string; facts: number }[]
  records: RecordCategory[]
  defense: {
    narrative: LedgerFact[]
    supporting: { what: string; against?: string }[]
    rebuttal: LedgerFact[]
    unresolved: string[]
  }
  damagesMissing: string[]
  plan: string[]
  summary: { paragraphs: string[]; how: string }
  checks: Check[]
}

const live = (f: LedgerFact) => !f.supersededBy

/** Facts an issue needs before it is developed in full under V. */
export const MATERIAL_AT = 3
/** At most this many issues developed in full; the rest are listed. */
export const MAX_ISSUES = 15

/**
 * A fact that rests on something other than her own telling.
 *
 * Provenance kind is free text ('portal answer', 'payroll record', …). Anything
 * that is not one of the ways a client tells the office something is a record.
 */
export function fromARecord(f: LedgerFact): boolean {
  return !/portal|answer|client|interview|memory|questionnaire|intake|follow-up|conversation/i.test(
    f.provenance?.kind ?? ''
  )
}

const bare = (id: string) => shortIds(id)

// ── I. snapshot ─────────────────────────────────────────────────────────────

/**
 * Template field → the baseline labels that answer it.
 *
 * Matched against the labels the damages reading actually writes ('Rate(s) of
 * pay', 'Start date', 'Pay method / pay period', 'Industry / Wage Order'), and
 * narrowly: a loose /period|wage/ filed the pay period under the employment
 * period and the Wage Order under the pay rate on a real file.
 */
const SNAPSHOT_FIELDS: { field: string; match: RegExp | null }[] = [
  { field: 'Case Name', match: null },
  { field: 'Case Number / Forum', match: /case number|court|forum/i },
  { field: 'Plaintiff(s)', match: null },
  { field: 'Defendant(s)', match: /^employer\b|defendant/i },
  { field: 'Employment / Relevant Period', match: null },
  { field: 'Position(s)', match: /^role\b|position|job title|duties/i },
  { field: 'Primary Work Location(s)', match: /location|worksite/i },
  { field: 'Pay Method / Rate', match: /\brate(?:s|\(s\))?\b|^pay method|^tips\b|other compensation|salary|commission/i },
  { field: 'Usual Schedule', match: /days per week|hours per day|hours per week|shift/i },
  { field: 'Key Supervisors / Decisionmakers', match: /supervisor|manager|decision/i },
  { field: 'HR / Payroll / Timekeeping', match: /timekeep|payroll|human resources|\bhr\b/i },
  { field: 'Separation', match: /employment ended|separation|terminat|resign/i },
]

/** At most this many baseline lines per field; the rest are in III. */
const PER_FIELD = 3

function snapshot(input: FactualTemplateInput, issues: IssueByTemplate[], statements: LedgerFact[]): SnapshotField[] {
  const { brief, baseline } = input
  const people = brief.people
  const out: SnapshotField[] = []
  const notOnFile = (field: string, why: string) => out.push({ field, value: '', source: why, onFile: false })
  const fromBaseline = (field: string, rows: BaselineRow[], join = '; ') =>
    out.push({
      field,
      value: rows.slice(0, PER_FIELD).map(r => r.value).join(join),
      source: `Damages reading baseline (${Array.from(new Set(rows.map(r => r.basis))).join(', ')})`,
      onFile: true,
    })
  const noBaseline = baseline.length
    ? 'Not in the employment baseline. Unverified.'
    : 'The damages reading has not been run, so there is no employment baseline.'

  for (const { field, match } of SNAPSHOT_FIELDS) {
    if (field === 'Case Name') {
      if (input.caseName?.trim()) out.push({ field, value: input.caseName.trim(), source: 'The office’s case name for this client', onFile: true })
      else notOnFile(field, 'No case name recorded for this client.')
      continue
    }
    if (field === 'Plaintiff(s)') {
      out.push({ field, value: brief.clientName, source: 'Client record', onFile: Boolean(brief.clientName) })
      continue
    }
    if (field === 'Employment / Relevant Period') {
      // Start and end, as a span — the two lines the baseline keeps apart.
      const span = [/^start date/i, /^end date/i]
        .map(re => baseline.find(r => re.test(r.label)))
        .filter((r): r is BaselineRow => Boolean(r))
      if (span.length) fromBaseline(field, span, ' — ')
      else notOnFile(field, noBaseline)
      continue
    }
    const rows = match ? baseline.filter(r => match.test(r.label)) : []
    if (rows.length) {
      fromBaseline(field, rows)
      continue
    }
    // Who's Who answers these when the baseline does not — but only with
    // people named well enough to be found. "manager" is not a decisionmaker
    // anyone can depose.
    if (field === 'Key Supervisors / Decisionmakers') {
      const bosses = people.filter(p => p.alignment === 'company' && p.kind === 'individual')
      const named = bosses.filter(p => p.identified)
      if (named.length) {
        out.push({ field, value: named.map(p => p.name).join(', '), source: 'Named in her answers (Who’s Who)', onFile: true })
      } else {
        notOnFile(
          field,
          bosses.length
            ? `Not named. She refers to ${bosses.slice(0, 4).map(p => `“${p.name}”`).join(', ')} and gives no name.`
            : noBaseline
        )
      }
      continue
    }
    if (field === 'Defendant(s)') {
      const entities = people.filter(p => p.kind === 'entity' && p.identified)
      if (entities.length) {
        out.push({ field, value: entities.map(p => p.name).join(', '), source: 'Named in her answers (Who’s Who)', onFile: true })
        continue
      }
    }
    notOnFile(field, field === 'Case Number / Forum' ? 'No filing is recorded in the portal.' : noBaseline)
  }

  const core = issues.slice(0, 5).map(i => i.issue)
  out.push(
    core.length
      ? { field: 'Core Factual Issues', value: core.join(', '), source: 'The issues with the most facts on file', onFile: true }
      : { field: 'Core Factual Issues', value: '', source: 'No fact carries an issue tag yet.', onFile: false }
  )
  out.push(
    statements.length
      ? {
          field: 'Likely Defense Theme',
          value: statements[0].proposition,
          source: `What the employer said, as she reported it (${bare(statements[0].id)})`,
          onFile: true,
        }
      : {
          field: 'Likely Defense Theme',
          value: '',
          source: 'No statement by the employer is on file. The case brief carries the predicted defences.',
          onFile: false,
        }
  )
  return out
}

// ── VI. record categories ───────────────────────────────────────────────────

const CATEGORIES: { key: string; title: string; match: RegExp }[] = [
  { key: 'A', title: 'Time Records / Schedules / Dispatch Records', match: /time ?card|timesheet|time record|clock|punch|schedul|dispatch|shift|eld|log ?book/i },
  { key: 'B', title: 'Payroll / Wage Statements / Checks', match: /payroll|pay ?stub|wage statement|paycheck|check|deposit|w-2|1099|earnings/i },
  { key: 'C', title: 'Policies / Handbooks / Agreements / Waivers', match: /polic|handbook|agreement|waiver|acknowledg|arbitration|contract|offer letter/i },
  { key: 'D', title: 'Messages / Emails / WeChat / Slack / Texts', match: /text|message|e-?mail|wechat|slack|kakao|whatsapp|chat|voicemail/i },
  { key: 'E', title: 'Photos / Videos / Receipts / Location Evidence', match: /photo|video|receipt|gps|location|camera|footage|recording/i },
  { key: 'F', title: 'Personnel / Discipline / Performance Records', match: /personnel|disciplin|write-?up|performance|evaluation|warning|termination (?:letter|notice)|separation notice/i },
  { key: 'G', title: 'Medical / Leave / Accommodation Records', match: /medical|doctor|physician|leave|accommodation|disabilit|work restriction|clinic/i },
  { key: 'H', title: 'Discovery Responses / Admissions / Depositions', match: /interrogator|admission|deposition|discovery|request for production|rfp|rfa/i },
  { key: 'I', title: 'Third-Party Records', match: /./ },
]

function categoryOf(text: string): string {
  return CATEGORIES.find(c => c.match.test(text))!.key
}

function records(input: FactualTemplateInput, facts: LedgerFact[]): RecordCategory[] {
  const all = input.spine?.records ?? []
  return CATEGORIES.map(c => ({
    key: c.key,
    title: c.title,
    inHand: all.filter(r => r.inHand && categoryOf(r.record) === c.key),
    toObtain: all.filter(r => !r.inHand && categoryOf(r.record) === c.key),
    facts: facts.filter(f => fromARecord(f) && categoryOf(`${f.provenance.kind} ${f.provenance.pinpoint}`) === c.key),
  }))
}

// ── XII. quality control ────────────────────────────────────────────────────

function checks(
  input: FactualTemplateInput,
  view: Omit<FactualByTemplate, 'checks' | 'template'>,
  facts: LedgerFact[]
): Check[] {
  const { brief } = input
  const q = FACTUAL_TEMPLATE.qualityControl
  const c = (n: number, result: Check['result'], why: string): Check => ({ n, text: q[n - 1], result, why })

  const basics = view.snapshot.filter(s =>
    ['Employment / Relevant Period', 'Pay Method / Rate', 'Usual Schedule', 'Position(s)', 'Separation'].includes(s.field)
  )
  const unmarked = basics.filter(s => !s.onFile)
  const estimated = input.baseline.filter(r => r.basis !== 'FACT').length

  const issuesWithoutSource = view.issues.filter(i => !i.account.some(f => f.provenance?.pinpoint?.trim()))
  const byKey = new Map(view.records.map(r => [r.key, r]))
  const heldOrUsed = (k: string) => (byKey.get(k)?.inHand.length ?? 0) + (byKey.get(k)?.facts.length ?? 0)
  const discovery = heldOrUsed('H')
  const unidentified = brief.people.filter(p => !p.identified && p.facts.length > 0)
  const unsourced = brief.damages.filter(d => d.unresolved)
  const argued = legalConclusionsIn(brief)

  return [
    unmarked.length
      ? c(1, 'gap', `Not on file, and marked unverified: ${unmarked.map(s => s.field).join(', ')}.`)
      : c(1, estimated ? 'gap' : 'met', estimated
          ? `On file, but ${estimated} baseline line${estimated === 1 ? ' is' : 's are'} estimated or assumed rather than a fact.`
          : 'Each is on file from the baseline.'),
    issuesWithoutSource.length
      ? c(2, 'gap', `No sourced example for: ${issuesWithoutSource.map(i => i.issue).join(', ')}.`)
      : view.issues.length
        ? c(2, 'met', 'Every issue has at least one fact with a pinpoint source.')
        : c(2, 'gap', 'No fact carries an issue tag yet.'),
    heldOrUsed('A') && heldOrUsed('B')
      ? c(3, 'for a person', 'Time and payroll records are both on file. Whether they were compared line by line is for a person to confirm.')
      : c(3, 'not yet', 'Time and payroll records are not both on file, so there is nothing to cross-check yet.'),
    discovery
      ? c(4, 'for a person', `${discovery} discovery item${discovery === 1 ? '' : 's'} on file. Whether each admission is carried into the issues is for a person.`)
      : c(4, 'not yet', 'No discovery is on file.'),
    brief.weaknesses.length
      ? c(5, 'met', `${brief.weaknesses.length} harmful fact${brief.weaknesses.length === 1 ? '' : 's'} or contradiction${brief.weaknesses.length === 1 ? '' : 's'} listed in II.D and VIII.`)
      : c(5, 'gap', 'Nothing is listed as cutting against the account. That is rarely true of a real file; check it.'),
    brief.strongestProof.length
      ? c(6, 'met', 'Listed first, in II.B.')
      : c(6, 'gap', 'Nothing on file is corroborated by anything other than her account, so there is no nugget to lead with.'),
    unidentified.length
      ? c(7, 'gap', `${unidentified.length} person${unidentified.length === 1 ? ' is' : 's are'} not named well enough to be found: ${unidentified.slice(0, 5).map(p => p.name).join(', ')}.`)
      : brief.people.length
        ? c(7, 'met', 'Each person in VII is tied to the facts they appear in.')
        : c(7, 'gap', 'No witness is identified yet.'),
    (() => {
      const toObtain = view.records.reduce((n, r) => n + r.toObtain.length, 0)
      const searchedGaps = input.searched ? input.searched.categories.reduce((n, cat) => n + cat.missing.length + cat.inaccessible.length, 0) : 0
      if (input.searched === null && toObtain === 0) return c(8, 'gap', 'No records are named to obtain, and no search record exists for these facts.')
      return c(8, 'met', `${toObtain} record${toObtain === 1 ? '' : 's'} to obtain in VI${input.searched ? `; ${searchedGaps} missing or unopened source${searchedGaps === 1 ? '' : 's'} in the search record` : ''}.`)
    })(),
    unsourced.length
      ? c(9, 'gap', `Kept apart, and ${unsourced.length} input${unsourced.length === 1 ? ' is' : 's are'} not established: ${unsourced.map(d => d.input).join(', ')}.`)
      : brief.damages.length
        ? c(9, 'met', 'Every damages input has a fact on file; assumptions are logged separately.')
        : c(9, 'not yet', 'No fact carries a damages input yet.'),
    c(10, 'for a person', 'XI is assembled from the core story, and each fact keeps its status. Whether the narrative overstates is a reader’s judgement.'),
    argued.length
      ? c(11, 'gap', `${argued.length} line${argued.length === 1 ? ' reads' : 's read'} as a legal conclusion, e.g. “${argued[0].text.slice(0, 90)}” (${argued[0].where}).`)
      : c(11, 'met', 'No line reads as a legal conclusion.'),
    view.plan.length
      ? c(12, 'met', `The ${view.plan.length} highest-value steps, from the most material facts first.`)
      : c(12, facts.length ? 'gap' : 'not yet', 'No open loop is recorded on any fact.'),
  ]
}

// ── the whole thing ─────────────────────────────────────────────────────────

export function byTemplate(input: FactualTemplateInput): FactualByTemplate {
  const { brief } = input
  const facts = input.ledger.filter(live)
  const statements = facts.filter(isEmployerStatement)
  const anomalies = input.spine?.anomalies ?? []

  // The template repeats its eight parts "for each material claim or issue".
  // A real file carried 136 issue tags, 96 of them on one or two facts; eight
  // headed parts under each is a sheet nobody reads. Material means enough
  // facts to develop, and the rest are listed by name.
  const material = brief.issues.filter(i => i.account.length >= MATERIAL_AT).slice(0, MAX_ISSUES)
  const otherIssues = brief.issues
    .filter(i => !material.includes(i))
    .map(i => ({ issue: i.issue, facts: i.account.length }))

  const issues: IssueByTemplate[] = material.map(i => {
    const ids = new Set(i.account.map(f => bare(f.id)))
    const ranked = i.account.slice().sort((a, b) => proofWeight(b) - proofWeight(a))
    return {
      issue: i.issue,
      account: i.account,
      documentary: i.account.filter(fromARecord),
      defendant: i.account.filter(isEmployerStatement),
      corroboration: i.corroborated,
      consistentWith: i.consistentWith,
      contrary: i.harmful,
      disputed: i.disputed,
      anomalies: anomalies
        .filter(a => a.what && (a.facts ?? []).some(id => ids.has(bare(id))))
        .map(a => (a.wouldConfirmIt ? `${a.what} — ${a.wouldConfirmIt}` : a.what!)),
      nugget: ranked[0] ? { fact: ranked[0], proof: isProof(ranked[0]) } : null,
      missing: i.open,
    }
  })

  // The loops on the most material facts first: a gap under a corroborated
  // fact with a damages input matters more than one under her street address.
  const plan = Array.from(
    new Set(
      facts
        .slice()
        .sort((a, b) => proofWeight(b) - proofWeight(a))
        .map(f => f.openLoop?.trim())
        .filter((s): s is string => Boolean(s))
    )
  ).slice(0, 10)

  const baselineOf = (re: RegExp) => input.baseline.filter(r => re.test(r.label)).map(r => `${r.label}: ${r.value}`)

  const view: Omit<FactualByTemplate, 'checks' | 'template'> = {
    snapshot: snapshot(input, issues, statements),
    theory: {
      admissions: [...statements, ...facts.filter(f => fromARecord(f) && !statements.includes(f))],
      provenNext: plan.slice(0, 5),
    },
    parties: {
      employer: [
        ...baselineOf(/employer|company|business|industry|employees|location/i),
        ...brief.people.filter(p => p.kind === 'entity').map(p => `${p.name} — named in ${p.facts.length} fact${p.facts.length === 1 ? '' : 's'}`),
      ],
      job: baselineOf(/position|title|job|role|duties/i),
      control: brief.people
        .filter(p => p.alignment === 'company' && p.kind === 'individual')
        .map(p => ({ name: p.name, knows: p.facts.length, about: p.knowsAbout })),
      pay: baselineOf(/pay|rate|wage|salary|commission|overtime|classif/i),
    },
    issues,
    otherIssues,
    records: records(input, facts),
    defense: {
      narrative: statements,
      supporting: brief.weaknesses
        .filter(w => w.kind === 'Contrary fact')
        .map(w => ({ what: w.what, against: w.against })),
      rebuttal: brief.strongestProof,
      unresolved: [
        ...facts.filter(f => f.status.toUpperCase() === 'DISPUTED').map(f => f.proposition),
        ...(input.spine?.dateConflicts ?? []).map(d => d.what ?? '').filter(Boolean),
      ],
    },
    damagesMissing: brief.damages.filter(d => d.unresolved).map(d => d.input),
    plan,
    summary: {
      paragraphs: brief.coreStory.map(c => c.note).filter(Boolean),
      how: 'Assembled from the evidence spine’s core story, not written. The narrative carried into a pleading, a mediation brief or a trial brief is a lawyer’s to write from sections II–IX.',
    },
  }

  return { template: FACTUAL_TEMPLATE, ...view, checks: checks(input, view, facts) }
}
