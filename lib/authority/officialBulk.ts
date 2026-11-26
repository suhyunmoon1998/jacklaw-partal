/**
 * California statute text read from the Legislature's own bulk data, so a pull
 * needs no browser.
 *
 * leginfo.legislature.ca.gov answers an automated request for a section page
 * with a bot check, which is why the sections in statutes.json were read in a
 * browser by hand. The Legislature also publishes the same database for
 * download (downloads.leginfo.legislature.ca.gov, "pubinfo"): every code
 * section in force, one row each in LAW_SECTION_TBL with its text in a .lob
 * file, and every version of every bill of the session. That is the sanctioned
 * machine route, and it serves an honest client without a challenge. Never try
 * to get past the bot check on the section pages instead.
 *
 * The session archive is over a gigabyte, so it is read as a remote zip: the
 * central directory, then only the entries asked for, by HTTP Range.
 *
 * LAW_SECTION_TBL holds the version in force today. A bill chaptered this year
 * that takes effect next January is in the bill tables only until then — SB
 * 1394 (Stats. 2026, ch. 708) moves Farmworkers Day in Gov. Code § 6700 to
 * April 10 from 2027 while the code table still says March 31. So a pull also
 * names the chaptered bills that change a section and are not yet in the code.
 *
 * Node only (node:zlib, node:crypto). Imports nothing else, so a plain
 * `node scripts/law-pull.mjs` can load it.
 */

import { createHash } from 'node:crypto'
import { inflateRawSync } from 'node:zlib'

export const BULK_SESSION_ZIP = 'https://downloads.leginfo.legislature.ca.gov/pubinfo_2025.zip'
const USER_AGENT = 'JackLaw-Portal-authority-pull/1.0 (official bulk download)'

// ---------------------------------------------------------------- remote zip

type ZipEntry = { name: string; method: number; compSize: number; size: number; offset: number }
export type RemoteZip = { url: string; size: number; lastModified: string; entries: Map<string, ZipEntry> }

async function rangeRead(url: string, start: number, end: number): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Range: `bytes=${start}-${end}` } })
    if (res.status === 206) return Buffer.from(await res.arrayBuffer())
    if (attempt >= 3 || res.status < 500) throw new Error(`${url}: a range read answered ${res.status}`)
    await new Promise(r => setTimeout(r, 1000 * attempt))
  }
}

/** Where the central directory sits, from the archive's last bytes (ZIP64 included). */
export function findCentralDirectory(tail: Buffer, tailStart: number): { offset: number; size: number } {
  const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd < 0) throw new Error('not a zip: no end-of-central-directory record')
  let size = tail.readUInt32LE(eocd + 12)
  let offset = tail.readUInt32LE(eocd + 16)
  if (offset === 0xffffffff || size === 0xffffffff || tail.readUInt16LE(eocd + 10) === 0xffff) {
    const locator = eocd - 20
    if (locator < 0 || tail.readUInt32LE(locator) !== 0x07064b50) throw new Error('ZIP64 locator missing')
    const record = Number(tail.readBigUInt64LE(locator + 8)) - tailStart
    if (record < 0 || tail.readUInt32LE(record) !== 0x06064b50) throw new Error('ZIP64 record missing')
    size = Number(tail.readBigUInt64LE(record + 40))
    offset = Number(tail.readBigUInt64LE(record + 48))
  }
  return { offset, size }
}

export function parseCentralDirectory(cd: Buffer): Map<string, ZipEntry> {
  const entries = new Map<string, ZipEntry>()
  let p = 0
  while (p + 46 <= cd.length && cd.readUInt32LE(p) === 0x02014b50) {
    const nameLen = cd.readUInt16LE(p + 28)
    const extraLen = cd.readUInt16LE(p + 30)
    const commentLen = cd.readUInt16LE(p + 32)
    const name = cd.toString('utf8', p + 46, p + 46 + nameLen)
    let compSize = cd.readUInt32LE(p + 20)
    let size = cd.readUInt32LE(p + 24)
    let offset = cd.readUInt32LE(p + 42)
    // ZIP64 extra field: only the values whose 32-bit slot is saturated, in this order.
    let x = p + 46 + nameLen
    const extraEnd = x + extraLen
    while (x + 4 <= extraEnd) {
      const id = cd.readUInt16LE(x)
      const len = cd.readUInt16LE(x + 2)
      if (id === 0x0001) {
        let q = x + 4
        if (size === 0xffffffff) { size = Number(cd.readBigUInt64LE(q)); q += 8 }
        if (compSize === 0xffffffff) { compSize = Number(cd.readBigUInt64LE(q)); q += 8 }
        if (offset === 0xffffffff) { offset = Number(cd.readBigUInt64LE(q)) }
      }
      x += 4 + len
    }
    entries.set(name, { name, method: cd.readUInt16LE(p + 10), compSize, size, offset })
    p = extraEnd + commentLen
  }
  return entries
}

