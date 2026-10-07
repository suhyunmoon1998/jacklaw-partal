import { describe, expect, it } from 'vitest'
import { createHash } from 'crypto'
import statuteData from '@/lib/authority/statutes.json'
import { chapters, cite, parseKey, section } from '@/lib/authority'
import { citedInTitle, fetchedFor, normalizeKey } from '@/lib/authority/lookup'
import caciData from '@/lib/authority/caci.json'

/**
 * The sections pulled on 2026-10-06 (FETCHED_ON.employeeProtections), pinned
 * to the text leginfo served that day.
 *
 * leginfo answers an automated request with a bot check, so they were read in a
 * browser. Each section's SHA-256 was taken in that browser, from the text as
 * extracted, before the text left it: the section's paragraphs joined by a
 * newline, a run of spaces, tabs or line breaks inside a paragraph read as one
 * space, no-break spaces and curly quotes kept. The same extraction, run the
 * same day, reproduced the Government Code sections pulled on 2026-09-24 and
 * Lab. Code §§ 1475–1477 byte for byte, and § 1474 but for one trailing space —
 * which is what shows it is the method the library was built with.
 *
 * A hash that stops matching means the text here was changed after it was
 * pulled. If leginfo's text has changed, pull the section again; do not edit it.
 */
const PULLED: Record<string, string> = {
  'GOV 8547.8': 'd584a80aea165bb6f2f224a102bc7e6c42ebbd6b6fa0d2454a271cc23ef22cbd',
  'GOV 12653': '0d29c78c8a02be2d7681c848b191d6e1e61ba633e5b69910688dcf9fb3f4bc8c',
  'GOV 12945': '739ba45d12f8b2829ee0ef162f4c3d99c99b758e3f2de913e88b2078a4f28936',
  'GOV 12945.1': '43c5ea83df6bea29a196d1c457c25cd0383749c8c7b8ceaa7499baeb5905362a',
  'GOV 12945.2': '68c6467c6a5f069d3620519671eeff0964ba096d348e537c2a114580657eb23e',
  'GOV 12945.5': 'ef4f50ed747f952090077cc3368ba5ed06c9159460670a00e8a14877947a626f',
  'GOV 12945.6': '96496329d308fd910b25d8f0d88d6ffbabd4d668d9b9f0d90b9de70915fdd2ea',
  'GOV 12945.7': 'dc1ec4591c71fd08dd4f899ff9451a0adbd9fbdd9fc0521320f4e92c789b0feb',
  'GOV 12945.8': '15643f963e4e5f30b8426fed7f80e33bc4f41a86cb5133364174ccdb37988a72',
  'GOV 12945.21': '857472147353405e7c7faee94fd46cc2ea5a33782ff812284e2fb5acf965482a',
  'LAB 226.8': '8d0479963d20c070947d4e12f123e71d628efd25a8460a1b7fa836c6bf503343',
  'LAB 970': '04329798dd6c5b05e33b85f3ff72b598e7c152565c7261d6cc22bcfa0e206cca',
  'LAB 971': '94fc65b1dd8f6ea6f8d5a5ca520269332aa16caa067ab5b8c253f69ecf2c2d44',
  'LAB 972': 'a08fd4b1408ff7859ccb4e6f5beba9d1b741bc6dc5e87acb77f52891064b0ac1',
  'LAB 973': 'f998e8a703a905e8f8b5147c71e818e8c91ddb4c538db915e9a1ef562b5f8a5d',
  'LAB 974': '71da1c53bf27f30dbc1c83db10b821fcba319e0a156e63c4541b86d5eb90af3e',
  'LAB 976': '0c21825e96e1b36265ac6e0d88bf1331d06a795d5599a1f1245b26b7d7699c60',
  'LAB 977': '58ff1134cd48dbbce7645fbd99989d566bc165352d8049d2d353d2c472f48f80',
  'LAB 1019': 'cfe0694811c3c3d5006931eb5b3749f5d8e93e60437b438dccc8824477747476',
  'LAB 1019.1': '62aafda89c44cee6d764146a1ccfc990e5812cb7f8ce600b669edf8bd3c1a601',
  'LAB 1019.2': '158ccc90c7c6852954c38752f84dacd5ed36274c5ac5377dbe707f8d2aee1ddb',
  'LAB 1019.4': '19179b91fac0c0a824685cd27f86fd3b66b9c0d69a88172f23ab4fd772d0a30a',
  'LAB 1050': '79b15a08e35dea7f483b236722f41a56955d13a1149b177d445ec319a380223d',
  'LAB 1051': 'd9cbbea07f97e75fca98903b8029dee5880cd842b50e07e470cb191d6e8a0226',
  'LAB 1052': '46da3bae5c9daf9920da8080a9321137cacc71be9207868acb3b4cd3ba836e6c',
  'LAB 1053': '946f2b8a391ef77efcaf7029e994c53999bb32cfe9dcf580d8127afbe44ab922',
  'LAB 1054': '43d6ae7b108a033198bf5221311b5ad69c68258f223dc87d964a847847dfdff7',
  'LAB 1055': 'def65c7d4438243ce3423b66e256a29390363619fc95fa7eecaea77d0b9386e0',
  'LAB 1056': '12499c60c6b5eeab22037f464a7b5a75e418fb45fcebc3d6baab3091f0d5cce7',
  'LAB 1057': '972c13155c16de3d8c83b885a097cc7a36f9b22d8ec780bcd8a2605d81e571a7',
  'LAB 1400': '1ea6c3ed138176189b7056493dd8e92768d19e18fa71fd02486814ff343d1cc3',
  'LAB 1400.5': 'c44fb56e04ebdb8ce965ebc9a49e6128f8cb133c40584ea6e2bb03f6f223c58d',
  'LAB 1401': 'afec0faf1fd174ffde155ee92081ea854430773ecf40bda3a16208837a595fc1',
  'LAB 1402': '6ae5e7f9d69eb28b519e8752cf2bb8bd461da11e73aec79e1467e4b156118e92',
  'LAB 1402.5': '990b7f8668bac579fc3f3fae477b3ebfd3adfb6774266ccc209a8b1c1d9f27f3',
  'LAB 1403': '7ee0a22f69a7890f9a0c28c7dc533c57589c327dce2506b9ac7fb60c7b799311',
  'LAB 1404': '771452831061447349b3f03c1a5b6ea4f1fc5afa53a5a3aecbf5a4ef3b9ff39c',
  'LAB 1405': '72175ce38219b534e54b7fae3fc53f0c2d6618dd0c9f672bd1e9aee486ea45f0',
  'LAB 1406': '25d218eaa782bc4125b847ff559a0f86c15d2c07d1a328ea6bd0cabffcc00cc9',
  'LAB 1407': '77132fe2834c06b5da0b6f4f7a308e312abd142b3df84c061eeadd8ef078ac62',
  'LAB 1408': '872be0ed8e75910ca50690a13b94731dbe2a93e964aabee7f35ac8e3dfee0127',
  'LAB 6310': '46a84e1d454ecd10d40ce7d624a4798f3900afc3628e864fd9d93d419921c87b',
  'LAB 6311': 'e221521bfb4d82415a44863e8591aca8e12d1b2eca38a43e2a241a33a30e3a13',
  'LAB 6312': 'fe9a2a97eb61349b3a77115fcb067a1494949749bcb68ad64015583721d8df39',
  'HSC 1278.5': '21be532599061fb3b174ea1bb002267be45b1df2d8e1de0818a3bc77fc0b8f5d',
}

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')
const held = (key: string) => {
  const { law, num } = parseKey(key)
  return section(law, num)
}
const statuteKeys = Object.keys((statuteData as unknown as { sections: Record<string, string> }).sections)

