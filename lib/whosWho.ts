/**
 * The workplace, reconstructed from the facts — people as evidence objects.
 *
 * The corpus asks for this in three places at once: people are extracted when
 * a new answer arrives (sec. 13.2), the map is updated with the chronology and
 * the claim matrix (sec. 13.5), and people changes are part of what a
 * submission returns (sec. 17.D). None of it existed. On Dayeon Kim's file the
 * manager who ordered the tip work and the servers who later rotated it — a
 * decision-maker and a room of similarly-situated employees — had nowhere to
 * live, and a case is not developed from facts alone.
 *
 * ASSEMBLED, NOT GENERATED. Every fact in the ledger already carries its
 * actors, and on a real file all 204 of them do. So this groups what is there
 * rather than asking a model who the witnesses were. It cannot invent a person
 * the record does not mention.
 *
 * IT DOES NOT MERGE PEOPLE. "boss", "manager" and "unnamed manager or lead"
 * may be one person or three, and the corpus is explicit that partial names,
 * nicknames and descriptions are kept as they are. Folding them together would
 * manufacture a single witness out of three descriptions and put a name on a
 * deposition notice that nobody ever gave. Only spellings of the same string
 * are folded — DAYEON KIM into Dayeon Kim — and possible identity is left as a
 * question for the office.
 */

/** Whose side this person is likely on. A guess, and labelled as one. */
export type Alignment = 'client' | 'company' | 'coworker' | 'unknown'

/** One person, a class of people, or the business itself. */
export type PersonKind = 'individual' | 'group' | 'entity'

export interface KnownFact {
  id: string
  proposition: string
  status: string
}

export interface Person {
  /** As the ledger wrote it. Never normalised into a guess at a real name. */
  name: string
  /** Other spellings of the same string, folded in. */
  aliases: string[]
  kind: PersonKind
  alignment: Alignment
  /** Named well enough that somebody could be found and served. */
  identified: boolean
  /** What they would know firsthand: the facts they appear in. */
  facts: KnownFact[]
  /** The claims and issues those facts are tagged to. */
  knowsAbout: string[]
  /** What the office does next about this person. */
  nextStep: string
  /** Higher first. Exposed so the ordering can be tested. */
  weight: number
}

/** A fact as this module needs it. */
export interface FactForPeople {
  id: string
  proposition: string
  status: string
  actors: string[]
  legalTags?: string[]
}

// Plurals matter: the ledger writes "bussers" and "servers", and a
// trailing \\b after the singular never matches them.
const COMPANY =
  /\b(owners?|managers?|supervisors?|boss(?:es)?|leads?|hr|human resources|employers?|compan(?:y|ies)|corp|inc\.?|llc)\b/i
const COWORKER =
  /\b(coworkers?|co-workers?|colleagues?|servers?|bussers?|bus ?boys?|kitchen|cooks?|hosts?|staff|another)\b/i
const GROUPISH = /\b(servers|bussers|coworkers|staff|employees|kitchen staff|others)\b/i
const ENTITY = /\b(inc\.?|llc|corp|company|employer|the business|the store)\b/i
/** Descriptions that are explicitly a person nobody has named. */
const UNNAMED = /\b(unnamed|not named|someone|a boss|a manager|a coworker|another|unknown|person who)\b/i

export function kindOf(name: string): PersonKind {
  if (GROUPISH.test(name)) return 'group'
  if (ENTITY.test(name)) return 'entity'
  return 'individual'
}

/** The client's names — she may appear under more than one. */
const namesOf = (clientName: string | string[]): string[] =>
  (Array.isArray(clientName) ? clientName : [clientName])
    .map(n => String(n ?? '').trim().toLowerCase())
    .filter(Boolean)

export function alignmentOf(name: string, clientName: string | string[]): Alignment {
  const n = name.trim().toLowerCase()
  if (namesOf(clientName).includes(n)) return 'client'
  if (COMPANY.test(name)) return 'company'
  if (COWORKER.test(name)) return 'coworker'
  return 'unknown'
}

/**
 * Whether this might be the client under another name.
 *
 * Dayeon Kim worked as "Dani Kim", and that string is in the ledger as an
 * actor like any other — so she arrived on her own witness map. A shared
 * surname is not proof they are the same person, and dropping the row would
 * hide a real witness who happens to be a relative. So it is kept, and the
 * next step says to check.
 */
export function maybeTheClient(name: string, clientName: string | string[]): boolean {
  // "manager Kim (김매니져)" shares only a surname, and the record calls them by
  // a role over her. The ledger writes the client by name or as "client",
  // never as somebody's manager or boss.
  if (COMPANY.test(name)) return false
  const parts = (s: string) => s.toLowerCase().split(/\s+/).filter(w => w.length > 1)
  const mine = new Set(namesOf(clientName).flatMap(parts))
  if (mine.size === 0) return false
  const theirs = parts(name)
  if (theirs.length === 0) return false
  return theirs.some(w => mine.has(w)) && !namesOf(clientName).includes(name.trim().toLowerCase())
}

