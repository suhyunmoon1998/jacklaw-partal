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
  // The capture has to survive escaped quotes. It did not, and that cost two
  // runs: a schema rejection reads
  //   Invalid option: expected one of \"text\"|\"textarea\"|...
  // and a [^"]+ capture stops dead at the first backslash, so the message
  // reaching the office was "Invalid option: expected one of \" — the half
  // that says which field and what it got, cut off every time.
  const found = /"message"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(raw)?.[1]
  const said = found ? found.replace(/\\(.)/g, '$1') : raw

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
  // Long enough to reach the offending value. A schema rejection reads
  // "Invalid option: expected one of ..." and the part that says WHICH field
  // and WHAT it got comes after that — truncating short hid the only useful
  // half and left a failure nobody could act on.
  return new Error(`The ${what} reading failed: ${said.slice(0, 4000)}`)
}
