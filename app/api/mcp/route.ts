import { NextRequest, NextResponse } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { authorized, mcpConfig, noStore, READ_SCOPE } from '@/lib/mcp/auth'
import { createPortalMcpServer } from '@/lib/mcp/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function handle(req: NextRequest) {
  const c = mcpConfig()
  if (!c) return NextResponse.json({ error: 'MCP is not configured' }, { status: 503, headers: noStore })
  const origin = req.headers.get('origin')
  if (origin && origin !== c.origin) return NextResponse.json({ error: 'Forbidden origin' }, { status: 403, headers: noStore })
  if (!await authorized(req)) return NextResponse.json({ error: 'Staff OAuth connection required' }, {
    status: 401, headers: { ...noStore, 'WWW-Authenticate': `Bearer resource_metadata="${c.origin}/.well-known/oauth-protected-resource", scope="${READ_SCOPE}"` },
  })
  // No SSE session is maintained between serverless invocations.
  if (req.method !== 'POST') return new NextResponse(null, { status: 405, headers: { ...noStore, Allow: 'POST' } })
  const raw = await req.text()
  if (raw.length > 32_768) return NextResponse.json({ error: 'Request too large' }, { status: 413, headers: noStore })
  let body: unknown
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers: noStore }) }
  const server = createPortalMcpServer()
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  try {
    await server.connect(transport)
    const response = await transport.handleRequest(req, { parsedBody: body })
    // Consume JSON before closing the transport so an active body is not cancelled.
    const responseBody = response.status === 202 || response.status === 204 ? null : await response.text()
    const headers = new Headers(response.headers)
    for (const [key, value] of Object.entries(noStore)) headers.set(key, value)
    return new Response(responseBody, { status: response.status, headers })
  } catch {
    return NextResponse.json({ error: 'MCP request failed' }, { status: 500, headers: noStore })
  } finally { await server.close() }
}
export const POST = handle
export const GET = handle
export const DELETE = handle
