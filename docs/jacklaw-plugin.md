# JackLaw Portal plugin — deployment handoff

## What this version implements

Seven read-only MCP tools at `/api/mcp`: `search_clients`, `get_client_intake`,
`list_client_documents`, `get_client_facts`, `get_client_reading`,
`list_client_assignments`, and `get_assignment_answers`.

The source package is `plugins/jacklaw-portal`. Its URL is the intended production
route, **not proof that this branch has been deployed or connected**. Do not upload
or advertise it as working until the live acceptance steps below pass.

This is an administrator-level integration. Anyone authorizing it must have the
existing staff password and can delegate read access to **all** portal clients,
as the current admin portal does. It does not introduce per-staff or per-matter
roles. Do not offer this plugin as a client-facing connection.

No client-data writes, messages, paid model calls, translations, file-content
downloads, or legal-deadline calculations are implemented. Document metadata is
not document text. Saved analysis is explicitly returned as not revalidated.
Question labels are the current English definitions (or a legacy label when
known); original answer text is preserved and is not a translated statement.

## Configuration

1. Apply `supabase/migrations/0023_mcp_authorization_codes.sql` and
   `supabase/migrations/20261001061904_mcp_refresh_sessions.sql` in the project's
   Supabase SQL editor. It adds only the OAuth code table, with RLS and explicit
   `service_role` grants; browser roles have no access.
2. Set these **server-only** Vercel environment variables for the deployment:

   | Variable | Value |
   | --- | --- |
   | `MCP_PUBLIC_ORIGIN` | `https://jacklaw-portal.vercel.app` (no trailing slash) |
   | `MCP_SIGNING_SECRET` | A new random secret of at least 32 characters, generated in a secure environment; never the admin password |
   | `MCP_CLIENT_ID` | `jacklaw-chatgpt` |
   | `MCP_REDIRECT_URIS` | Exact redirect URI shown by the ChatGPT MCP connection management screen; comma-separated only if multiple exact URIs are needed |

   Existing `ADMIN_PASSWORD`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are
   reused server-side. Never paste their values into chat or commit them. No
   `NEXT_PUBLIC_` credentials. Missing or malformed configuration disables MCP.
3. Deploy the reviewed branch through the existing Vercel project. This change
   does not create a replacement website or database. For previews, use that
   preview's exact HTTPS origin and separate configuration.
4. In ChatGPT's custom MCP connection setup, use the deployed `/api/mcp` URL,
   OAuth, a predefined client ID matching `MCP_CLIENT_ID`, and public-client
   token authentication (`none`, PKCE S256). There is no client secret, dynamic
   registration or CIMD. Refresh-token rotation is supported. If the host setup cannot choose
   a predefined public client, stop and adapt registration; do not disable auth.
5. Set `MCP_REDIRECT_URIS` to the exact redirect displayed there and redeploy if
   needed. Metadata advertises issuer identification and every authorization
   redirect includes `iss`; compatible ChatGPT hosts use their stable callback.
   Always copy the management screen's value instead of assuming a callback.
6. Connect. Sign in to `/admin` in another tab of the same browser if prompted,
   return to the consent page, reload, and choose **Allow read access** after
   reviewing the scope. Never put the staff password into ChatGPT.

The signing secret and admin password jointly derive the token key. Changing
either revokes issued access tokens immediately. Access tokens expire after one hour and renew with rotating refresh tokens.
Connections have a 90-day absolute lifetime and a 30-day renewal inactivity limit.
Existing connections must reconnect once to receive a refresh token. Used-token
replay revokes the entire connection, including its session-bound access tokens.
A concurrent refresh or lost refresh response can require reconnection; clients
must serialize refresh requests. The RFC 7009 endpoint `/oauth/revoke` accepts
a refresh token (including a used token) and revokes the connection immediately.
ChatGPT disconnect stops client use; server revocation on disconnect depends on
whether the host calls this endpoint. Staff can revoke a specific session using
`update public.mcp_sessions set revoked_at = now() where id = <session uuid>`
in the SQL editor. Rotating either server secret revokes every connection. Authorization codes expire after five minutes,
are stored hashed, and are consumed atomically with the matching PKCE challenge,
client, redirect and resource. Expired unused hashes can periodically be removed
using the housekeeping SQL in the migration. The public client ID is not a secret
or independent client authentication; the user session, explicit consent and
PKCE authorize each connection.

## Live acceptance (required before plugin creation)

- Both `/.well-known/oauth-authorization-server` and
  `/.well-known/oauth-protected-resource` return the configured URLs and scope.
- Unauthenticated `/api/mcp` returns 401 and the protected-resource challenge;
  an admin cookie alone still returns 401.
- Complete a staff consent and PKCE exchange. Verify the callback's `state`/`iss`.
- Initialize MCP, list all seven tools, and search for a designated test client.
- Read that test client's intake and assignment answers. Confirm the original
  language, source keys, pagination and case identity in the admin portal.
- Confirm a code cannot be exchanged twice, a mismatched assignment/client is
  refused, expired access tokens fail, and no write/send tool exists.
- Only then package `plugins/jacklaw-portal` and create the private plugin using
  Plugin Creator. Creating the package alone does not deploy or authenticate it.

## Verification boundaries

Local tests mock Supabase and exercise the actual MCP SDK transport, schemas,
OAuth validation and client/assignment filters. They do not prove live database
grants, concurrent Postgres execution, Vercel configuration, or host OAuth UI
compatibility. Complete the live acceptance above before staff rollout.

For stronger staff accountability later, replace the shared admin identity with
individual staff accounts and an established OAuth provider. This version
deliberately matches the current shared administrator authority and does not
claim individual staff attribution or per-connection revocation.

Reference: https://developers.openai.com/plugins/build/auth
