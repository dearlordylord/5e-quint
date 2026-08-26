# Saved-session authorization

This package-local boundary owns the same-origin OAuth authorization server for
saved Play Sessions. The normal public Node process serves both `/mcp` and
`/api/auth`; no provider-specific worker, function, proxy, or second MCP process
is required.

Guest catalog exploration, character creation, and battles require no sign-in.
When a user elects to save a session, the authorization flow creates a
pseudonymous Saved Session Vault through Better Auth's anonymous plugin. It
asks for no email address, password, profile, or additional machine
permission. Both authorization pages identify the requesting client from
signed pre-login metadata before offering the action.

The vault's generated internal identity uses the service-owned
`vault.dnd-oracle.apps.loskutoff.com` domain. Startup normalizes labels created
by earlier staging builds and rejects an authorization database containing
non-anonymous users. Anonymous-user deletion remains disabled until auth-state
deletion can cascade to saved Play Sessions.

The Effect service owns Better Auth initialization, migrations, database
lifetime, and request failures. The Node adapter owns bounded request-body and
streaming response conversion. Better Auth supplies OAuth discovery, JWKS,
CIMD, compatibility dynamic client registration, S256 PKCE, consent, and token
issuance. The MCP resource remains the authority for token validation and Play
Session ownership.

The pinned Better Auth 1.7.1 dependency family requires
`@better-auth/utils@0.4.2` and `jose@6.2.10` to keep every peer context on one
type identity. The checked-in `better-call@1.4.0` patch adds `undefined` to the
declared type of an optional OpenAPI `items` member; it changes declarations
only and should be removed after an upstream release includes that correction.

Run the complete local authorization and MCP witness with:

```sh
pnpm --filter @dnd/mcp smoke:saved-session-authorization
```

The witness exercises ChatGPT's `openid email play-sessions` flow, a
refresh-token-capable flow, two isolated pseudonymous vaults, and save/list/
delete against the same public MCP process. Access tokens for ChatGPT's flow
last 90 days because ChatGPT does not request `offline_access`; clients that do
request it receive one-hour access tokens and rotating refresh credentials
whose inactivity lifetime matches the canonical 90-day saved-session
retention.

The runtime entrypoint requires one public origin, separate SQLite paths for
Play Sessions and authorization state, and a secret of at least 32 characters:

```sh
DND_MCP_PUBLIC_ORIGIN=https://oracle.example.test \
DND_PLAY_SESSION_DATABASE_PATH=/var/lib/dnd-oracle/play-sessions.sqlite \
DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH=/var/lib/dnd-oracle/saved-session-authorization.sqlite \
DND_SAVED_SESSION_AUTHORIZATION_SECRET=replace-with-at-least-32-random-characters \
  pnpm --filter @dnd/mcp serve:http
```

For local HTTPS development, expose this same HTTP entrypoint through the
operator's tunnel. The public origin must be the stable HTTPS tunnel origin so
OAuth issuer, audience, redirect, discovery, and cookies agree; the tunnel is
transport only and does not change application composition.

After a live connection, registration mechanism counts can be inspected
without printing client identifiers or metadata:

```sh
DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH=/path/to/authorization.sqlite \
  pnpm --filter @dnd/mcp evidence:saved-session-registrations
```

ChatGPT identifies the OAuth client, not a stable ChatGPT user subject. A vault
therefore belongs to its anonymous browser authorization session. It remains
usable through an authorized client, but cannot be reconstructed solely from a
ChatGPT login after both browser authorization state and client authorization
are lost. Any future recovery mechanism must remain optional and separate from
the default credential-free path.