/** A fact that says, in so many words, that the client went by another name. */
const OTHER_NAME = /\b(other name|another name|also known as|a\.?k\.?a\.?|goes by|went by|known at work as)\b/i

/**
 * Names the record itself says are hers.
 *
 * DAYEON KIM's f003 reads "The other name the client used at the job was Dani
 * Kim", with both names as its actors — and the brief, handed only her own
 * name, put Dani Kim on the witness map to be checked. That is the record's
 * statement of who she is, not a guess from a surname, so it is taken: the
 * fact has to say another name was hers, name the client among its actors,
 * and carry the other name in its own words.
 */
export function namesOnRecord(facts: FactForPeople[], clientName: string | string[]): string[] {
  const mine = namesOf(clientName)
  const found: string[] = []
  for (const f of facts) {
    if (!OTHER_NAME.test(f.proposition)) continue
    const actors = (f.actors ?? []).map(a => String(a ?? '').trim()).filter(Boolean)
    if (!actors.some(a => mine.includes(a.toLowerCase()))) continue
    for (const a of actors) {
      const n = a.toLowerCase()
      if (!mine.includes(n) && !found.includes(a) && f.proposition.toLowerCase().includes(n)) found.push(a)
    }
  }
  return found
}

/**
 * Whether this is a person who could be found.
 *
 * A proper name that is not a role word. "manager" is a role, "unnamed
 * manager or lead" says so itself, and neither can be served with anything.
 */
export function isIdentified(name: string): boolean {
  if (UNNAMED.test(name)) return false
  if (kindOf(name) !== 'individual') return false
  // A real name has a capitalised word that is not a role term.
  return name
    .split(/\s+/)
    .some(w => /^[A-Z][a-z']+$/.test(w) && !COMPANY.test(w) && !COWORKER.test(w))
}

/** What the office does about this person next. */
export function nextStepFor(p: Pick<Person, 'kind' | 'alignment' | 'identified'>): string {
  if (p.kind === 'group') {
    return 'Ask the client which of them had the same problem, and for names, nicknames or shifts.'
  }
  if (p.kind === 'entity') return 'Corporate records: registered agent, address and payroll custodian.'
  if (!p.identified) {
    return 'Ask the client for a name, nickname, shift or description — this person is not identified.'
  }
  if (p.alignment === 'company') return 'Likely a deposition; request their personnel and communication records.'
  if (p.alignment === 'coworker') return 'Witness interview before the employer reaches them.'
  return 'Ask the client who this is and what they saw.'
}

const ALIGNMENT_WEIGHT: Record<Alignment, number> = {
  company: 30,
  coworker: 22,
  unknown: 10,
  // The client is not a witness to her own case in this sense, and putting her
  // at the top of a witness map pushes everyone who matters off the page.
  client: -100,
}

/**
 * The map.
 *
 * Ranked by what the corpus ranks by: what the person actually knows — the
 * number of facts they appear in — then whose side they are on, with a person
 * who can actually be found ahead of a description that cannot.
 */
export function whosWho(
  facts: FactForPeople[],
  clientName: string | string[],
  limit = 25
): Person[] {
  const byKey = new Map<string, Person>()
  const given = Array.isArray(clientName) ? clientName : [clientName]
  clientName = [...given, ...namesOnRecord(facts, given)]

  for (const fact of facts) {
    for (const raw of fact.actors ?? []) {
      const name = String(raw ?? '').trim()
      if (!name) continue
      const key = name.toLowerCase()

      let person = byKey.get(key)
      if (!person) {
        const kind = kindOf(name)
        const alignment = alignmentOf(name, clientName)
        const identified = isIdentified(name)
        const couldBeHer = maybeTheClient(name, clientName)
        person = {
          name,
          aliases: [],
          kind,
          alignment,
          identified,
          facts: [],
          knowsAbout: [],
          nextStep: couldBeHer
            ? 'Shares a name with the client — confirm whether this is her under another name before treating them as a witness.'
            : nextStepFor({ kind, alignment, identified }),
          weight: 0,
        }
        byKey.set(key, person)
      }
      // The first spelling seen is the one shown; the rest are recorded so a
      // reader can see the record said both.
      if (person.name !== name && !person.aliases.includes(name)) person.aliases.push(name)
      if (!person.facts.some(f => f.id === fact.id)) {
        person.facts.push({ id: fact.id, proposition: fact.proposition, status: fact.status })
      }
      for (const tag of fact.legalTags ?? []) {
        if (!person.knowsAbout.includes(tag)) person.knowsAbout.push(tag)
      }
    }
  }

  const people = Array.from(byKey.values())
  for (const p of people) {
    p.weight =
      p.facts.length +
      ALIGNMENT_WEIGHT[p.alignment] +
      (p.identified ? 15 : 0) +
      // A class of people is the similarly-situated cohort, which is worth
      // finding, but one named person is worth more than a plural noun.
      (p.kind === 'group' ? -5 : 0)
  }

  return people
    .filter(p => p.alignment !== 'client')
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name))
    .slice(0, limit)
}
