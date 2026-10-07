/**
 * The authority on file, for Eleanor to quote instead of remembering.
 *
 * Eleanor answers Jack's questions with a model trained on text from 2023.
 * Asked what a California statute says, it answered from that memory, and the
 * Labor Code has moved since (the PAGA sections held here carry amendments
 * dated June 19, 2024; Los Angeles has issued three minimum-wage notices).
 * The office already holds the provisions themselves, fetched from the bodies
 * that issue them (lib/authority/index.ts). This lets Eleanor search them and
 * read them word for word — the same rule as the readings: the model is handed
 * the text, not asked what the law says.
 *
 * Read-only and public law: no client data passes through here. Served to
 * Eleanor by /api/eleanor/authority, behind the service secret.
 */

import { FETCHED_ON, cite, parseKey, section } from '@/lib/authority'
import { HOLDINGS, caseRecord, citeCase } from '@/lib/authority/cases'
import { ALL_CLAIMS } from '@/lib/authority/claims'
import statuteData from './statutes.json'
import wageOrderData from './wageOrders.json'
import caciData from './caci.json'

export type AuthorityKind = 'statute' | 'regulation' | 'ordinance' | 'wage order' | 'jury instruction' | 'holding'

export interface Fetched {
  on: string
  from: string
}

export interface AuthorityText {
  /** As asked, normalized: 'LAB 512', 'IWC 5 sec 11', 'CACI 2766A', or a holding's id. */
  key: string
  /** As the office cites it. */
  cite: string
  kind: AuthorityKind | null
  onFile: boolean
  text?: string
  /** Set when the text is one part of a longer provision. */
  part?: { of: number; next: string | null }
  fetched?: Fetched
  /** Why nothing is given, when nothing is. */
  note?: string
  /** What this repository already ties to it: the claims read out of it, its chapter, the instructions citing it. */
  topics?: string[]
  /** Provisions and holdings to read beside it, as keys for another read. */
  related?: { key: string; cite: string }[]
}

export interface AuthorityHit {
  key: string
  cite: string
  kind: AuthorityKind
  /** The provision's own heading, where it has one; a holding's summary. */
  title: string
  snippet: string
  fetched: Fetched
}

/** A part of a long provision: Eleanor asks for the next by key. */
export const PART_CHARS = 10_000

type Keyed = { sections: Record<string, string> }
const STATUTES = statuteData as unknown as Keyed
type Chapter = { law: string; label: string; range: string[]; fetched?: string }
const STATUTES_META = statuteData as unknown as { chapters: Record<string, Chapter> }
const WAGE_ORDERS = wageOrderData as unknown as Keyed
const CACI = caciData as unknown as Keyed

const STATUTE_LAWS = ['LAB', 'GOV', 'CCP', 'BPC', 'HSC']

function kindOf(law: string): AuthorityKind {
  if (law === 'IWC') return 'wage order'
  if (law === 'CACI') return 'jury instruction'
  if (law === 'CCR2') return 'regulation'
  if (law === 'LAMC' || law === 'LAMW') return 'ordinance'
  return 'statute'
}

/** Where and when the text of a provision was pulled. */
export function fetchedFor(law: string, num: string): Fetched {
  const pick = (k: string) => FETCHED_ON[k] ?? FETCHED_ON.statutes
  // A chapter pulled on its own day says so in its record.
  const own = law === 'IWC' || law === 'CACI' ? undefined : chapterOf(law, num)?.fetched
  if (own && FETCHED_ON[own]) return FETCHED_ON[own]
  if (law === 'IWC') return pick('wageOrders')
  if (law === 'CACI') return pick('caci')
  if (law === 'GOV') return pick('feha')
  if (law === 'CCR2') return pick('fehaRegs')
  if (law === 'LAMC' || law === 'LAMW') return pick('laMinimumWage')
  if (law === 'LAB' && Number(num) >= 1474 && Number(num) < 1478) return pick('fastFood')
  return pick('statutes')
}

const HOLDING_IDS = new Set(HOLDINGS.map(h => h.id))

