# OAuth provider alternatives for the public D&D SRD Oracle

Research date: 2026-08-25

## Question and conclusion

Which authentication solution best fits a guest-first, provider-neutral,
TypeScript/Effect MCP application deployed as a Node 22 container on Dokku, where
authentication is requested only when a user saves or recovers a Play Session?

**Recommendation:** spike **Better Auth 1.7.x**, co-located with `@dnd/mcp` and
backed by SQLite, as the first choice. It is the smallest portability-preserving
addition: an MIT-licensed TypeScript library, a standard `Request`/`Response`
handler, SQLite support, and stable OAuth-provider, MCP, and CIMD packages. Its
OAuth provider can issue JWT access tokens for the existing MCP resource and
can support both the current MCP preference (CIMD) and the compatibility path
(DCR). The principal drawback is material: it is **not Effect-native**, and we
would own the login/consent UI, credential policy, email or social-login setup,
database migrations, key rotation, and auth operations.

If the spike exposes unacceptable security or UI work, use **Clerk** as the
managed fallback. Clerk has direct MCP documentation, managed sign-in, JWTs,
CIMD and DCR, a large current free tier, and data export. It is operationally
simpler but creates a stronger vendor dependency.

Do not choose an identity provider merely because it can log a person in. The
provider must act as the **authorization server for an unknown MCP client**, mint
a resource-bound token with the `play-sessions` scope, and expose compatible
discovery and client-registration behavior.

## Existing application boundary

The relevant architecture is already narrow and provider-neutral:

- Guest catalog browsing, character creation, session play, and battle play are
  anonymous. OAuth starts only for save/list/resume/delete operations. Saving
  atomically changes the same Guest Play Session into a principal-owned Saved
  Play Session; it does not copy state
  ([ADR 0007](../adr/0007-public-play-session-tenure-and-ownership.md)).
- Production is one Node 22 OCI application on a conventional Linux host;
  Dokku/Hetzner is a deployment adapter, not an application dependency
  ([ADR 0008](../adr/0008-public-mcp-runs-in-a-provider-neutral-node-container.md)).
- `@dnd/mcp` already publishes RFC 9728 protected-resource metadata and verifies
  JWT signature, issuer, audience, expiry, subject, and the `play-sessions`
  scope. It derives its opaque principal identity from `(issuer, subject)` and
  needs only authorization-server, issuer, and JWKS URLs
  ([MCP README](../../packages/mcp/README.md),
  [implementation](../../packages/mcp/src/public-oauth.ts)).
- The public service already has durable SQLite state. A co-located auth library
  can use SQLite without changing the Play Session ownership model, although
  auth tables and migrations must remain an explicitly owned schema boundary.

This means the application does **not** need an auth SDK threaded through its
rules engine. It needs an authorization-server HTTP surface plus verifiable
access tokens at the existing public HTTP boundary.

## Protocol compatibility gate

