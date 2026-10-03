import { describe, expect, it } from 'vitest'
import { adminSignInHref, safeAdminReturn } from '@/lib/adminReturn'

describe('admin sign-in return path', () => {
  it('returns only to a reading or factual page on this site', () => {
    expect(safeAdminReturn('/admin/reading/client-123')).toBe('/admin/reading/client-123')
    expect(safeAdminReturn('/admin/factual/client-123')).toBe('/admin/factual/client-123')
    for (const bad of ['https://evil.example/admin/reading/x', '//evil.example', '/admin/reading/../x', '/admin', '/admin/gfrog/x', '', null]) {
      expect(safeAdminReturn(bad as string | null)).toBeNull()
    }
  })
  it('links to the sign-in with the page to come back to', () => {
    expect(adminSignInHref('/admin/reading/client-123')).toBe('/admin?next=%2Fadmin%2Freading%2Fclient-123')
    expect(adminSignInHref('/elsewhere')).toBe('/admin')
  })
})
