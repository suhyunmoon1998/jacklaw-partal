import { describe, it, expect } from 'vitest'
import { CheckContext, authorityForDrafting, check, checkDraft, labelOf } from '@/lib/briefDraft'
import { DraftSentence } from '@/lib/briefDraftShape'
import { Brief } from '@/lib/caseBrief'

/**
 * A draft is a set of claims about the file, and each one is checked. These are
 * the ways a fluent paragraph goes wrong that code can catch — and, after a
 * review found them, the ways the checking itself went wrong: it passed law
 * that was on file but never handed, and struck correct sentences over a comma.
 */

const ctx: CheckContext = {
  facts: new Map([
    ['f069', { proposition: 'She took a meal break at 5:00 p.m. every day.', status: 'REPORTED' }],
    ['f012', { proposition: 'She was paid $18 an hour.', status: 'CONFIRMED' }],
    ['f067', { proposition: 'She does not believe the employer still owes her wages.', status: 'DISPUTED' }],
  ]),
  authority: new Set(['LAB 226.7', 'LAB 512', 'IWC 5 sec 11', 'brinker-provide-means-relieve']),
  authorityText: new Map([['LAB 226.7', 'one additional hour of pay'], ['LAB 512', 'not less than 30 minutes']]),
  heldCases: [['brinker', 'restaurant', 'corp', 'superior', 'court'], ['harris', 'city', 'santa', 'monica']],
  damagesText: JSON.stringify({ issues: [{ estimate: 'about $1,240', math: '62 hours x $20' }, { estimate: 'between $4,200 and $9,800' }] }),
  estimatedFigures: new Set(['1240', '4200', '9800']),
}

const s = (over: Partial<DraftSentence>): DraftSentence => ({
  text: 'She took her meal break at 5:00 p.m. on every shift.',
  facts: ['f069'],
  authority: [],
  inference: false,
  ...over,
})

describe('a sentence that is on file', () => {
  it('passes with its facts in the ledger', () => {
    expect(check('trial-facts', s({}), ctx)).toEqual([])
  })

  it('passes stating law from a provision it was handed and declares', () => {
    const law = s({ text: 'Labor Code section 226.7 requires one additional hour of pay.', facts: [], authority: ['LAB 226.7'] })
    expect(check('trial-intro', law, ctx)).toEqual([])
  })

  it('accepts a prefixed fact id as the same fact', () => {
    expect(check('trial-facts', s({ facts: ['client-1789103134380:f069'] }), ctx)).toEqual([])
  })
})

describe('law that was not handed', () => {
  it('strikes a provision on file in the library but not handed to this draft', () => {
    // GOV 12940 and LAB 2699 are both in the library; neither was quoted to the model.
    expect(check('trial-intro', s({ text: 'Retaliation is barred.', authority: ['GOV 12940'] }), ctx)[0]).toMatch(/GOV 12940, which was not handed/)
    expect(check('trial-intro', s({ text: 'Under Labor Code section 2699 penalties follow.' }), ctx).join(' ')).toMatch(/LAB 2699 in its text, which was not handed/)
  })

  it('reads the Style Manual form, and a section named with no code', () => {
    expect(check('trial-intro', s({ text: 'Premium pay is owed. (Lab. Code, § 1198.5.)' }), ctx).join(' ')).toMatch(/LAB 1198.5 in its text/)
    expect(check('trial-intro', s({ text: 'Premium pay is owed under section 1198.5.' }), ctx).join(' ')).toMatch(/Names a section without declaring/)
  })

  it('flags held law named in the text but not declared', () => {
    const p = check('trial-intro', s({ text: 'Labor Code section 512 requires a meal period.' }), ctx)
    expect(p.join(' ')).toMatch(/Names LAB 512 in its text without declaring it/)
  })

  it('does not read "the Labor Code." as a citation', () => {
    expect(check('trial-intro', s({ text: 'This case arises under the California Labor Code.' }), ctx)).toEqual([])
  })
})