/**
 * A key in the form the library uses, from the forms a model writes.
 *
 * 'Labor Code § 226.7', 'Lab. Code section 512', 'Gov. Code 12940', 'Wage Order
 * 5, § 11', 'IWC Wage Order No. 5 sec 12', 'CACI No. 2766A', '2 CCR 11068',
 * a holding's id, or a bare section number held in exactly one code. Null for
 * anything else: a key that cannot be read is not guessed at.
 */
export function normalizeKey(raw: string): string | null {
  const input = raw.replace(/\s+/g, ' ').trim()
  if (!input || input.length > 80) return null
  if (HOLDING_IDS.has(input.toLowerCase())) return input.toLowerCase()

  const num = '(\\d+(?:\\.\\d+)*[a-z]?)'
  const sec = '(?:,?\\s*(?:§+|sec(?:tion)?s?\\.?))?\\s*'
  const tries: [RegExp, (m: RegExpMatchArray) => string][] = [
    [new RegExp(`^(LAB|GOV|CCP|BPC|HSC|LAMC)\\s+${num}$`, 'i'), m => `${m[1].toUpperCase()} ${m[2]}`],
    [new RegExp(`^(?:cal(?:ifornia)?\\.?\\s+)?lab(?:or|our)?\\.?\\s*code${sec}${num}$`, 'i'), m => `LAB ${m[1]}`],
    [new RegExp(`^(?:cal(?:ifornia)?\\.?\\s+)?gov(?:ernment|t)?\\.?\\s*code${sec}${num}$`, 'i'), m => `GOV ${m[1]}`],
    [new RegExp(`^(?:code\\s*(?:of\\s*)?civ(?:il)?\\.?\\s*proc(?:edure)?\\.?|civ(?:il)?\\.?\\s*proc(?:edure)?\\.?\\s*code)${sec}${num}$`, 'i'), m => `CCP ${m[1]}`],
    [new RegExp(`^bus(?:iness)?\\.?\\s*(?:&|and)\\s*prof(?:essions)?\\.?\\s*code${sec}${num}$`, 'i'), m => `BPC ${m[1]}`],
    [new RegExp(`^(?:cal(?:ifornia)?\\.?\\s+)?health\\s*(?:&|and)\\s*saf(?:ety)?\\.?\\s*code${sec}${num}$`, 'i'), m => `HSC ${m[1]}`],
    [new RegExp(`^(?:2\\s*ccr|ccr2|cal(?:ifornia)?\\.?\\s*code\\s*(?:of\\s*)?regs?\\.?,?\\s*tit(?:le)?\\.?\\s*2,?)${sec}${num}$`, 'i'), m => `CCR2 ${m[1]}`],
    [new RegExp(`^(?:l\\.?a\\.?|los angeles)\\s*mun(?:icipal)?\\.?\\s*code${sec}${num}$`, 'i'), m => `LAMC ${m[1]}`],
    [/^lamw\s+(\d{4}-\d{2}-\d{2})$/i, m => `LAMW ${m[1]}`],
    [
      // "IWC" or "Wage Order" must be said: a bare "512" is not Order 51, section 2.
      new RegExp(`^(?:iwc\\s*(?:wage\\s*order\\s*)?|wage\\s*order\\s*)(?:no\\.?\\s*)?(\\d{1,2}|mw-\\d{4})(?:-\\d{4})?${sec}(\\d{1,2})$`, 'i'),
      m => `IWC ${m[1].toUpperCase()} sec ${m[2]}`,
    ],
    [/^iwc\s+(\d{1,2}|mw-\d{4})\s+sec\s+(\d{1,2})$/i, m => `IWC ${m[1].toUpperCase()} sec ${m[2]}`],
    [/^(?:iwc\s*)?(?:wage\s*order\s*)(?:no\.?\s*)?(\d{1,2}|mw-\d{4})$/i, m => `IWC ${m[1].toUpperCase()}`],
    [/^iwc\s+(\d{1,2}|mw-\d{4})$/i, m => `IWC ${m[1].toUpperCase()}`],
    [/^caci\s*(?:no\.?\s*)?(\d{3,4}[a-z]?)$/i, m => `CACI ${m[1].toUpperCase()}`],
  ]
  for (const [pattern, make] of tries) {
    const m = input.match(pattern)
    if (m) return make(m)
  }
  // A bare number is read only where exactly one code holds it.
  const bare = input.match(/^(?:§+\s*|sec(?:tion)?\.?\s*)?(\d+(?:\.\d+)*[a-z]?)$/i)
  if (bare) {
    const held = STATUTE_LAWS.filter(law => section(law, bare[1]) !== null)
    if (held.length === 1) return `${held[0]} ${bare[1]}`
  }
  return null
}