export async function openRemoteZip(url: string = BULK_SESSION_ZIP): Promise<RemoteZip> {
  const head = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': USER_AGENT } })
  if (!head.ok) throw new Error(`${url}: HEAD answered ${head.status}`)
  const size = Number(head.headers.get('content-length'))
  if (!Number.isFinite(size) || size <= 0) throw new Error(`${url}: no Content-Length`)
  const tailLen = Math.min(size, 65_535 + 22 + 20 + 56)
  const tail = await rangeRead(url, size - tailLen, size - 1)
  const cd = findCentralDirectory(tail, size - tailLen)
  const entries = parseCentralDirectory(await rangeRead(url, cd.offset, cd.offset + cd.size - 1))
  return { url, size, lastModified: head.headers.get('last-modified') ?? '', entries }
}

export async function readZipEntry(zip: RemoteZip, name: string): Promise<Buffer> {
  const e = zip.entries.get(name)
  if (!e) throw new Error(`${name} is not in ${zip.url}`)
  // The local header's name and extra lengths can differ from the central copy;
  // read generously past it and use the local values.
  const chunk = await rangeRead(zip.url, e.offset, Math.min(zip.size - 1, e.offset + 30 + 2048 + e.compSize))
  if (chunk.readUInt32LE(0) !== 0x04034b50) throw new Error(`${name}: bad local header`)
  const start = 30 + chunk.readUInt16LE(26) + chunk.readUInt16LE(28)
  const data = chunk.subarray(start, start + e.compSize)
  if (e.method === 0) return data
  if (e.method === 8) return inflateRawSync(data)
  throw new Error(`${name}: compression method ${e.method} is not handled`)
}

// ---------------------------------------------------------------- tables

/** One row of a pubinfo .dat file: tab-separated, strings in backticks, NULL bare. */
export function parseDatRow(line: string): (string | null)[] {
  return line.split('\t').map(v => (v === 'NULL' ? null : v.replace(/^`|`$/g, '')))
}

export type LawSectionRow = {
  key: string
  law: string
  section: string
  statuteYear: string | null
  chapter: string | null
  effective: string | null
  history: string
  lob: string
  active: boolean
}

export function parseLawSectionRow(line: string): LawSectionRow | null {
  const f = parseDatRow(line.replace(/\r$/, ''))
  if (f.length < 16 || !f[1] || !f[2] || !f[14]) return null
  const section = f[2].replace(/\.$/, '')
  return {
    key: `${f[1]} ${section}`,
    law: f[1],
    section,
    statuteYear: f[3],
    chapter: f[4],
    effective: f[6] ? f[6].slice(0, 10) : null,
    history: f[13] ?? '',
    lob: f[14],
    active: f[15] === 'Y',
  }
}

/** "CCP 1005", "CCP-1005", "ccp1005", "Gov. code 6700"-style law codes are not guessed. */
export function normalizeSectionKey(raw: string): string | null {
  const m = raw.trim().match(/^([A-Za-z]+)[\s\-:]*(\d+(?:\.\d+)*[a-z]?)$/)
  return m ? `${m[1].toUpperCase()} ${m[2]}` : null
}

// ---------------------------------------------------------------- text

const collapse = (s: string) => s.replace(/[ \t\r\n]+/g, ' ').replace(/^ | $/g, '')

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, e: string) => {
    const lower = e.toLowerCase()
    if (lower.startsWith('#x')) return String.fromCodePoint(parseInt(lower.slice(2), 16))
    if (lower.startsWith('#')) return String.fromCodePoint(parseInt(lower.slice(1), 10))
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[lower] ?? ''
  })
}

/**
 * The section's text the way statutes.json holds it (test/statutesPulled.test.ts):
 * paragraphs joined by a newline, a run of spaces, tabs or line breaks inside a
 * paragraph read as one space, no-break spaces and curly quotes kept. The
 * EnSpace a browser renders after "(a)" is a no-break space there, and is one here.
 */
