import { NextResponse } from 'next/server'
import { mcpConfig, noStore, READ_SCOPE } from '@/lib/mcp/auth'
export const dynamic = 'force-dynamic'
export function GET() {
  const c = mcpConfig()
  return c
    ? NextResponse.json({ resource: c.resource, authorization_servers: [c.origin], scopes_supported: [READ_SCOPE], bearer_methods_supported: ['header'] }, { headers: noStore })
    : NextResponse.json({ error: 'MCP is not configured' }, { status: 503, headers: noStore })
}