/** A long text in parts, cut at a paragraph near the limit. */
function parts(text: string): string[] {
  const out: string[] = []
  let rest = text
  while (rest.length > PART_CHARS) {
    const cut = rest.lastIndexOf('\n', PART_CHARS)
    const at = cut > PART_CHARS / 2 ? cut : PART_CHARS
    out.push(rest.slice(0, at))
    rest = rest.slice(at).replace(/^\n+/, '')
  }
  out.push(rest)
  return out
}

/** The sections of one Wage Order, by heading: a Wage Order named without a section. */
function wageOrderContents(order: string): AuthorityText {
  const prefix = `IWC ${order} sec `
  const lines = Object.entries(WAGE_ORDERS.sections)
    .filter(([k]) => k.startsWith(prefix))
    .map(([k, v]) => `${k} — ${v.trim().split('\n')[0].trim()}`)
  if (!lines.length) {
    return { key: `IWC ${order}`, cite: `IWC Wage Order ${order}`, kind: 'wage order', onFile: false, note: 'NOT ON FILE.' }
  }
  return {
    key: `IWC ${order}`,
    cite: `IWC Wage Order ${order}`,
    kind: 'wage order',
    onFile: true,
    text: `Sections on file — read one by its key:\n${lines.join('\n')}`,
    fetched: fetchedFor('IWC', order),
    note: "Which Wage Order governs turns on the employer's industry. The Portal proposes one; an attorney settles it.",
  }
}

function holdingText(id: string): AuthorityText {
  const h = HOLDINGS.find(x => x.id === id)!
  const record = caseRecord(h.case)
  return {
    key: id,
    cite: citeCase(h.case),
    kind: 'holding',
    onFile: true,
    text:
      `"${h.quote}"\n\n` +
      `What it does not decide: ${h.limits}\n\n` +
      `The office's summary (written by hand, not yet reviewed by an attorney): ${h.proposition}`,
    fetched: record ? { on: record.fetchedOn, from: record.source } : FETCHED_ON.statutes,
    note: `${h.opinionPart === 'majority' ? 'Majority opinion' : `${h.opinionPart}, not a holding`}. Quoted verbatim from the opinion held in full; no reporter page is given.`,
  }
}

/**
 * The provisions asked for, word for word. A key may end in "part 2" for the
 * rest of a long provision.
 */
export function readAuthority(keys: string[]): AuthorityText[] {
  return keys.map(raw => {
    const asked = raw.replace(/\s+/g, ' ').trim()
    const partMatch = asked.match(/^(.*?)\s*,?\s*part\s*(\d{1,2})$/i)
    const wantedPart = partMatch ? Number(partMatch[2]) : 1
    const key = normalizeKey(partMatch ? partMatch[1] : asked)
    if (!key) {
      return {
        key: asked.slice(0, 80),
        cite: asked.slice(0, 80),
        kind: null,
        onFile: false,
        note: 'Not a key the library can read. Search instead, or name it as "Lab. Code § 512", "IWC 5 sec 11" or "CACI 2766A".',
      }
    }
    if (HOLDING_IDS.has(key)) return holdingText(key)
    const { law, num } = parseKey(key)
    if (law === 'IWC' && !num.includes(' sec ')) return wageOrderContents(num)
    const text = section(law, num)
    if (!text) {
      return {
        key,
        cite: cite(law, num),
        kind: kindOf(law),
        onFile: false,
        note: 'NOT ON FILE. Do not state what this provision says; say the office does not hold it.',
      }
    }
    const pieces = parts(text)
    const index = Math.min(Math.max(wantedPart, 1), pieces.length) - 1
    return {
      key,
      cite: cite(law, num),
      kind: kindOf(law),
      onFile: true,
      text: pieces[index],
      ...(pieces.length > 1
        ? { part: { of: pieces.length, next: index + 1 < pieces.length ? `${key} part ${index + 2}` : null } }
        : {}),
      fetched: fetchedFor(law, num),
      ...navigation(key),
    }
  })
}

