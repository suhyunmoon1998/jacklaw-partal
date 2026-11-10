/**
 * A case's Authority Pack, as a screen or Eleanor shows it. Shape only: the
 * builder (lib/authorityPack.ts) imports the statutes and opinions held in full,
 * which no browser bundle should carry.
 */

/** Said on every pack until a citator check is actually performed. Nothing here runs one. */
export const CITATOR_STATUS = "Final KeyCite/Shepard's verification required." as const

/** Paid annotations this system cannot open. Said, not implied. */
export const ANNOTATIONS_STATUS =
  "Deering's Notes to Decisions and West's Notes of Decisions were not checked: no subscription access in this system." as const

/** When the office re-verifies a pack, besides the quarter: before each of these is filed or served. */
export const REVERIFY_BEFORE = ['complaint', 'major motion', 'mediation brief', 'trial brief'] as const
export type ReverifyBefore = (typeof REVERIFY_BEFORE)[number]

/** A quarter, in days: the pack is due again this long after the oldest text in it was fetched. */
export const REVERIFY_DAYS = 90

export interface PackProvision {
  /** 'LAB 226.2', 'IWC 9 sec 12', 'CACI 2702'. */
  key: string
  cite: string
  onFile: boolean
  /** When and where the text held was fetched. */
  fetched: { on: string; from: string } | null
  /** Why it is missing, or what to settle first. */
  note: string | null
}

export interface PackHolding {
  id: string
  cite: string
  proposition: string
  pinpoint: string
  opinionPart: 'majority' | 'concurrence' | 'dissent'
  limits: string
  /** The quote was found, character for character, in the opinion held in full. */
  verbatim: boolean
  /** The opinion's own source and the day it was fetched. */
  fetched: { on: string; from: string } | null
  /** The elements of this claim it bears on. */
  bearsOn: string[]
}

export interface PackClaim {
  claimId: string
  name: string
  /** As the case reading stands; null when the pack was asked for a claim the reading has not read. */
  standing: string | null
  provisions: PackProvision[]
  caci: PackProvision | null
  holdings: PackHolding[]
  /** Contrary authority. None is held yet, so this says so rather than staying silent. */
  adverse: { note: string }
  /** What the pack cannot settle: elements needing authority, provisions not on file, an Order not yet settled. */
  gaps: string[]
}

export interface AuthorityPack {
  /** The day the pack was built. */
  builtOn: string
  /** The Wage Order the claims are read under, when an attorney has settled it. */
  wageOrder: { order: string | null; settled: boolean; note: string }
  claims: PackClaim[]
  verification: {
    /** The oldest day any text in the pack was fetched: the pack is only as current as that. */
    asOf: string | null
    /** asOf plus a quarter. */
    reverifyBy: string | null
    due: boolean
    reverifyBefore: readonly ReverifyBefore[]
    citator: typeof CITATOR_STATUS
    annotations: typeof ANNOTATIONS_STATUS
    /**
     * The text held is the current version as fetched. A claim period that
     * reaches back past an amendment needs the version then in force, which
     * is not held.
     */
    versions: string
  }
}
