import { Lang } from '@/lib/langs'

/**
 * A portal link that opens in the client's language.
 *
 * The portal draws itself in whatever language was last picked on that phone,
 * and a phone that has never picked one gets English. So a Spanish-speaking
 * client tapping the link in a Spanish email met an English sign-in screen and
 * an English questionnaire — Flora Sanchez-Adame, who had asked twice for the
 * link "in Spanish", was one. Every link the office sends carries ?lang=, and
 * the portal takes it as the choice for that phone.
 */
export function withLang(url: string, lang: Lang | null | undefined): string {
  if (!lang) return url
  return `${url}${url.includes('?') ? '&' : '?'}lang=${encodeURIComponent(lang)}`
}