/**
 * What to read beside a provision, from what this repository already ties
 * together by hand: the CACI instructions whose titles cite a statute, the
 * statutes an instruction cites, and the holdings bearing on claims read out
 * of it. Nothing here is inferred.
 */
function navigation(key: string): { topics?: string[]; related?: { key: string; cite: string }[] } {
  const { law, num } = parseKey(key)
  const related: { key: string; cite: string }[] = []
  const push = (k: string, c: string) => {
    if (k !== key && !related.some(r => r.key === k)) related.push({ key: k, cite: c })
  }
  if (law === 'CACI') {
    const title = caciTitle(section(law, num) ?? '')
    for (const cited of citedInTitle(title)) {
      const p = parseKey(cited)
      if (section(p.law, p.num)) push(cited, cite(p.law, p.num))
    }
  } else if (law !== 'IWC') {
    for (const [k, text] of Object.entries(CACI.sections)) {
      if (citedInTitle(caciTitle(text)).includes(key)) push(k, cite('CACI', parseKey(k).num))
    }
    const claims = ALL_CLAIMS.filter(c => [...c.sections, ...c.elements.map(e => e.from)].includes(key)).map(c => c.id)
    for (const h of HOLDINGS) {
      if (h.bearsOn.some(b => claims.includes(b.split(':')[0]))) push(h.id, citeCase(h.case))
    }
  }
  const topics = topicLabels().get(key)
  return {
    ...(topics?.length ? { topics: topics.slice(0, 8) } : {}),
    ...(related.length ? { related: related.slice(0, 10) } : {}),
  }
}

// ── Search ───────────────────────────────────────────────────────────────

type Doc = {
  key: string
  law: string
  num: string
  text: string
  title: string
  titleTerms: Set<string>
  terms: Map<string, number>
  length: number
}

const STOP = new Set([
  'the', 'a', 'an', 'of', 'to', 'in', 'for', 'and', 'or', 'on', 'at', 'by', 'with', 'is', 'are', 'be', 'what',
  'how', 'does', 'do', 'california', 'law', 'laws', 'code', 'section', 'sections', 'rule', 'rules', 'about',
  'under', 'any', 'that', 'this', 'which', 'there', 'when', 'who', 'an', 'as', 'if', 'has', 'have', 'must',
  'can', 'my', 'our', 'his', 'her', 'their', 'from', 'after', 'while', 'employee', 'employer',
])

/** Numbers as statutes write them: "12 hours", where a question says "twelve". */
const NUMBER_WORDS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', fifteen: '15', twenty: '20', thirty: '30', forty: '40', fifty: '50', sixty: '60',
  ninety: '90',
}

function terms(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9.\-]*[a-z0-9]|[a-z0-9]/g) ?? [])
    .map(t => NUMBER_WORDS[t] ?? t)
    .filter(t => !STOP.has(t))
}

/**
 * English stems, enough to match "breaks" to "break", "waived" to "waiver",
 * "retaliation" to "retaliate" and "employers" to "employer" (and not to
 * "employee").
 */
function stem(t: string): string {
  if (/^\d/.test(t) || t.length < 4) return t
  let s = t
  if (s.endsWith('ies') && s.length > 4) s = `${s.slice(0, -3)}y`
  else if (s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1)
  if (s.length > 6 && s.endsWith('ion')) s = s.slice(0, -3)
  else if (s.length > 5 && /(?:ing|ed)$/.test(s)) s = s.replace(/(?:ing|ed)$/, '')
  else if (s.length > 5 && s.endsWith('er')) s = s.slice(0, -2)
  if (s.length > 4 && s.endsWith('e')) s = s.slice(0, -1)
  return s
}

/**
 * The office's words, in the words the provisions use. The Labor Code never
 * says "PAGA", "fired" or "paycheck"; section 2802 says "indemnify" and
 * "expenditures", not "reimbursement"; a limitations period is "within three
 * years … liability created by statute".
 */