export function lobToText(xml: string): string {
  const paragraphs: string[] = []
  for (const m of xml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const inner = m[1]
      .replace(/<span class="EnSpace"\s*\/>/g, ' ')
      .replace(/<span class="EnSpace">\s*<\/span>/g, ' ')
      // LAB 515's "1/40th": the browser read showed " 1 / 40 th", and the store holds that.
      .replace(/<caml:Fraction>\s*<caml:Numerator>([\s\S]*?)<\/caml:Numerator>\s*<caml:Denominator>([\s\S]*?)<\/caml:Denominator>\s*<\/caml:Fraction>/g, ' $1 / $2 ')
      .replace(/<[^>]+>/g, '')
    const text = collapse(decodeEntities(inner))
    if (text) paragraphs.push(text)
  }
  return paragraphs.join('\n')
}

/** Text plus its history line, as the 2026-10-06 pull filed it. */
export function filedText(body: string, history: string): string {
  const h = collapse(history)
  return h ? `${body}\n(${h})` : body
}

export const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

// ---------------------------------------------------------------- bills

export type BillRow = { billId: string; label: string; chapterYear: string | null; chapter: string | null; versionId: string | null }

export function parseBillRow(line: string): BillRow | null {
  const f = parseDatRow(line.replace(/\r$/, ''))
  if (f.length < 11 || !f[0] || !f[3] || !f[4]) return null
  return { billId: f[0], label: `${f[3]} ${f[4]}`, chapterYear: f[6], chapter: f[9], versionId: f[10] }
}

/** BILL_VERSION_TBL: version id → its .lob, and whether it is an urgency statute. */
export function parseBillVersionRow(line: string): { versionId: string; lob: string; urgency: boolean } | null {
  const f = parseDatRow(line.replace(/\r$/, ''))
  const lob = f.find(v => v?.endsWith('.lob'))
  if (!f[0] || !lob) return null
  return { versionId: f[0], lob, urgency: f[12] === 'Yes' }
}

/**
 * The code sections a bill's text says it changes: "Section 6700 of the
 * Government Code is amended to read:", "Sections 1013 and 1010.6 of the Code
 * of Civil Procedure are amended", "... is added to ...", "... is repealed."
 * codeNames maps "Government Code" → "GOV" (from CODES_TBL).
 */
export function sectionsChangedByBill(billText: string, codeNames: Map<string, string>): Map<string, string> {
  const changed = new Map<string, string>()
  const text = collapse(billText.replace(/<[^>]+>/g, ' '))
  // The code's name exactly as CODES_TBL spells it: "Code of Civil Procedure"
  // does not end in "Code", so no general pattern catches every name.
  const names = [...codeNames.keys()].sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(
    String.raw`\bSections? ((?:\d+(?:\.\d+)*[a-z]?)(?:(?:,| and|, and) (?:\d+(?:\.\d+)*[a-z]?))*) of (?:the )?(${names.join('|')}),? (?:is|are) ((?:amended and renumbered|amended|added|repealed and added|repealed)[^.:]*)`,
    'g',
  )
  for (const m of text.matchAll(re)) {
    const law = codeNames.get(m[2])
    if (!law) continue
    for (const num of m[1].match(/\d+(?:\.\d+)*[a-z]?/g) ?? []) {
      const key = `${law} ${num}`
      if (!changed.has(key)) changed.set(key, m[3].trim())
    }
  }
  return changed
}

/** CODES_TBL rows ("`GOV`\t`Government Code - GOV`") → "Government Code" → "GOV". */
export function parseCodeNames(dat: string): Map<string, string> {
  const names = new Map<string, string>()
  for (const line of dat.split('\n')) {
    const [code, title] = parseDatRow(line.replace(/\r$/, ''))
    if (!code || !title) continue
    names.set(title.replace(/^\*\s*/, '').replace(/\s+-\s+[A-Z]+$/, '').trim(), code)
  }
  return names
}

// ---------------------------------------------------------------- the pull

export type PulledSection = {
  key: string
  text: string
  sha256: string
  history: string
  effective: string | null
  statute: string | null
  lob: string
}

export type PendingChange = { key: string; bill: string; statute: string; change: string; urgency: boolean }

