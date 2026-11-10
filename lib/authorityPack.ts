/**
 * A case's Authority Pack: for each claim its reading raises, the provisions it
 * is read out of, the instruction, the holdings bearing on it, and what the pack
 * cannot settle — with the day each text was fetched and when the pack is due
 * to be checked again.
 *
 * Nothing here is new authority. Every provision and holding comes from what
 * the office already holds in full (lib/authority), resolved by the same reader
 * Eleanor uses (readAuthority), and every holding's quote is checked against its
 * opinion here as in the build (isVerbatim). The pack only gathers, per case,
 * what applies and says plainly what does not exist yet: contrary authority,
 * historical versions of a statute, a citator check, paid annotations.
 *
 * Pure: give it a stored reading and a day. No database, no model.
 */

import { readAuthority } from '@/lib/authority/lookup'
import { HOLDINGS, caseRecord, citeCase, isVerbatim } from '@/lib/authority/cases'
import { ALL_CLAIMS, claimById } from '@/lib/authority/claims'
import { orderNumber } from '@/lib/wageOrderNumber'
import type { StoredReading } from '@/lib/caseReadingShape'
import { quoteIsIn } from '@/lib/authority/fetchedOpinions'
import type { HoldingWithOpinion } from '@/lib/authority/fetchedOpinionStore'
import {
  ANNOTATIONS_STATUS,
  CITATOR_STATUS,
  REVERIFY_BEFORE,
  REVERIFY_DAYS,
  type AuthorityPack,
  type PackClaim,
  type PackHolding,
  type PackProvision,
} from '@/lib/authorityPackShape'

const NOT_RAISED = 'not raised by these facts'

/** The claims a stored reading raises, with their standing, in the order the reading holds them. */
export function claimsRaised(reading: StoredReading): { claimId: string; standing: string }[] {
  const findings = [...(reading.claims1 ?? []), ...(reading.claims2 ?? []), ...(reading.claims3 ?? [])] as {
    claimId?: unknown
    standing?: unknown
  }[]
  const seen = new Set<string>()
  const out: { claimId: string; standing: string }[] = []
  for (const f of findings) {
    const claimId = typeof f?.claimId === 'string' ? f.claimId : ''
    const standing = typeof f?.standing === 'string' ? f.standing : ''
    if (!claimId || !claimById(claimId) || standing === NOT_RAISED || seen.has(claimId)) continue
    seen.add(claimId)
    out.push({ claimId, standing })
  }
  return out
}

/** The Order the reading was settled under; an unconfirmed proposal is not one. */
function settledOrder(reading: StoredReading): AuthorityPack['wageOrder'] {
  const choice = reading.wageOrder as { confirmed?: boolean; proposal?: { order?: unknown } } | undefined
  const order = orderNumber(choice?.proposal?.order)
  if (choice?.confirmed && order) {
    return { order, settled: true, note: `IWC Wage Order ${order}, settled by an attorney.` }
  }
  return {
    order: null,
    settled: false,
    note: order
      ? `Wage Order ${order} is proposed, not settled. Its duties are left out until an attorney settles the Order.`
      : 'No Wage Order is settled. Its duties are left out until an attorney settles one.',
  }
}

function provision(key: string): PackProvision {
  const [found] = readAuthority([key])
  return {
    key,
    cite: found?.cite ?? key,
    onFile: Boolean(found?.onFile),
    fetched: found?.onFile && found.fetched ? found.fetched : null,
    note: found?.onFile ? null : (found?.note ?? 'NOT ON FILE.'),
  }
}

