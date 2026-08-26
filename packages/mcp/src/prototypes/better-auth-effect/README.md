# Better Auth + Effect prototype

This is throwaway code for the Wayfinder decision **Published plugin: determine
whether Better Auth can own saved-session OAuth**. It must not enter the
production deployment path.

The prototype asks whether Better Auth 1.7.1 can provide the authorization
server for the existing public MCP resource behind one narrow Effect 3 service
boundary. It uses a disposable SQLite database, enables CIMD and compatibility
DCR separately, and leaves every guest tool anonymous. Saving creates a
pseudonymous vault through Better Auth's anonymous plugin; the service requests
no email, password, or account/profile details. Ordinary network metadata is
still handled under the public privacy and retention policy.

This credential-free variant must use a fresh auth database path. Startup
rejects a database containing any non-anonymous Better Auth user, so accounts
and cookies from the earlier email/password prototype cannot silently retain
access. Changing the path invalidates those old cookies; the retired staging
database may be retained temporarily for rollback but must not be mounted as
the active auth database.

The final verdict and the preserved prototype branch/commit belong on the
decision issue. Main should receive only a later validated production change.

Run the self-contained local smoke with:

```sh
pnpm --filter @dnd/mcp prototype:better-auth
```

It creates and removes a scratch directory, starts one local authorization
server through the Effect service, checks discovery/JWKS, exercises open DCR,
and prints a redacted JSON observation.

With the same-origin prototype server running, verify the guest-first contract
with:

```sh
pnpm --filter @dnd/mcp prototype:better-auth:guest
```

That check creates a temporary Play Session without signing in, observes the
guest-tenure warning, and verifies that an attempted save returns the standard
MCP OAuth challenge. It then runs the complete character-creation and battle
newcomer journey anonymously. Saved-session tools intentionally remain
discoverable to anonymous callers.

After a live client connection, inspect only the registration mechanism counts
without printing client identifiers or metadata:

```sh
DND_PROTOTYPE_AUTH_DATABASE_PATH=/path/to/auth.sqlite \
  pnpm --filter @dnd/mcp prototype:better-auth:registrations
```

## Current result

The runtime path succeeds through authorization-server discovery, JWKS, open
DCR, credential-free pseudonymous vault creation, authorization code plus S256
PKCE, consent, token exchange, and the existing MCP resource verifier. The
issued token also authenticates the real MCP transport and saves, lists, and
deletes a formerly guest-owned Play Session. Only the `play-sessions` and
standard `offline_access` scopes are requested; the latter enables rotating
refresh tokens whose inactivity lifetime is derived from the canonical 90-day
saved-session retention policy. The smoke requires rotation, verifies the MCP
retry window replays the same rotated response, and uses the refreshed access
token for the saved-session workflow. It also proves that a second anonymous
browser session derives a different MCP principal and cannot list or delete the
first principal's saved session. The prototype does not advertise or request
email, profile, or OpenID Connect identity scopes.
CIMD is advertised, and the prototype's Node transport successfully fetches
ChatGPT's HTTPS client metadata document with resolve-once DNS validation and
connection pinning. It locally corrects a Better Auth 1.7.1 transport defect:
the package always supplies the single-address DNS callback shape even when
Node requests the all-addresses shape. The live ChatGPT authorization retry is
the remaining interoperability check. The registration evidence command
distinguishes CIMD from DCR using Better Auth's stored client-discovery fact.

The Better Auth 1.7.1 package set is not currently suitable for a cast-free
production integration. `@better-auth/oauth-provider` and `@better-auth/core`
declare `@better-auth/utils@0.4.2` as a peer while the resolved package graph
also requires 0.5.0, and the OAuth provider plugin is rejected as a
`BetterAuthPlugin` by both the repository compiler and TypeScript 5.9. Runtime
success does not override that type-safety blocker.

ChatGPT identifies itself as the OAuth client; it does not provide this MCP
server with a stable ChatGPT user identity. The vault therefore belongs to the
anonymous Better Auth browser session, and every client authorized from that
session shares its subject. It remains usable through an authorized client, but
cannot be recovered solely by signing into the same ChatGPT account after both
the browser session and authorization are lost. Anonymous-user deletion is
disabled until auth-state deletion can cascade to saved sessions. A production
recovery method must remain optional and separate from the default
credential-free flow.

Both authorization pages resolve the registered client through Better Auth's
signed pre-login metadata endpoint and display its name, client id, and declared
URI before enabling consent. The UI never trusts client identity copied from an
unsigned browser parameter.