describe('the sections pulled on 2026-10-06 are the text leginfo served', () => {
  for (const [key, hash] of Object.entries(PULLED)) {
    it(`${key} is byte for byte what was pulled`, () => {
      const text = held(key)
      expect(text, `${key} is on file`).toBeTruthy()
      expect(sha256(text!)).toBe(hash)
    })
  }

  it('is dated by its own pull, and nothing else is', () => {
    for (const key of statuteKeys) {
      const { law, num } = parseKey(key)
      const pulledThatDay = fetchedFor(law, num).on === '2026-10-06'
      expect(pulledThatDay, key).toBe(key in PULLED)
    }
    // The FEHA sections held since 2026-09-24 keep their own date.
    expect(fetchedFor('GOV', '12940').on).toBe('2026-09-24')
    expect(fetchedFor('GOV', '12945.2').from).toMatch(/12945–12945\.8/)
  })

  it('records each chapter pulled, with the number of sections held from it', () => {
    const pulledChapters = chapters().filter(c => c.fetched === 'employeeProtections')
    expect(pulledChapters.reduce((n, c) => n + c.count, 0)).toBe(Object.keys(PULLED).length)
    for (const c of pulledChapters) {
      const [lo, hi] = c.range.map(Number)
      const inRange = Object.keys(PULLED).filter(k => {
        const { law, num } = parseKey(k)
        return law === c.law && Number(num) >= lo && Number(num) <= hi
      })
      expect(inRange.length, c.key).toBe(c.count)
    }
  })
})