const addDays = (day: string, days: number) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function buildAuthorityPack(
  reading: StoredReading,
  today: string,
  /** Claim ids to include beyond what the reading raises (a claim pleaded before it is read). */
  alsoClaims: string[] = [],
  /** Holdings Eleanor fetched and an attorney approved (lib/authority/fetchedOpinionStore.ts). */
  approved: HoldingWithOpinion[] = []
): AuthorityPack {
  const wageOrder = settledOrder(reading)
  const raised = claimsRaised(reading)
  const wanted = [
    ...raised,
    ...alsoClaims.filter(id => claimById(id) && !raised.some(r => r.claimId === id)).map(id => ({ claimId: id, standing: null })),
  ]

  const claims: PackClaim[] = wanted.map(({ claimId, standing }) => {
    const claim = claimById(claimId)!
    const gaps: string[] = []
    const keys: string[] = []
    // A Wage Order key carries {order}: resolved from the settled Order, or left out and said.
    const add = (key: string, what: string) => {
      if (key.includes('{order}')) {
        if (!wageOrder.order) {
          gaps.push(`${what}: read out of a Wage Order — ${wageOrder.note}`)
          return
        }
        key = key.replace('{order}', wageOrder.order)
      }
      if (!keys.includes(key)) keys.push(key)
    }
    for (const key of claim.sections) add(key, key.replace('IWC {order}', 'Wage Order'))
    for (const element of claim.elements) {
      add(element.from, element.key)
      if (element.needsAuthority) gaps.push(`${element.key}: ${element.needsAuthority}`)
    }
    const provisions = keys.map(provision)
    for (const p of provisions) if (!p.onFile) gaps.push(`${p.cite}: not on file — do not state what it says.`)

    const holdings: PackHolding[] = HOLDINGS.filter(h => h.bearsOn.some(b => b.startsWith(`${claimId}:`))).map(h => {
      const record = caseRecord(h.case)
      return {
        id: h.id,
        cite: citeCase(h.case),
        proposition: h.proposition,
        pinpoint: h.pinpoint,
        opinionPart: h.opinionPart,
        limits: h.limits,
        verbatim: isVerbatim(h),
        fetched: record ? { on: record.fetchedOn, from: record.source } : null,
        bearsOn: h.bearsOn.filter(b => b.startsWith(`${claimId}:`)).map(b => b.slice(claimId.length + 1)),
        kind: 'court opinion' as const,
        origin: 'Held in the repository; quote checked in the build.',
        sourceUrl: null,
      }
    })
    // Approved holdings from opinions Eleanor fetched; the quote is checked again against the stored text here.
    const fetched: { holding: PackHolding; adverse: boolean }[] = approved
      .filter(a => a.bearsOn.some(b => b.startsWith(`${claimId}:`)))
      .map(a => ({
        adverse: a.adverse,
        holding: {
          id: a.id,
          cite: `${a.opinion.name} ${a.opinion.citation}`,
          proposition: a.proposition,
          pinpoint: a.pinpoint,
          opinionPart: a.opinionPart,
          limits: a.limits,
          verbatim: quoteIsIn(a.opinion.text, a.quote),
          fetched: { on: a.opinion.fetchedOn, from: a.opinion.sourceUrl },
          bearsOn: a.bearsOn.filter(b => b.startsWith(`${claimId}:`)).map(b => b.slice(claimId.length + 1)),
          kind: a.opinion.kind,
          origin: `Fetched by Eleanor from the issuing body; approved by ${a.decidedBy ?? 'an attorney'}.`,
          sourceUrl: a.opinion.sourceUrl,
        },
      }))
    holdings.push(...fetched.filter(f => !f.adverse).map(f => f.holding))
    const adverseHeld = fetched.filter(f => f.adverse).map(f => f.holding)
    for (const h of [...holdings, ...adverseHeld]) {
      if (h.kind === 'agency precedent') gaps.push(`${h.cite}: a DLSE precedential decision — an agency's precedent, not a court's decision.`)
    }
    for (const h of [...holdings, ...adverseHeld]) if (!h.verbatim) gaps.push(`${h.cite}: its quotation is not in the opinion held — do not rely on it.`)
    if (!holdings.length) gaps.push('No holding on file bears on this claim.')

    return {
      claimId,
      name: claim.name,
      standing,
      provisions,
      caci: claim.caci ? provision(claim.caci) : null,
      holdings,
      adverse: {
        note: adverseHeld.length
          ? 'Contrary authority held below. Search for more before relying on the pack.'
          : 'No contrary authority is held for this claim. Search for it before relying on the pack.',
        holdings: adverseHeld,
      },
      gaps,
    }
  })

  const days = claims
    .flatMap(c => [...c.provisions, ...(c.caci ? [c.caci] : [])].map(p => p.fetched?.on).concat(c.holdings.map(h => h.fetched?.on)))
    .filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
  const asOf = days[0] ?? null
  const reverifyBy = asOf ? addDays(asOf, REVERIFY_DAYS) : null

  return {
    builtOn: today,
    wageOrder,
    claims,
    verification: {
      asOf,
      reverifyBy,
      due: reverifyBy !== null && today > reverifyBy,
      reverifyBefore: REVERIFY_BEFORE,
      citator: CITATOR_STATUS,
      annotations: ANNOTATIONS_STATUS,
      versions:
        'Each provision is the current text as fetched. A claim period reaching back past an amendment needs the version then in force, which is not held.',
    },
  }
}

/** Every claim the library knows, for a pack asked for before any reading. */
export const PACK_CLAIM_IDS = ALL_CLAIMS.map(c => c.id)
