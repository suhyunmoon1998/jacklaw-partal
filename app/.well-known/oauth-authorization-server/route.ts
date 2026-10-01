import { NextResponse } from 'next/server'
import { authorizationMetadata, mcpConfig, noStore } from '@/lib/mcp/auth'
export const dynamic = 'force-dynamic'
export function GET() {
  return mcpConfig()
    ? NextResponse.json(authorizationMetadata(), { headers: noStore })
    : NextResponse.json({ error: 'MCP is not configured' }, { status: 503, headers: noStore })
}
