/**
 * A client's name as the portal greets them.
 *
 * Names are typed by whoever opened the file, so they arrive as "david",
 * "DAYEON KIM" or "Jin Hwan Jang". A name written all in one case is put into
 * title case for the greeting; one with its own capitals is left alone, since
 * "McDonald" or "de la Cruz" knows better than any rule here.
 */
export function displayName(name: string): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return ''
  const oneCase = trimmed === trimmed.toLowerCase() || trimmed === trimmed.toUpperCase()
  if (!oneCase) return trimmed
  return trimmed
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}
