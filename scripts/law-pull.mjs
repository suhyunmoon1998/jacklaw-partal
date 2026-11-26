#!/usr/bin/env node
/**
 * Pull California code sections from the Legislature's official bulk data
 * (lib/authority/officialBulk.ts says why that route, and not the section pages).
 *
 *   node scripts/law-pull.mjs "CCP 1005" "GOV 6700"      the sections, as JSON on stdout
 *   node scripts/law-pull.mjs --check                     every statute on file, compared
 *   add --no-pending to skip the chaptered-bill scan (a few hundred range reads)
 *
 * It only reads and reports. It never writes lib/authority/statutes.json: a
 * section whose official text moved is a reviewed update, made by hand.
 * --check exits 1 when a section on file no longer reads as the official text.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizeSectionKey,
  openRemoteZip,
  parseCodeNames,
  pullSections,
  readZipEntry,
} from '../lib/authority/officialBulk.ts'

const args = process.argv.slice(2)
const check = args.includes('--check')
const pending = !args.includes('--no-pending')
const log = line => process.stderr.write(`${line}\n`)

if (!check) {
  const keys = args.filter(a => !a.startsWith('--')).map(a => {
    const key = normalizeSectionKey(a)
    if (!key) throw new Error(`not a section key: ${a} (write it like "CCP 1005")`)
    return key
  })
  if (keys.length === 0) {
    log('usage: node scripts/law-pull.mjs "CCP 1005" ["GOV 6700" ...] [--no-pending] | --check')
    process.exit(2)
  }
  const zip = await openRemoteZip()
  console.log(JSON.stringify(await pullSections(keys, { zip, pending, log }), null, 2))
} else {
  await runCheck(await openRemoteZip())
}

async function runCheck(zip) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const held = JSON.parse(readFileSync(join(root, 'lib/authority/statutes.json'), 'utf8')).sections
  const codes = new Set(parseCodeNames((await readZipEntry(zip, 'CODES_TBL.dat')).toString('utf8')).values())
  const keys = Object.keys(held).filter(k => codes.has(k.split(' ')[0]))
  const skipped = Object.keys(held).filter(k => !codes.has(k.split(' ')[0]))
  const pull = await pullSections(keys, { zip, pending, log })

  // A held text is body, then its history line "(Amended by Stats. ...)", and in
  // some older pulls page furniture after that ("ARTICLE 3. Special Occupations
  // [270 - 273]", "LAB Labor Code - LAB", or the next section whole). The body
  // is what a reader quotes.
  const parts = text => {
    const m = text.match(/\n ?\((?:Added|Amended|Repealed|Enacted|Renumbered)\b/)
    if (!m) return { body: text, history: '', trailing: '' }
    let depth = 0
    let end = m.index + m[0].indexOf('(')
    for (; end < text.length; end++) {
      if (text[end] === '(') depth++
      else if (text[end] === ')' && --depth === 0) break
    }
    return { body: text.slice(0, m.index), history: text.slice(m.index, end + 1).trim(), trailing: text.slice(end + 1).trim() }
  }
  const words = s => s.replace(/[\s ]+/g, ' ').trim()
  const firstDifference = (a, b) => {
    let i = 0
    while (i < a.length && a[i] === b[i]) i++
    return { held: JSON.stringify(a.slice(Math.max(0, i - 40), i + 80)), official: JSON.stringify(b.slice(Math.max(0, i - 40), i + 80)) }
  }

  const report = { exact: [], sameWords: [], staleHistory: [], trailing: [], changed: [], notInForce: pull.notInForce, ambiguous: Object.keys(pull.ambiguous), skipped }
  for (const s of pull.sections) {
    const mine = parts(held[s.key])
    const theirs = parts(s.text)
    if (mine.trailing) report.trailing.push({ key: s.key, trailing: mine.trailing.slice(0, 120) })
    if (held[s.key] === s.text) report.exact.push(s.key)
    else if (words(mine.body) !== words(theirs.body)) {
      report.changed.push({ key: s.key, inForce: s.statute, heldHistory: mine.history, officialHistory: theirs.history, ...firstDifference(words(mine.body), words(theirs.body)) })
    } else if (words(mine.history) && words(mine.history) !== words(theirs.history)) {
      report.staleHistory.push({ key: s.key, held: mine.history, official: theirs.history })
    } else report.sameWords.push(s.key)
  }

  console.log(JSON.stringify({
    source: pull.source,
    fetchedOn: pull.fetchedOn,
    counts: {
      onFile: Object.keys(held).length,
      compared: pull.sections.length,
      exact: report.exact.length,
      sameWords: report.sameWords.length,
      staleHistory: report.staleHistory.length,
      trailing: report.trailing.length,
      changed: report.changed.length,
      notInForce: report.notInForce.length,
      ambiguous: report.ambiguous.length,
      skipped: skipped.length,
      pending: pull.pending.length,
    },
    changed: report.changed,
    staleHistory: report.staleHistory,
    trailing: report.trailing,
    notInForce: report.notInForce,
    ambiguous: pull.ambiguous,
    pending: pull.pending,
    sameWords: report.sameWords,
    skipped,
  }, null, 2))
  // exitCode, not exit(): exit() can cut a piped stdout off at 64 KB.
  process.exitCode = report.changed.length > 0 || report.notInForce.length > 0 ? 1 : 0
}
