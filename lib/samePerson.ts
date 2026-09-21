/**
 * The same person, on more than one case.
 *
 * A worker suing two employers is two client rows sharing a phone number, and
 * the portal is built for that — there is a migration named for it and the
 * reminder ladder sends one text a morning per phone because of it. What was
 * missing was on the screen: the rows show a name, a case type and a phone,
 * which for one person on two cases is the same three things twice.
 *
 * That is not a cosmetic problem. Reading those two rows, I took the second
 * for a duplicate record and came within one query of deleting a live case.
 * A row that cannot be told apart from another invites exactly that.
 */

export interface OnACase {
  id: string
  phone: string
  caseFolderId?: string | null
}

/** Digits only, so (424) 333-2514 and 4243332514 are one person. */
const digits = (phone: string): string => String(phone ?? '').replace(/\D/g, '')

/**
 * For each client, the OTHER cases the same phone number appears on.
 *
 * Keyed by client id, and empty for anybody who has only one. A client with no
 * phone on file is nobody's match: an empty number is not evidence that two
 * rows are the same person, and treating it as one would merge strangers.
 */
export function alsoOn(
  clients: OnACase[],
  caseNameOf: (folderId: string) => string
): Map<string, string[]> {
  const byPhone: Record<string, OnACase[]> = {}
  for (const c of clients) {
    const key = digits(c.phone)
    if (key.length < 10) continue
    byPhone[key] = [...(byPhone[key] ?? []), c]
  }

  const out = new Map<string, string[]>()
  for (const sharing of Object.values(byPhone)) {
    if (sharing.length < 2) continue
    for (const c of sharing) {
      const others = sharing
        .filter(o => o.id !== c.id && o.caseFolderId && o.caseFolderId !== c.caseFolderId)
        .map(o => caseNameOf(o.caseFolderId as string))
        .filter(Boolean)
      if (others.length) out.set(c.id, Array.from(new Set(others)))
    }
  }
  return out
}
