/**
 * The last check before a save replaces a client's answers.
 *
 * Answers are one record and every save replaces it whole, so a page that
 * believes the file is blank can erase it by saving. Nothing a client does on
 * the questionnaire empties a record that has answers in it. A blank arriving
 * over a full file is a page that failed to read it, and is refused.
 */

const answerCount = (value: unknown): number =>
  value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).length : 0

export function wouldEraseAnswers(onFile: unknown, incoming: unknown): boolean {
  return answerCount(onFile) > 0 && answerCount(incoming) === 0
}