const SHORTHAND: [RegExp, string][] = [
  [/\bpaga\b/i, 'private attorneys general'],
  [/\blwda\b|\bthe agency\b/i, 'labor workforce development agency'],
  [/\bfeha\b/i, 'fair employment housing'],
  [/\bdlse\b/i, 'labor commissioner standards enforcement'],
  [/\breimburs\w*|\bexpenses?\b/i, 'indemnify necessary expenditures losses'],
  [/\bpay ?stubs?\b/i, 'wage statement itemized'],
  [/\bsick (?:leave|days?|time)\b/i, 'paid sick days leave'],
  [/\bfinal (?:pay|paycheck|wages?)\b|\blast paycheck\b/i, 'discharged quits wages earned unpaid'],
  [/\bmisclassif\w*/i, 'independent contractor employee'],
  [/\bfir(?:e|ed|ing)\b|\bterminat\w*|\blet go\b|\blaid off\b/i, 'discharge discharged'],
  [/\bquit\w*/i, 'quits'],
  [/\bpay ?checks?\b/i, 'wages paid'],
  [/\bboss\b/i, 'employer'],
  [/\blunch\b/i, 'meal'],
  [/\bbreaks?\b/i, 'period'],
  [/\b(?:meal|rest|break|lunch)\w*\b.*\bpremium\b|\bpremium\b.*\b(?:meal|rest|break|lunch)/i, 'additional hour pay'],
  [/\bsplit shifts?\b/i, 'split shift'],
  [/\bcomplain\w*/i, 'complaint claim'],
  [/\bstatutes? of limitations?\b|\blimitations period\b|\b(?:deadline|time limit) to (?:sue|file)\b/i, 'within three years liability created by statute commenced within four years'],
  [/\btips?\b|\btip pool\w*/i, 'gratuity gratuities'],
  [/\bdeduct\w*/i, 'deduction withhold'],
  [/\bdouble time\b/i, 'twice regular rate'],
  [/\bharass\w*/i, 'harassment harass'],
  [/\bagreements?\b/i, 'contract'],
  [/\bhot\b|\bheat\b/i, 'heat temperature'],
  // Added with the sections pulled on 2026-10-06, for the questions they answer.
  [/\bjury (?:duty|service)\b|\bserv\w* on (?:a |the )?jury\b/i, 'inquest jury trial jury time off'],
  [/\b(?:lie|lied|lies|lying)\b/i, 'false representations misrepresentation'],
  [/\b(?:move|moved|moving)\b/i, 'change residence place another'],
  [/\breferences?\b|\bblacklist\w*|\bbad-?mouth\w*/i, 'misrepresentation prevents obtaining employment'],
]

/**
 * Topic names for provisions that carry none. Statutes come from the
 * Legislature without headings, so a question in the office's words ("double
 * time", "final pay") missed the section that answers it while every CACI
 * instruction, which has a title, came first. Each statute is labelled with
 * what this repository already says about it, by hand: its chapter's name,
 * the names of the claims read out of it (claims.ts), and the titles of the
 * CACI instructions that cite it.
 */
const CODE_OF: Record<string, string> = {
  'Lab.': 'LAB',
  'Gov.': 'GOV',
  'Code Civ.': 'CCP',
  'Bus. & Prof.': 'BPC',
  'Health & Saf.': 'HSC',
}

/** The statutes a CACI instruction's title cites, as keys: "(Lab. Code, §§ 226.7, 512)". */
export function citedInTitle(title: string): string[] {
  const out: string[] = []
  const re = /(Lab\.|Gov\.|Code Civ\.|Bus\. & Prof\.|Health & Saf\.)\s*(?:Code)?\s*(?:Proc\.)?,?\s*§§?\s*((?:\d+(?:\.\d+)*(?:\([a-z0-9]+\))*(?:,\s*|\s+and\s+)?)+)/g
  for (const m of Array.from(title.matchAll(re))) {
    for (const n of m[2].match(/\d+(?:\.\d+)*/g) ?? []) out.push(`${CODE_OF[m[1]]} ${n}`)
  }
  return Array.from(new Set(out))
}

