/**
 * What went wrong with a model call, said in a sentence the office can act on.
 *
 * Shared by every engine that calls the provider, because the failure a law
 * office actually hits is the account running out of credit, and that must not
 * reach the screen as a wall of JSON.
 */

/**
 * What went wrong, said in a sentence the office can act on.
 *
 * The SDK hands back the provider's raw JSON, so a reading that failed because
 * the firm's account ran out of credit showed the admin a wall of
 * {"type":"error","error":{"type":"invalid_request_error", ... — which reads as
 * a bug in the portal rather than as a bill to pay.
 */
export function plainly(err: unknown, what: string): Error {
  const raw = err instanceof Error ? err.message : String(err)
  const said = /"message"\s*:\s*"([^"]+)"/.exec(raw)?.[1] ?? raw

  if (/credit balance is too low/i.test(said)) {
    return new Error(
      'The firm\'s Anthropic account is out of credit, so the reading could not run. ' +
        'Top it up at console.anthropic.com and press Continue — nothing already read was lost.'
    )
  }
  if (/rate.?limit|429/i.test(said)) {
    return new Error('The reading was rate-limited. Wait a minute and press Continue.')
  }
  if (/overloaded|529|503/i.test(said)) {
    return new Error('The model is overloaded right now. Press Continue in a few minutes.')
  }
  if (/api key|authentication|401/i.test(said)) {
    return new Error('ANTHROPIC_API_KEY is missing or rejected, so no reading can be run.')
  }
  return new Error(`The ${what} reading failed: ${said.slice(0, 300)}`)
}
