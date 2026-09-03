/**
 * The header has to outrank the page chrome underneath it.
 *
 * The language menu opens downward out of the header, across whatever the page
 * puts below it. On both questionnaire pages that is a sticky progress bar, and
 * while the header's wrapper sat at a lower layer than the bar, the bar was
 * painted over the middle of the open menu: English showed above it, Korean
 * below it, and Spanish and Chinese — the two in the middle — were invisible.
 * A client who read neither English nor Korean could not reach their own
 * language on the one screen they had to read.
 *
 * Nothing renders in this test; it reads the pages' own classes. That is the
 * point — the bug was never in behaviour, it was two numbers in the wrong
 * order, and this is what keeps them in the right one.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/** Pages that put a sticky bar directly beneath the header. */
const PAGES = [
  'app/questionnaire/page.tsx',
  'app/questionnaire/[assignmentId]/page.tsx',
]

const layerOf = (className: string): number => {
  const match = className.match(/\bz-(\d+)\b/)
  return match ? Number(match[1]) : 0
}

describe('the language menu is never painted over', () => {
  for (const page of PAGES) {
    it(`keeps the header above the sticky bar in ${page}`, () => {
      const lines = readFileSync(path.join(process.cwd(), page), 'utf8').split('\n')

      // Wrappers that hold a <Header>, and so hold the language menu. A page can
      // have several — a loading state, an error state, the real thing — and only
      // the one a sticky bar follows is at risk.
      const headerWrappers = lines.flatMap((line, i) =>
        /className="relative z-\d+"/.test(line) && /<Header/.test(lines[i + 1] ?? '') ? [i] : []
      )
      const stickyBars = lines.flatMap((line, i) =>
        /className="sticky top-0 z-\d+/.test(line) ? [i] : []
      )
      expect(headerWrappers.length, `no header wrapper in ${page}`).toBeGreaterThan(0)
      expect(stickyBars.length, `no sticky bar in ${page}`).toBeGreaterThan(0)

      for (const bar of stickyBars) {
        const wrapper = headerWrappers.filter(i => i < bar).pop()
        expect(wrapper, `sticky bar at line ${bar + 1} has no header above it`).toBeDefined()
        expect(
          layerOf(lines[wrapper!]),
          `${page}:${wrapper! + 1} — the header must sit above the sticky bar at line ${bar + 1}, ` +
            'or the language menu is painted over and the middle options cannot be reached'
        ).toBeGreaterThan(layerOf(lines[bar]))
      }
    })
  }

  it('still lets a full-screen dialog cover the header', () => {
    const source = readFileSync(path.join(process.cwd(), 'app/questionnaire/page.tsx'), 'utf8')
    const headerWrapper = source
      .split('\n')
      .find((line, i, lines) => /className="relative z-\d+"/.test(line) && /<Header/.test(lines[i + 1] ?? ''))
    const dialog = source.split('\n').find(line => /fixed inset-0 z-\d+.*role="dialog"/.test(line))
    expect(dialog).toBeDefined()
    expect(layerOf(dialog!)).toBeGreaterThan(layerOf(headerWrapper!))
  })
})
