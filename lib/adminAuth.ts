import { NextRequest } from 'next/server'

/**
 * Same shared-secret check the existing admin routes use: the admin panel sends
 * the password in an x-admin-key header and the route compares it to the
 * ADMIN_PASSWORD env var.
 */
export function isAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD
}
