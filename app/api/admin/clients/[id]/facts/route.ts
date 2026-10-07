import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { toEnglishCached } from '@/lib/translationCache'
import { getSupabase } from '@/lib/supabase'
import { extractFacts } from '@/lib/factExtraction'
import { addArrivedAnswers } from '@/lib/factAdditionsRun'
import { gatherExtractionInput as gather } from '@/lib/factInput'
import { unreadRows } from '@/lib/factAdditions'
import {
  addFacts,
  clearContradictions,
  clearLedger,
  readContradictions,
  readLedger,
  saveContradictions,
} from '@/lib/factStore'
import { standing, unsettled } from '@/lib/factLedger'
import { clearReading } from '@/lib/caseReadingStore'
import { Meter, describeSpend } from '@/lib/spend'
import { keepSearch, lastSearch } from '@/lib/sourceSearchStore'
import { snapshotNow } from '@/lib/briefVersions'

/**
 * Turning one client's answers into the fact ledger everything else stands on.
 *
 * This is the bottom of the stack and it was the one rung with no button. The
 * matrix, the spine, the Wage Order and the follow-up questions were all
 * reachable from the admin; the step that creates the facts they read was run
 * once, from a script, for one client. Every other client opened to "no facts
 * on file, so there is nothing to read".
 *
 * A reading of a hundred and eighty answers, section by section and five at a
 * time, plus a pass over the whole file to find where the answers disagree.
 */
export const maxDuration = 300


/**
 * Each fact's verbatim in English, or '' where it already is.
 *
 * Empty rather than a copy, so a reader can tell a translation from an
 * original at a glance and nothing in the document claims to be her words
 * when it is not. From the cache: this ran every verbatim through the free
 * endpoint on every load, two hundred calls for one Korean file.
 */
const withEnglish = (entries: { verbatim: string }[], language: string | null) =>
  toEnglishCached(entries.map(e => e.verbatim ?? ''), language)

/**
 * The language the client reads the portal in, when it is one whose writing
 * cannot be told from English by its script — Spanish, typed without accents.
 * Null on any failure: the quotations are still read for their own language.
 */
