/**
 * Where the admin panel sends you back to after signing in.
 *
 * Eleanor links straight to a client's case reading or factual brief, which
 * needs the admin cookie. Without it, the page now links to the sign-in with
 * `?next=` and the panel returns there after the password is accepted.
 * Only this site's own admin pages are accepted, so the parameter cannot be
 * used to send someone elsewhere after they sign in.
 */
export function safeAdminReturn(value: string | null | undefined): string | null {
  if (!value) return null
  if (!/^\/admin\/(reading|factual)\/[A-Za-z0-9_-]{1,100}$/.test(value)) return null
  return value
}

export function adminSignInHref(currentPath: string): string {
  const next = safeAdminReturn(currentPath)
  return next ? `/admin?next=${encodeURIComponent(next)}` : '/admin'
}
