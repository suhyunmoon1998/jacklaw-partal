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
const WAGE_ORDERS = wageOrderData as unknown as Keyed
const CACI = caciData as unknown as Keyed

const STATUTE_LAWS = ['LAB', 'GOV', 'CCP', 'BPC']

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
    [new RegExp(`^(LAB|GOV|CCP|BPC|LAMC)\\s+${num}$`, 'i'), m => `${m[1].toUpperCase()} ${m[2]}`],
    [new RegExp(`^(?:cal(?:ifornia)?\\.?\\s+)?lab(?:or|our)?\\.?\\s*code${sec}${num}$`, 'i'), m => `LAB ${m[1]}`],
    [new RegExp(`^(?:cal(?:ifornia)?\\.?\\s+)?gov(?:ernment|t)?\\.?\\s*code${sec}${num}$`, 'i'), m => `GOV ${m[1]}`],
    [new RegExp(`^(?:code\\s*(?:of\\s*)?civ(?:il)?\\.?\\s*proc(?:edure)?\\.?|civ(?:il)?\\.?\\s*proc(?:edure)?\\.?\\s*code)${sec}${num}$`, 'i'), m => `CCP ${m[1]}`],
    [new RegExp(`^bus(?:iness)?\\.?\\s*(?:&|and)\\s*prof(?:essions)?\\.?\\s*code${sec}${num}$`, 'i'), m => `BPC ${m[1]}`],
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
    }
  })
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
  'under', 'any', 'that', 'this', 'which', 'there', 'when', 'who', 'an', 'as', 'if',
])

function terms(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9.\-]*[a-z0-9]|[a-z0-9]/g) ?? []).filter(t => !STOP.has(t))
}

/**
 * English stems, enough to match "breaks" to "break", "waived" to "waiver"
 * and "employers" to "employer" (and not to "employee").
 */
function stem(t: string): string {
  if (/^\d/.test(t) || t.length < 4) return t
  let s = t
  if (s.endsWith('ies') && s.length > 4) s = `${s.slice(0, -3)}y`
  else if (s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1)
  if (s.length > 5 && /(?:ing|ed)$/.test(s)) s = s.replace(/(?:ing|ed)$/, '')
  else if (s.length > 5 && s.endsWith('er')) s = s.slice(0, -2)
  if (s.length > 4 && s.endsWith('e')) s = s.slice(0, -1)
  return s
}

/**
 * The office's shorthand, in the words the provisions use: the Labor Code
 * never says "PAGA" or "LWDA", and section 2802 says "indemnify" and
 * "expenditures", not "reimbursement".
 */
const SHORTHAND: [RegExp, string][] = [
  [/\bpaga\b/i, 'private attorneys general'],
  [/\blwda\b/i, 'labor workforce development agency'],
  [/\bfeha\b/i, 'fair employment housing'],
  [/\bdlse\b/i, 'labor commissioner standards enforcement'],
  [/\breimburs\w*|\bexpenses?\b/i, 'indemnify necessary expenditures losses'],
  [/\bpay ?stubs?\b/i, 'wage statement itemized'],
  [/\bsick (?:leave|days?|time)\b/i, 'paid sick days leave'],
  [/\bfinal (?:pay|paycheck|wages?)\b|\blast paycheck\b/i, 'discharged quits wages earned unpaid'],
  [/\bmisclassif\w*/i, 'independent contractor employee'],
]

let index: { docs: Doc[]; df: Map<string, number>; avgLength: number } | null = null

function buildIndex() {
  if (index) return index
  const docs: Doc[] = []
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
  for (const [k, v] of Object.entries(STATUTES.sections)) add(k, v, '')
  for (const [k, v] of Object.entries(WAGE_ORDERS.sections)) add(k, v, v.trim().split('\n')[0].trim())
  for (const [k, v] of Object.entries(CACI.sections)) add(k, v, v.trim().split('\n')[0].trim())
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
    return (idf * (tf * (k1 + 1))) / (tf + k1 * (1 - b + (b * d.length) / avgLength)) + (d.titleTerms.has(t) ? 0.5 : 0)
  }

  const scored = docs
    .map(d => {
      let score = 0
      let matched = 0
      for (const t of wanted) {
        const w = weigh(d, t)
        if (w) matched++
        score += w
      }
      for (const t of extra) {
        const w = weigh(d, t)
        if (w) matched++
        score += 0.7 * w
      }
      if (wanted.length > 1 && matched < Math.ceil(wanted.length / 2)) score = 0
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