export type Pull = {
  source: { url: string; lastModified: string }
  fetchedOn: string
  sections: PulledSection[]
  /** Asked for, but no row in force carries it. */
  notInForce: string[]
  /** More than one row in force: a section with a future operative version. A person picks. */
  ambiguous: Record<string, PulledSection[]>
  /** Chaptered bills changing an asked-for section that the code tables do not yet show. */
  pending: PendingChange[]
}

async function inBatches<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))))
  return out
}

export async function pullSections(
  keys: string[],
  options: { pending?: boolean; zip?: RemoteZip; log?: (line: string) => void } = {},
): Promise<Pull> {
  const log = options.log ?? (() => {})
  const zip = options.zip ?? (await openRemoteZip())
  const wanted = new Set(keys)
  log(`reading LAW_SECTION_TBL from ${zip.url} (Last-Modified ${zip.lastModified})`)
  const rows = (await readZipEntry(zip, 'LAW_SECTION_TBL.dat')).toString('utf8').split('\n')

  const byKey = new Map<string, LawSectionRow[]>()
  const codified = new Set<string>() // "2026 7": statute year and chapter already in the code
  for (const line of rows) {
    const row = parseLawSectionRow(line)
    if (!row || !row.active) continue
    if (row.statuteYear && row.chapter) codified.add(`${row.statuteYear} ${row.chapter}`)
    if (!wanted.has(row.key)) continue
    byKey.set(row.key, [...(byKey.get(row.key) ?? []), row])
  }

  const toRead = [...byKey.values()].flat()
  log(`reading ${toRead.length} section texts`)
  const read = await inBatches(toRead, 8, async row => {
    const body = lobToText((await readZipEntry(zip, row.lob)).toString('utf8'))
    const text = filedText(body, row.history)
    const statute = row.statuteYear && row.chapter ? `Stats. ${row.statuteYear}, ch. ${row.chapter}` : null
    return { key: row.key, text, sha256: sha256(text), history: collapse(row.history), effective: row.effective, statute, lob: row.lob }
  })

  const sections: PulledSection[] = []
  const ambiguous: Record<string, PulledSection[]> = {}
  for (const key of keys) {
    const versions = read.filter(s => s.key === key)
    if (versions.length === 1) sections.push(versions[0])
    else if (versions.length > 1) ambiguous[key] = versions
  }
  const notInForce = keys.filter(k => !byKey.has(k))

  let pending: PendingChange[] = []
  if (options.pending !== false) pending = await pendingChanges(zip, wanted, codified, log)

  return {
    source: { url: zip.url, lastModified: zip.lastModified },
    fetchedOn: new Date().toISOString().slice(0, 10),
    sections,
    notInForce,
    ambiguous,
    pending,
  }
}

async function pendingChanges(zip: RemoteZip, wanted: Set<string>, codified: Set<string>, log: (l: string) => void): Promise<PendingChange[]> {
  const codeNames = parseCodeNames((await readZipEntry(zip, 'CODES_TBL.dat')).toString('utf8'))
  const bills = (await readZipEntry(zip, 'BILL_TBL.dat'))
    .toString('utf8')
    .split('\n')
    .map(parseBillRow)
    .filter((b): b is BillRow => !!b && !!b.chapter && !!b.chapterYear && !!b.versionId?.endsWith('CHP'))
    // A chapter whose statute appears on any section in force is already in the code.
    .filter(b => !codified.has(`${b.chapterYear} ${b.chapter}`))
  const versions = new Map<string, { lob: string; urgency: boolean }>()
  for (const line of (await readZipEntry(zip, 'BILL_VERSION_TBL.dat')).toString('utf8').split('\n')) {
    const v = parseBillVersionRow(line)
    if (v) versions.set(v.versionId, v)
  }
  log(`reading ${bills.length} chaptered bills not yet in the code tables`)
  const found = await inBatches(bills, 8, async bill => {
    const version = versions.get(bill.versionId!)
    if (!version) return []
    const changed = sectionsChangedByBill((await readZipEntry(zip, version.lob)).toString('utf8'), codeNames)
    return [...changed]
      .filter(([key]) => wanted.has(key))
      .map(([key, change]) => ({ key, bill: bill.label, statute: `Stats. ${bill.chapterYear}, ch. ${bill.chapter}`, change, urgency: version.urgency }))
  })
  return found.flat()
}