The 2026-07-28 MCP authorization specification requires OAuth 2.1 security,
RFC 9728 protected-resource metadata, and authorization-server discovery. It
prefers pre-registration, then Client ID Metadata Documents (CIMD), and retains
Dynamic Client Registration (DCR) only as a fallback. The accompanying MCP
release note explicitly says DCR is deprecated in favor of CIMD and will be
removed from a future specification
([MCP authorization specification](https://modelcontextprotocol.io/specification/draft/basic/authorization),
[2026-07-28 release note](https://blog.modelcontextprotocol.io/posts/2026-07-28/)).

For this project, an authorization server should therefore provide:

1. OAuth authorization code flow with PKCE S256 for a public client;
2. OAuth/OIDC authorization-server discovery and JWKS;
3. tokens whose `iss`, `aud`, `sub`, expiry, and `play-sessions` scope match the
   checks already implemented by `@dnd/mcp`;
4. CIMD for the current protocol; and
5. DCR temporarily, until exact ChatGPT production behavior is demonstrated or
   a pre-registered/CIMD path is confirmed.

There is a repository mismatch to correct: the current Dokku publication
verifier requires `registration_endpoint`, even though the accepted ADR links
the 2026-07-28 specification that deprecates DCR
([operations runbook](../../operations/public-mcp/README.md)). This should not
force the long-term provider choice. The first spike should exercise both CIMD
and DCR against ChatGPT developer mode, then change the verifier to express the
actually supported registration alternatives rather than DCR alone.

## Comparison

Scores are project-relative: **strong**, **workable**, **weak**, or **unknown**.
“Portable” means users and the MCP resource contract can move without redesign;
it does not mean a live migration is automatic.

| Candidate                               | MCP registration and discovery                                                                                                                                                             | TypeScript / Effect fit                                                  | Dokku / Hetzner fit                                                       | Portability                                                            | Operations                                                 | Current maturity / cost signal                                                  | Project fit                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------ |
| **Better Auth 1.7**                     | Strong: OAuth 2.1 provider, MCP resource helpers, CIMD, optional DCR, PKCE, JWT/JWKS                                                                                                       | Strong TypeScript; no Effect-native package                              | Strong: same Node container and SQLite                                    | Strong: MIT, local DB, standards boundary                              | Medium/high: we own UI, keys, email/social login, upgrades | Active OSS; current stable 1.7; built-in rate limits and security controls      | **Best spike**                             |
| **Clerk**                               | Strong: direct MCP guide, CIMD and DCR, PKCE/JWKS                                                                                                                                          | Workable SDK/HTTP boundary; not Effect-native                            | Strong managed service; no extra Dokku process                            | Medium/weak: standard tokens and full export, but hosted control plane | Low                                                        | 50,000 monthly retained users on free tier; current MCP support                 | **Best managed fallback**                  |
| **Auth0**                               | Strong: MCP guides, DCR, manual CIMD, OAuth 2.1-oriented third-party controls                                                                                                              | Workable generic JWT boundary; not Effect-native                         | Strong managed service                                                    | Medium/weak: standards and export, hosted control plane                | Low/medium: mature but broad dashboard/config model        | Free to 25,000 MAU; paid plans start at $35/month                               | **Safe baseline, not simplest**            |
| **Logto**                               | Promising: current CIMD “dynamic apps,” PKCE, OIDC; DCR was not established from current first-party docs                                                                                  | TypeScript service, but external HTTP boundary and no Effect integration | Managed or a separate self-hosted service                                 | Strong/medium: MPL-2.0 self-hosted option                              | Low managed; medium/high self-hosted                       | Active TypeScript OSS project; 12k+ GitHub stars and regular releases           | **Good follow-up if CIMD-only works**      |
| **ZITADEL**                             | Workable: OAuth/OIDC discovery and open DCR with mandatory PKCE for public clients; CIMD not established                                                                                   | Generic HTTP/JWT boundary; not Effect-native                             | Separate Go service plus PostgreSQL, or managed cloud                     | Strong: cloud and self-hosted product                                  | Medium managed; high self-hosted                           | Free cloud is 100 DAU; Pro starts at $100/month; mature IAM surface             | **Capable but too heavy here**             |
| **Supabase Auth**                       | Promising but beta: OAuth 2.1, PKCE, OIDC, DCR and JWKS                                                                                                                                    | Good TypeScript SDK, no Effect-native integration                        | Managed project or a large self-hosted stack                              | Medium: open stack, but product-shaped integration                     | Medium: custom authorization/consent UI still required     | OAuth server is beta and free during beta; free project pauses after inactivity | **Too much unrelated platform/beta risk**  |
| **Keycloak**                            | Workable OIDC/DCR, but its documented registration normally uses an initial-access or bearer token                                                                                         | Java service; generic JWT boundary only                                  | Separate JVM service and database                                         | Strong OSS standard boundary                                           | High                                                       | Long-established IAM project                                                    | **Operationally disproportionate**         |
| **Ory Hydra**                           | Workable OAuth/OIDC and DCR                                                                                                                                                                | Generic HTTP/JWT boundary only                                           | Separate Hydra/database plus a separately built login/consent application | Strong OSS protocol boundary                                           | Very high for this scope                                   | Actively released OAuth server                                                  | **Wrong abstraction level for a solo app** |
| **WorkOS AuthKit / Agent Registration** | Unknown for this exact flow: its new agent registration is gated through an account team and introduces a distinct agent-claim protocol; ordinary Connect apps are registered integrations | Generic SDK/HTTP                                                         | Managed only                                                              | Weak/medium                                                            | Low after enablement                                       | Commercial and feature-gated                                                    | **Do not use for first release**           |

### 1. Better Auth

Better Auth is framework-agnostic TypeScript under MIT, exposes standard
`Request`/`Response` handlers, and supports SQLite including Node's built-in
driver
([project repository](https://github.com/better-auth/better-auth),
[installation](https://better-auth.com/docs/installation),
[SQLite adapter](https://better-auth.com/docs/adapters/sqlite)). This matches
the existing Node process and avoids adding PostgreSQL or a second runtime.

Its stable OAuth Provider is an OAuth 2.1/OIDC authorization server with JWT
access tokens, discovery, resource identifiers/audiences, scopes, PKCE, DCR,
and CIMD. The MCP plugin builds on it with RFC 9728 metadata and MCP defaults;
DCR is opt-in, not silently enabled
([OAuth Provider](https://better-auth.com/docs/plugins/oauth-provider),
[1.7 upgrade guide](https://better-auth.com/docs/guides/1-7-upgrade-guide)).
The stable `better-auth`, `@better-auth/oauth-provider`, `@better-auth/mcp`, and
`@better-auth/cimd` packages were all published at 1.7.1 on 2026-08-18
([1.7.1 changelog](https://github.com/better-auth/better-auth/blob/main/packages/better-auth/CHANGELOG.md)).

Security posture is credible but still application-operated. First-party docs
describe scrypt password hashing, non-destructive secret rotation, HttpOnly
cookies, built-in route rate limiting, email-enumeration mitigations, trusted
proxy configuration, and refusal to follow redirects on server-side OAuth
requests
([security](https://better-auth.com/docs/reference/security),
[rate limits](https://better-auth.com/docs/concepts/rate-limit)). These controls
reduce implementation work; they do not transfer operational accountability.

The smallest reasonable login choice is probably one social provider initially
(for example GitHub), because email/password needs verified-email and password
reset delivery for a responsible public launch. Better Auth supports both, but
GitHub requires a client ID/secret and email permission, while email flows
require a transactional email provider
([GitHub provider](https://better-auth.com/docs/authentication/github),
[email](https://better-auth.com/docs/concepts/email)). This is a product decision
the spike must expose rather than bury.

### 2. Clerk

Clerk now documents an MCP resource integration directly. Its authorization
server supports PKCE, JWT/JWKS, DCR and CIMD; it recommends CIMD where possible
because open DCR creates an unauthenticated write surface. It can configure
default scopes for clients such as ChatGPT that omit `scope`
([MCP guide](https://clerk.com/docs/guides/ai/mcp/build-mcp-server),
[OAuth behavior](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth)).

This is the fastest path to hosted login and consent without operating auth.
The tradeoff is that account lifecycle and issuer availability remain in
Clerk's control plane. Clerk says its free Hobby tier includes 50,000 monthly
retained users, full data export, community support, and three dashboard seats
([pricing](https://clerk.com/pricing)). Pricing is unusually generous for a
small public experiment, but the unit is retained users rather than conventional
MAU and should be rechecked before launch.

### 3. Auth0 baseline

Auth0 supports open DCR for third-party/MCP applications, mandatory PKCE and
explicit API grants/scopes, plus manual CIMD registration; Auth0 recommends
manual CIMD for production MCP deployments
([MCP client registration](https://auth0.com/ai/docs/mcp/guides/registering-your-mcp-client-application),
[DCR](https://auth0.com/docs/get-started/applications/dynamic-client-registration),
[third-party applications](https://auth0.com/docs/get-started/applications/third-party-applications)).
It is a safe compatibility baseline and removes auth hosting, but offers no
special fit for this Effect/SQLite service and has a broad configuration model.

Auth0's published free tier includes 25,000 MAU and one custom domain; paid
Essentials starts at $35/month for the displayed 500-MAU tier
([pricing](https://auth0.com/pricing)). Its standards boundary and user export
reduce, but do not eliminate, migration cost.

### 4. Logto

Logto's current “dynamic app” implements CIMD: an HTTPS client ID document,
public-client PKCE, authorization-code and refresh-token grants, consent, and
revocable grants. Self-hosted deployments must retain SSRF protection because
Logto fetches client metadata from the internet
([dynamic app](https://docs.logto.io/integrate-logto/third-party-applications/dynamic-apps)).
The project is primarily TypeScript, MPL-2.0 licensed, and has an active release
stream
([repository](https://github.com/logto-io/logto),
[releases](https://github.com/logto-io/logto/releases)).

Logto is attractive if ChatGPT's exact production client succeeds with CIMD,
because it offers hosted and portable self-hosted forms with a prepared sign-in
experience. Current first-party documentation reviewed here did not establish
an MCP-compatible open DCR endpoint, so it cannot pass the repository's current
DCR-only verifier without either new evidence or a verifier correction.

### 5. ZITADEL

ZITADEL implements RFC 7591 DCR. Open unauthenticated registration is explicit,
disabled by default, and required for the traditional MCP DCR flow; public
clients must use PKCE
([DCR guide](https://zitadel.com/docs/guides/integrate/dynamic-client-registration)).
It can be managed or self-hosted, but self-hosting requires PostgreSQL and a
separate service; official deployment guidance supports Docker Compose and
common reverse proxies
([requirements](https://zitadel.com/docs/self-hosting/manage/requirements),
[deployment](https://zitadel.com/docs/self-hosting/deploy/overview)).

The cloud free tier is 100 daily active users and Pro starts at $100/month with
25,000 DAU included
([pricing](https://zitadel.com/pricing)). This is capable identity infrastructure,
but either the commercial step or the Postgres/service operations are large
relative to “authenticate only when saving.”

### 6. Supabase Auth

Supabase Auth's OAuth 2.1 server advertises PKCE, OIDC discovery, DCR and JWKS,
but the feature is currently beta and requires the application to build the
authorization/consent UI
([OAuth server](https://supabase.com/docs/guides/auth/oauth-server),
[setup](https://supabase.com/docs/guides/auth/oauth-server/getting-started)).
The managed free tier includes 50,000 MAU but pauses a project after a week of
inactivity; Pro begins at $25/month
([pricing](https://supabase.com/pricing)). It adds a Postgres-oriented platform
the Oracle does not otherwise need, while still leaving UI work, so it is not a
simpler choice than Better Auth or Clerk.

### Pruned options

- **Keycloak:** it supports OIDC DCR, but its documented secure registration
  path normally requires an initial access token or bearer token
  ([client registration](https://www.keycloak.org/docs/latest/securing_apps/index.html#_client_registration)).
  A separate JVM IAM service is disproportionate for one optional saved-session
  scope.
- **Ory Hydra:** Hydra is an OAuth/OIDC engine rather than a complete user-login
  product. Its configuration delegates login and consent to a separate
  application and exposes DCR configuration
  ([Hydra configuration](https://github.com/ory/hydra/blob/master/internal/config/config.yaml)).
  That creates more components and security boundaries than this project needs.
- **WorkOS/AuthKit:** the new Agent Registration flow must be enabled through a
  WorkOS account team and introduces identity assertions/claim ceremonies
  ([Agent Registration](https://workos.com/docs/authkit/agent-auth)); ordinary
  Connect models integrations as configured applications
  ([Connect](https://workos.com/docs/authkit/connect)). Neither is yet the
  clearest standard ChatGPT save-session OAuth path.

## Effect-native investigation

No evaluated solution is genuinely Effect-native.

The strongest negative evidence is Better Auth issue #7338, which proposed an
official `@better-auth/effect` package with `Effect`, `Layer`, typed errors, and
`HttpApi` middleware. The maintainers closed it as **not planned**
([issue #7338](https://github.com/better-auth/better-auth/issues/7338)). Better
Auth's normal server API is Promise/`Request`/`Response` based. Clerk, Auth0,
Logto, ZITADEL, Supabase, Keycloak, and Ory integrate through HTTP/JWT or ordinary
SDK promises rather than an Effect service.

That is not a blocker here. Authentication belongs at the public HTTP boundary,
and the existing application already returns a typed `Either` from token
verification. A Better Auth integration should:

- mount its handler at a bounded auth route;
- wrap initialization, migrations, and calls in a small Effect `Layer` only
  where lifecycle/error composition is useful;
- translate library failures once into precise tagged configuration or protocol
  failures; and
- keep the authorization-server library out of Play Session and rules-domain
  types.

Building a general community Effect adapter would enlarge scope without making
this application's auth boundary safer.

## Ranked shortlist

1. **Better Auth 1.7.x** — best overall fit and portability; proceed only after
   a bounded end-to-end spike.
2. **Clerk** — best managed fallback and likely fastest production setup.
3. **Auth0** — compatibility/maturity baseline if Clerk or Better Auth fails;
   heavier configuration and less attractive pricing.
4. **Logto** — strong open/managed alternative if a ChatGPT CIMD-only test passes.
5. **ZITADEL** — technically capable, operationally too large for the first
   release.

Supabase Auth, Keycloak, Ory Hydra, and WorkOS/AuthKit should not advance unless
requirements change materially.

## Required Better Auth spike

The spike should be throwaway and answer only compatibility and burden:

1. Mount Better Auth 1.7.x in the existing Node HTTP composition with a separate
   test SQLite database and asymmetric signing keys.
2. Configure the MCP resource exactly as
   `https://dnd-oracle.apps.loskutoff.com/mcp`, the `play-sessions` scope, PKCE,
   CIMD, and DCR compatibility.
3. Use one deliberately chosen sign-in method. For fastest evidence, GitHub
   social login avoids password storage and SMTP but excludes users without
   GitHub; a production email option requires transactional email and recovery
   design.
4. Exercise the real ChatGPT developer-mode flow: anonymous journey → invoke
   save → standard challenge → login/consent → token → atomically save the same
   session → list/resume it in a new conversation.
5. Assert token `iss`, `aud`, `sub`, expiry, and exact scope against the existing
   verifier, plus rejected wrong-audience/wrong-scope/expired tokens.
6. Test CIMD and DCR independently and record which registration path ChatGPT
   actually uses. Then update the publication verifier to accept the supported
   protocol alternatives.
7. Measure added image size, cold start, RSS, SQLite write contention, migration
   and rollback procedure, key rotation, and backup/restore implications.
8. Review login/consent wording so the user sees that sign-in is requested only
   to save/recover a session and is not permission to control their machine or
   unrelated data.

**Go** if ChatGPT completes the flow using standards-only metadata, the auth
tables coexist cleanly with the deployment's durable SQLite boundary, and the
UI/operations remain small. **Fall back to Clerk** if the spike requires custom
OAuth protocol work, a fragile login/consent implementation, or security
operations disproportionate to the feature.

## Uncertainties to resolve before selection becomes an ADR

- Exact ChatGPT production support and preference for CIMD versus DCR must be
  observed; protocol compliance alone is not deployment evidence.
- The public saved-session sign-in method is still a product decision. GitHub is
  simplest to operate but not universal; email/password or magic link adds an
  email provider and recovery responsibilities.
- Better Auth is well maintained and security-conscious, but it is younger than
  Auth0/Keycloak. A dependency/security review and pinned-version upgrade policy
  are required before launch.
- Provider pricing and feature gates change. Recheck the selected provider's
  first-party pricing page immediately before committing to managed production.
- Self-hosting an identity service is not automatically more portable if its
  operational burden makes upgrades, backups, or incident response unreliable.