async function portalLanguage(clientId: string): Promise<string | null> {
  const { data } = await getSupabase().from('clients').select('portal_lang').eq('id', clientId).maybeSingle()
  return typeof data?.portal_lang === 'string' ? data.portal_lang : null
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [entries, contradictions, searched, input, language] = await Promise.all([
      readLedger(params.id),
      readContradictions(params.id),
      lastSearch(params.id),
      // Only to count answers the ledger has not read. A failure here costs
      // the count, not the ledger.
      gather(params.id).catch(() => null),
      portalLanguage(params.id).catch(() => null),
    ])
    return NextResponse.json({
      facts: standing(entries).length,
      /** Answered question-set rows no fact came from — follow-up answers waiting to be added. */
      unread: entries.length && input ? unreadRows(entries, input.extra).reduce((n, s) => n + s.rows.length, 0) : 0,
      total: entries.length,
      unsettled: unsettled(entries).length,
      contradictions,
      /** What the extraction behind these facts searched. Null for a ledger read before this was kept. */
      searched,
      /**
       * Bare ids, so the release test can tell a fact this client actually has
       * from one nothing in the ledger carries.
       */
      ids: entries.map(e => e.id),
      /**
       * Enough of each fact to compare two readings: the id, the status, the
       * client's own words, and where they came from. Not the whole entry —
       * a change is shown in her words, and the rest is the ledger's own
       * screen to display.
       */
      /**
       * The whole fact, not a slice of it.
       *
       * This carried nine fields and the factual brief reads fifteen, so the
       * corroboration on 60 facts, the contrary fact on 20, the damages tag
       * on 68 and the open loop on 163 all arrived empty — and the brief drew
       * the sections that depend on them as though the record had none.
       */
      snapshot: await withEnglish(entries, language).then(english =>
        entries.map((e, i) => ({
          id: e.id,
          proposition: e.proposition,
          verbatim: e.verbatim,
          // Her own words are evidence and are never replaced. An English
          // rendering rides alongside, because the office reads case files in
          // English and half of this client's answers are in Korean.
          verbatimEnglish: english[i],
          status: e.status,
          provenance: e.provenance,
          period: e.period,
          actors: e.actors,
          location: e.location,
          corroboration: e.corroboration,
          contrary: e.contrary,
          legalTags: e.legalTags,
          damagesTags: e.damagesTags,
          openLoop: e.openLoop,
          supersededBy: e.supersededBy,
          supersededWhy: e.supersededWhy,
        }))
      ),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await readLedger(params.id)
  const body = await req.json().catch(() => ({}))
  if (body?.add === true) return addAnswers(params.id)
  // Reading again over a ledger that already holds facts would insert a second
  // copy of every one of them — addFacts is deliberately not an upsert, so it
  // would fail, but only after the reading had been paid for. Refuse first.
  if (existing.length && body?.replace !== true) {
    return NextResponse.json(
      {
        error: `This client already has ${existing.length} facts on file. Reading again replaces them, and any correction recorded against them goes with them.`,
        facts: existing.length,
      },
      { status: 409 }
    )
  }

  const input = await gather(params.id)
  if (!input) return NextResponse.json({ error: 'No such client.' }, { status: 404 })
  if (!Object.keys(input.answers).length) {
    return NextResponse.json(
      { error: 'This client has not answered anything yet, so there is nothing to read.' },
      { status: 409 }
    )
  }

  let read
  const began = Date.now()
  const meter = new Meter()
  try {
    read = await extractFacts({ ...input, meter })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
  if (!read.entries.length) {
    return NextResponse.json(
      { error: 'The reading produced no facts. Nothing was changed.', answered: read.answered },
      { status: 502 }
    )
  }

  try {
    if (existing.length) {
      // The brief read from these facts is about to become unreadable — its
      // findings cite ids that are going. Kept first, so the next brief can say
      // what the re-read changed.
      await snapshotNow(params.id, 'before the facts were read again')
      await clearLedger(params.id)
      await clearContradictions(params.id)
      // The matrix and the spine were read against facts that no longer exist.
      // Keeping them would leave findings citing ids nothing can resolve.
      await clearReading(params.id)
    }
    await addFacts(params.id, read.entries)
    await saveContradictions(params.id, read.contradictions)
    // After the facts, so the newest search on file always belongs to the
    // ledger on file. A run that failed above searched nothing that stands.
    await keepSearch(params.id, input.searched)
  } catch (err) {
    // The reading ran and could not be stored, which has cost this project a
    // whole reading before. It fails loudly rather than reporting success.
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }

  return NextResponse.json({
    facts: read.entries.length,
    answered: read.answered,
    contradictions: read.contradictions,
    replaced: existing.length,
    searched: input.searched,
    seconds: Math.round((Date.now() - began) / 1000),
    spent: meter.spent,
    spentSaid: describeSpend(meter.spent),
  })
}

/**
 * Adds answers that arrived after the ledger was read — a follow-up round's,
 * usually — without renumbering or replacing anything already on file. The
 * work is lib/factAdditionsRun.ts, shared with the nightly run.
 *
 * The facts they correct are marked superseded, not removed. The claims
 * reading is left in place and goes stale on its own, because its fingerprint
 * is the standing ledger's. The panel then says to read it again, and the
 * brief it produced stays comparable.
 */
async function addAnswers(clientId: string) {
  const began = Date.now()
  const meter = new Meter()
  const result = await addArrivedAnswers(clientId, meter)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.answered !== undefined ? { answered: result.answered } : {}) },
      { status: result.status }
    )
  }
  return NextResponse.json({
    added: result.added,
    answered: result.answered,
    superseded: result.superseded,
    setAside: result.setAside,
    contradictions: result.contradictions,
    searched: result.searched,
    seconds: Math.round((Date.now() - began) / 1000),
    spent: meter.spent,
    spentSaid: describeSpend(meter.spent),
  })
}

/** Throws the ledger away. Everything read from it goes too. */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await snapshotNow(params.id, 'before the facts were cleared')
    await clearLedger(params.id)
    await clearContradictions(params.id)
    await clearReading(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