describe('what was pulled is the provision it is filed under', () => {
  it('reads as the section, not a neighbour', () => {
    expect(held('GOV 12945')).toMatch(/not to exceed four months/)
    expect(held('GOV 12945.2')).toMatch(/12 workweeks in any 12-month period for family care and medical leave/)
    expect(held('GOV 12945.7')).toMatch(/five days of bereavement leave/)
    expect(held('LAB 226.8')).toMatch(/not less than five thousand dollars \(\$5,000\)/)
    expect(held('LAB 1401')).toMatch(/60 days before the order takes effect/)
    expect(held('LAB 6311')).toMatch(/real and apparent hazard/)
    expect(held('LAB 972')).toMatch(/double damages/)
    expect(held('LAB 1054')).toMatch(/treble damages/)
    expect(held('LAB 1019')).toMatch(/within 90 days/)
    expect(held('GOV 12653')).toMatch(/two times the amount of back pay/)
    expect(held('GOV 8547.8')).toMatch(/clear and convincing evidence/)
    expect(held('HSC 1278.5')).toMatch(/within 120 days of the filing of the grievance/)
  })

  it('cites the Health and Safety Code the way a brief does, and reads it the ways a model writes it', () => {
    expect(cite('HSC', '1278.5')).toBe('Health & Saf. Code § 1278.5')
    expect(normalizeKey('Health & Safety Code § 1278.5')).toBe('HSC 1278.5')
    expect(normalizeKey('Health & Saf. Code, § 1278.5')).toBe('HSC 1278.5')
    expect(normalizeKey('1278.5')).toBe('HSC 1278.5')
    expect(citedInTitle('4606. Whistleblower Protection—Unsafe Patient Care and Conditions—Essential Factual Elements (Health & Saf. Code, § 1278.5)')).toEqual(['HSC 1278.5'])
  })

  it('leaves no CACI instruction on file citing a statute that is not', () => {
    // CACI 2710, 2711, 2732, 4600–4602 and 4606 cited sections that were not
    // held, and a reader sent to them from the instruction found NOT ON FILE.
    const caci = (caciData as unknown as { sections: Record<string, string> }).sections
    for (const [key, text] of Object.entries(caci)) {
      for (const cited of citedInTitle(text.replace(/\s+/g, ' ').slice(0, 240))) {
        expect(held(cited), `${key} cites ${cited}`).toBeTruthy()
      }
    }
  })
})