/** A CACI instruction's title: its first lines, where the title sits, run together. */
function caciTitle(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 240).split(/ \[Name of /)[0].trim()
}

/** The chapter a statute sits in: the narrowest range on file that holds its number. */
function chapterOf(law: string, num: string): Chapter | null {
  const n = Number(num)
  if (!Number.isFinite(n)) return null
  let best: { chapter: Chapter; width: number } | null = null
  for (const c of Object.values(STATUTES_META.chapters)) {
    if (c.law !== law) continue
    const [lo, hi] = c.range.map(Number)
    if (!(n >= lo && n <= hi)) continue
    const width = hi - lo
    if (!best || width < best.width) best = { chapter: c, width }
  }
  return best?.chapter ?? null
}

function chapterLabel(law: string, num: string): string | null {
  return chapterOf(law, num)?.label ?? null
}

let labelCache: Map<string, string[]> | null = null

/** Every statute's topic names (see above), by key. */
export function topicLabels(): Map<string, string[]> {
  if (labelCache) return labelCache
  const labels = new Map<string, Set<string>>()
  const add = (key: string, label: string) => {
    if (!labels.has(key)) labels.set(key, new Set())
    labels.get(key)!.add(label)
  }
  for (const key of Object.keys(STATUTES.sections)) {
    const { law, num } = parseKey(key)
    const chapter = law === 'LAMW' ? 'Los Angeles minimum wage notice' : chapterLabel(law, num)
    if (chapter) add(key, chapter)
  }
  for (const claim of ALL_CLAIMS) {
    for (const ref of [...claim.sections, ...claim.elements.map(e => e.from)]) {
      if (!ref.includes('{order}') && STATUTES.sections[ref]) add(ref, claim.name)
    }
  }
  for (const text of Object.values(CACI.sections)) {
    const title = caciTitle(text)
    for (const cited of citedInTitle(title)) {
      if (STATUTES.sections[cited]) add(cited, title.replace(/^\d+[A-Z]?\.\s*/, '').replace(/\s*\(.*$/, ''))
    }
  }
  labelCache = new Map(Array.from(labels.entries()).map(([k, v]) => [k, Array.from(v)]))
  return labelCache
}

let index: { docs: Doc[]; df: Map<string, number>; avgLength: number } | null = null

function buildIndex() {
  if (index) return index
  const docs: Doc[] = []
  const labels = topicLabels()
  const add = (key: string, text: string, title: string) => {
    const { law, num } = parseKey(key)
    const counts = new Map<string, number>()
    let length = 0
    for (const t of terms(`${title}\n${text}`)) {
      const s = stem(t)
      counts.set(s, (counts.get(s) ?? 0) + 1)
      length++
    }
    docs.push({ key, law, num, text, title, titleTerms: new Set(terms(title).map(stem)), terms: counts, length })
  }
  for (const [k, v] of Object.entries(STATUTES.sections)) add(k, v, (labels.get(k) ?? []).join(' · '))
  for (const [k, v] of Object.entries(WAGE_ORDERS.sections)) add(k, v, v.trim().split('\n')[0].trim())
  for (const [k, v] of Object.entries(CACI.sections)) add(k, v, caciTitle(v))
  for (const h of HOLDINGS) add(h.id, `${h.quote}\n${h.limits}`, h.proposition)
  const df = new Map<string, number>()
  for (const d of docs) for (const t of Array.from(d.terms.keys())) df.set(t, (df.get(t) ?? 0) + 1)
  const avgLength = docs.reduce((n, d) => n + d.length, 0) / Math.max(docs.length, 1)
  index = { docs, df, avgLength }
  return index
}

function snippetOf(text: string, needles: string[]): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const lower = flat.toLowerCase()
  let at = -1
  for (const n of needles) {
    if (!n) continue
    at = lower.indexOf(n)
    if (at >= 0) break
  }
  if (at < 0) return flat.length > 300 ? `${flat.slice(0, 300)} …` : flat
  const from = Math.max(0, at - 140)
  const start = from === 0 ? 0 : flat.indexOf(' ', from) + 1 || from
  const to = at + 220
  const space = to >= flat.length ? -1 : flat.indexOf(' ', to)
  const end = space === -1 ? flat.length : space
  return `${start > 0 ? '… ' : ''}${flat.slice(start, end).trim()}${end < flat.length ? ' …' : ''}`
}