describe('cases', () => {
  it('lets a handed case through, however the sentence begins', () => {
    const p = check('trial-intro', s({ text: 'In Brinker Restaurant Corp. v. Superior Court the court asked what provide means.', authority: ['brinker-provide-means-relieve'] }), ctx)
    expect(p).toEqual([])
  })

  it('strikes a different case that shares a party name with a handed one', () => {
    expect(check('trial-intro', s({ text: 'Under Harris v. Superior Court the exemption fails.' }), ctx).join(' ')).toMatch(/Harris v\. Superior…"\) that was not handed/)
  })

  it('strikes a case never handed, and a short-form cite to one', () => {
    expect(check('trial-intro', s({ text: 'As in Alvarado v. Dart Container, the rate includes the bonus.' }), ctx).join(' ')).toMatch(/not handed/)
    expect(check('trial-intro', s({ text: 'Under Kilby, supra, a seat must be provided.' }), ctx).join(' ')).toMatch(/"Kilby, supra"/)
  })

  it('strikes reporter pages in either form', () => {
    expect(check('trial-intro', s({ text: 'See (2012) 53 Cal.4th 1004, 1040.' }), ctx).join(' ')).toMatch(/reporter page/)
    expect(check('trial-intro', s({ text: '(Brinker, supra, 53 Cal.4th at p. 1040.)', authority: ['brinker-provide-means-relieve'] }), ctx).join(' ')).toMatch(/reporter page/)
  })
})

describe('figures', () => {
  it('reads a figure before a comma as the figure', () => {
    expect(check('trial-conclusion', s({ text: 'Defendant owes an estimated $4,200, most of it in meal premiums.' }), ctx)).toEqual([])
    expect(check('trial-conclusion', s({ text: 'Between $4,200 and $9,800, depending on records.' }), ctx)).toEqual([])
  })

  it('accepts a figure from a fact the sentence cites, without calling it an estimate', () => {
    expect(check('trial-facts', s({ text: 'She was paid $18 an hour.', facts: ['f012'] }), ctx)).toEqual([])
  })

  it('strikes a figure from nowhere, and an estimate written as a certainty', () => {
    expect(check('trial-conclusion', s({ text: 'She is owed $9,999.' }), ctx).join(' ')).toMatch(/\$9,999, which is not in a fact it cites/)
    expect(check('trial-conclusion', s({ text: 'She is owed $1,240.' }), ctx).join(' ')).toMatch(/without saying it is an estimate/)
  })
})

describe('the factual summary', () => {
  it('keeps law and legal argument out', () => {
    expect(check('factual-summary', s({ authority: ['LAB 512'] }), ctx).join(' ')).toMatch(/States law in the factual summary/)
    expect(check('factual-summary', s({ text: 'The employer violated her right to a break.' }), ctx).join(' ')).toMatch(/legal argument \("violated"\)/)
    expect(check('factual-summary', s({ text: 'Brinker Restaurant Corp. v. Superior Court says she was relieved.' }), ctx).join(' ')).toMatch(/in the factual summary, which carries no law/)
  })

  it('does not strike ordinary facts that use a legal-sounding word, or what a person said', () => {
    expect(check('factual-summary', s({ text: 'She signed a one-page form entitled "Meal Period Acknowledgment" on her first day.' }), ctx)).toEqual([])
    expect(check('factual-summary', s({ text: 'She supported the line cooks during the dinner rush.' }), ctx)).toEqual([])
    expect(check('factual-summary', s({ text: 'Her manager told her "you are not entitled to breaks here."' }), ctx)).toEqual([])
  })
})

describe('the whole draft', () => {
  it('counts, keeps flagged sentences, merges a split section and sets aside an unknown key', () => {
    const checked = checkDraft(
      {
        sections: [
          { key: 'trial-facts', paragraphs: [{ sentences: [s({})] }] },
          { key: 'trial-facts', paragraphs: [{ sentences: [s({ facts: ['f999'] })] }] },
          { key: 'trial-introduction', paragraphs: [{ sentences: [s({})] }] },
        ],
        notWritten: [],
      },
      ctx,
      ['trial-intro', 'trial-facts', 'trial-conclusion']
    )
    expect(checked.counts).toEqual({ sentences: 2, flagged: 1 })
    expect(checked.sections).toHaveLength(1)
    expect(checked.sections[0].paragraphs).toHaveLength(2)
    expect(checked.notWritten[0].why).toMatch(/"trial-introduction", which this draft does not write/)
  })
})

describe('what the model is handed', () => {
  const brief = {
    claims: [
      { claimId: 'minimum-wage', standing: 'gaps to close', elements: [], adverse: [], defense: '' },
      { claimId: 'feha-accommodation', standing: 'gaps to close', elements: [], adverse: [], defense: '' },
      { claimId: 'expenses', standing: 'not raised by these facts', elements: [], adverse: [], defense: '' },
    ],
    wageOrder: { proposal: { order: '5' } },
  } as unknown as Brief

  it('prints the key above every provision, so the model cites what it was handed', () => {
    const a = authorityForDrafting(brief)
    expect(a.text).toContain('[key: LAMW 2024-07-01]')
    expect(a.text).toContain('[key: CCR2 11068]')
    expect(a.text).toContain('[key: GOV 12940]')
  })

  it('hands no law for a claim the reading found nothing on', () => {
    expect(authorityForDrafting(brief).keys).not.toContain('LAB 2802')
  })
})

describe('the firm\'s evidence labels', () => {
  it('labels a sentence by the weakest fact under it, and an inference as one', () => {
    expect(labelOf(s({ facts: ['f012'] }), ctx)).toBe('CONFIRMED')
    expect(labelOf(s({ facts: ['f012', 'f069'] }), ctx)).toBe('CLIENT-REPORTED')
    expect(labelOf(s({ facts: ['f069', 'f067'] }), ctx)).toBe('UNRESOLVED')
    expect(labelOf(s({ facts: ['f012'], inference: true }), ctx)).toBe('INFERENCE')
    expect(labelOf(s({ facts: [], authority: ['LAB 512'] }), ctx)).toBe('LAW')
  })
})
