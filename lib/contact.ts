/**
 * The firm's phone number, defined once.
 *
 * 866JACKLAW spells 866-522-5529 on a keypad (J=5, A=2, C=2, K=5, L=5, A=2,
 * W=9). Keeping the tel: href in one place so the digits can't drift out of
 * sync with the letters again.
 */
export const FIRM_PHONE_TEL = 'tel:+18665225529'

/** Letter form, as the firm advertises it. */
export const FIRM_PHONE_LABEL = '866JACKLAW'

/** Hyphenated letter form used on the marketing buttons. */
export const FIRM_PHONE_LABEL_HYPHENATED = '866-JACK-LAW'

/** Digit form, for anywhere the actual number needs to be readable. */
export const FIRM_PHONE_DISPLAY = '(866) 522-5529'