/**
 * The provisions and holdings that best match a question, best first.
 *
 * Plain term matching, rarer terms counting more — nothing a model decides.
 * A query that is itself a key leads with that provision. One Wage Order
 * section repeats across seventeen Orders, so no more than two of the same
 * section are returned.
 */
export function searchAuthority(query: string, limit = 8): AuthorityHit[] {
  const q = query.replace(/\s+/g, ' ').trim().slice(0, 200)
  if (!q) return []
  const { docs, df, avgLength } = buildIndex()
  const wanted = Array.from(new Set(terms(q).map(stem)))
  const extra = Array.from(
    new Set(
      SHORTHAND.filter(([pattern]) => pattern.test(q))
        .flatMap(([, words]) => terms(words).map(stem))
        .filter(t => !wanted.includes(t))
    )
  )
  const exact = normalizeKey(q)
  const phrase = q.toLowerCase()
  // BM25: rarer terms count more, and a long instruction does not win merely
  // by repeating a word a short statute says once.
  const k1 = 1.2
  const b = 0.75
  const weigh = (d: Doc, t: string): number => {
    const tf = d.terms.get(t) ?? 0
    if (!tf) return 0
    const n = df.get(t) ?? 1
    const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5))
    return (idf * (tf * (k1 + 1))) / (tf + k1 * (1 - b + (b * d.length) / avgLength)) + (d.titleTerms.has(t) ? 1 : 0)
  }

  // How much of the question a provision answers, weighted by how telling each
  // word is: a provision that has the one rare word ("temperature") is not
  // dropped for lacking the filler ("too hot"), but one with only filler
  // ranks below one with the substance.
  const idfOf = (t: string) => {
    const n = df.get(t) ?? 0
    return n ? Math.log(1 + (docs.length - n + 0.5) / (n + 0.5)) : 0
  }
  const totalWeight = wanted.reduce((sum, t) => sum + idfOf(t), 0) + 0.7 * extra.reduce((sum, t) => sum + idfOf(t), 0)

  const scored = docs
    .map(d => {
      let score = 0
      let covered = 0
      for (const t of wanted) {
        const w = weigh(d, t)
        if (w) covered += idfOf(t)
        score += w
      }
      for (const t of extra) {
        const w = weigh(d, t)
        if (w) covered += 0.7 * idfOf(t)
        score += 0.7 * w
      }
      if (totalWeight > 0) score *= 0.25 + 0.75 * (covered / totalWeight)
      if (score && phrase.length > 6 && d.text.toLowerCase().includes(phrase)) score += 3
      if (exact && d.key === exact) score += 1000
      return { d, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b2) => b2.score - a.score)

  const out: AuthorityHit[] = []
  // The same duty is a section in every Order, numbered differently ("11.
  // MEAL PERIODS" in Order 5, "9." in Order 17): counted by its heading.
  const sameDuty = new Map<string, number>()
  for (const { d } of scored) {
    if (out.length >= Math.min(Math.max(limit, 1), 10)) break
    if (d.law === 'IWC') {
      const duty = d.title.replace(/^[\d.\s]+/, '').toLowerCase()
      const seen = sameDuty.get(duty) ?? 0
      if (seen >= 2) continue
      sameDuty.set(duty, seen + 1)
    }
    const isHolding = HOLDING_IDS.has(d.key)
    const h = isHolding ? HOLDINGS.find(x => x.id === d.key)! : null
    const record = h ? caseRecord(h.case) : null
    out.push({
      key: d.key,
      cite: h ? citeCase(h.case) : cite(d.law, d.num),
      kind: h ? 'holding' : kindOf(d.law),
      title: d.title.slice(0, 200),
      snippet: snippetOf(h ? h.quote : d.text, [phrase, ...wanted]),
      fetched: record ? { on: record.fetchedOn, from: record.source } : fetchedFor(d.law, d.num),
    })
  }
  return out
}
