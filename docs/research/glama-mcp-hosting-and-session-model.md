# Glama hosting and the D&D MCP session model

Research date: 2026-09-21

## Question and conclusion

Can `dnd-mcp` be deployed on Glama in the same way as the neighboring Huly MCP,
and can one hosted MCP process safely serve many users and conversations?

**The compute and application-session shape should work, but the current public
product should not be published through Glama until two gateway contracts are
proved or changed.** One Node process is enough. `dnd-mcp` does not keep a user
journey in an MCP transport session: it persists reconstructive state in
SQLite, and hosted stateful operations require the application's OAuth
principal and `play-sessions` scope. The caller passes the explicit Play Session
handle on later tool calls. That is the application-state pattern recommended
by MCP 2026-07-28, which removed protocol-level sessions and says stateful
applications should mint an explicit handle and receive it as a tool argument
([MCP 2026-07-28 release](https://blog.modelcontextprotocol.io/posts/2026-07-28/),
[local Play Session contract](../adr/0007-public-play-session-tenure-and-ownership.md)).

Glama provides the ordinary container facilities this needs: a dedicated
machine per deployment, an optional volume at `/data`, restart-on-failure, and a
Streamable HTTP Gateway endpoint. A Glama deployment would need both SQLite
paths under `/data`, a stable authorization secret, the public-origin setting,
and the public MCP container entrypoint
([Glama hosting](https://glama.ai/mcp/hosting),
[`@dnd/mcp` run contract](../../packages/mcp/README.md#run-the-server)).

The blockers are at the gateway boundary:

1. Glama says it persists every JSON-RPC request, response, and SSE event with
   full input arguments and output results. Those payloads include Play Session
   handles, private character and battle state, and user-supplied choices. The
   repository's observability contract requires request arguments and response
   content to be redacted. Glama's FAQ only suggests masking sensitive
   arguments at the client; masking is not possible for the state the server
   must receive verbatim. This is a direct conflict unless Glama can disable or
   field-redact payload capture for the connection
   ([Glama FAQ](https://glama.ai/mcp/faq),
   [Play Session ADR](../adr/0007-public-play-session-tenure-and-ownership.md)).
2. Saved sessions use OAuth routes, pages, discovery, and JWKS on the same
   application origin under `/api/auth` and `/.well-known/*`. Glama's public
   documentation promises a Gateway URL ending in `/mcp`, but does not establish
   that arbitrary sibling HTTP routes on the container are publicly reachable,
   nor how the application's OAuth bearer token and per-tool challenge are
   represented through its connection-profile authentication. Anonymous
   catalog discovery can be evaluated without this, but stateful play and the
   save/list/resume/delete flow cannot be claimed until those routes and bearer
   semantics pass a live probe
   ([Glama Gateway](https://glama.ai/mcp/gateway),
   [`@dnd/mcp` authorization contract](../../packages/mcp/README.md#run-the-server)).

The health-check mismatch is resolved in the current image: the D&D public
server serves `/ping` as an alias of `/health`, while the OCI health check
continues to use `/health`
([D&D public routes](../../packages/mcp/src/public-http-routes.ts),
[D&D public Dockerfile](../../operations/public-mcp/Dockerfile)).

## What the neighboring Huly MCP actually establishes

The neighboring project contains a minimal `glama.json`:

```json
{
  "$schema": "https://glama.ai/mcp/schemas/server.json",
  "maintainers": ["dearlordylord"]
}
```

That file claims and associates the Glama directory listing; it does not define
runtime configuration, session isolation, or credentials. At the research date,
the published [`server.json` schema](https://glama.ai/mcp/schemas/server.json)
declares `maintainers` as its only application property (the accompanying
documentation shows `$schema` alongside it). The current FAQ separately says
that `glama.json` can set display name, description, category, environment
variables, and build spec. Treat that as a Glama documentation/schema
discrepancy: keep this repository's schema-valid two-key file until Glama
confirms the extended shape, and put deployment settings in Glama Admin rather
than inventing unsupported fields here. Glama's own
`glama.json` documentation says the file lets an author claim a listing and then
configure the Docker image in Glama
([Huly `glama.json`](https://github.com/dearlordylord/huly-mcp/blob/b2f23e8dd6555feda8e09afa451eec976778901b/glama.json),
[Glama `glama.json` purpose](https://glama.ai/blog/2025-07-08-what-is-glamajson)).

Huly's repository history shows the earlier Glama-specific image more clearly.
It set `GLAMA_VERSION`, enabled lazy environment validation, cloned a pinned
commit, built the package, and ran its default stdio command. The Dockerfile was
then removed with the commit message “managed externally by Glama”; the current
repository later acquired a general HTTP Dockerfile
([historical Glama Dockerfile commit](https://github.com/dearlordylord/huly-mcp/commit/337d0ddc),
[removal commit](https://github.com/dearlordylord/huly-mcp/commit/731b9682),
[current Dockerfile](https://github.com/dearlordylord/huly-mcp/blob/b2f23e8dd6555feda8e09afa451eec976778901b/Dockerfile)).
This matches Glama's documented ability to wrap stdio servers behind a
Streamable HTTP endpoint; it does not show that Glama runs a single public Huly
process with safe credentials for unrelated end users
([Glama hosting](https://glama.ai/mcp/hosting)).

The current Huly implementation has independently added the boundary needed for
a multi-user hosted URL: it serves legacy HTTP statelessly and can derive a
request-scoped Huly client from `x-huly-url`, `x-huly-workspace`, and
`x-huly-token` headers. Its repository explicitly says a hosting layer can
forward those per-session headers so one process can serve different Huly
workspaces
([Huly HTTP documentation](https://github.com/dearlordylord/huly-mcp/blob/b2f23e8dd6555feda8e09afa451eec976778901b/README.md#hosted-http-header-configuration),
[Huly stateless handler](https://github.com/dearlordylord/huly-mcp/blob/b2f23e8dd6555feda8e09afa451eec976778901b/src/mcp/http-transport.ts#L194-L208)).
Glama's public docs do not say that connection-profile secrets can be projected
into those custom request headers. The Huly listing therefore proves registry
inspection and a deployable container shape, not that its current public
multi-tenant credential design has been certified on Glama. Its Glama schema
page currently reports only the diagnostic tools from an inspection without
Huly credentials, which is consistent with lazy inspection
([Huly on Glama](https://glama.ai/mcp/servers/dearlordylord/huly-mcp/schema)).

## Glama's deployment and connection scopes

The official hosting page distinguishes a registry record from a running
deployment:

- An author can list and claim a server without hosting it. A user may select a
  registry server and deploy it “to your own instance.”
- A deployment starts private and is scoped to the deploying account and its
  workspace. It receives a dedicated machine and a Gateway endpoint whose URL
  contains a connection-profile identifier.
- The owner can make that deployment public, which lists that deployment in the
  directory. Public documentation does not say that every public caller gets a
  separate VM or application database.
- Access tokens, call logs, OAuth credentials, and tool enablement are scoped to
  connection profiles. Workspace roles can share a deployment and its logs.

These are deployment/account scopes, not D&D Play Session scopes
([Glama hosting](https://glama.ai/mcp/hosting),
[Glama Gateway](https://glama.ai/mcp/gateway),
[Glama FAQ](https://glama.ai/mcp/faq)). A reasonable reading is that a private
“Deploy” gives a Glama customer an instance under that customer's control,
while making an operator-owned deployment public allows multiple callers to
reach the same deployment. The public material does not fully specify the
public caller-to-connection-profile cardinality, so this must be observed in a
test account before relying on Glama identity for application authorization.
`dnd-mcp` must not rely on it: saved authorization is the application's OAuth
principal, and the hosted HTTP boundary rejects anonymous stateful calls.

## Three different meanings of “session”

| Scope                               | Owner and identity                                                                       | Lifetime                                             | Relevance to D&D                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Modern MCP request flow             | No protocol session in MCP 2026-07-28; each request carries its protocol/client metadata | One request                                          | No user or game ownership evidence                            |
| Glama Gateway compatibility session | Glama documents `Mcp-Session-Id` tracking across reconnects for older clients            | Gateway/transport managed                            | Useful compatibility routing, but never a D&D user identity   |
| D&D Play Session                    | `dnd-mcp`; `PlaySessionId` plus an authenticated application principal                   | 90-day saved retention, subject to documented limits | Canonical character/battle journey and authorization boundary |

Glama's FAQ still describes `Mcp-Session-Id` lifecycle tracking, while the
released MCP 2026-07-28 protocol has retired that header. This is not inherently
a runtime conflict: gateways may retain compatibility for 2025-era clients,
and `dnd-mcp` can keep application state independently. It does mean Glama's
transport session must not be treated as a stable user, conversation, or Play
Session identifier
([Glama FAQ](https://glama.ai/mcp/faq),
[MCP 2026-07-28 release](https://blog.modelcontextprotocol.io/posts/2026-07-28/),
[Play Session ADR](../adr/0007-public-play-session-tenure-and-ownership.md)).

For an authenticated caller, the intended sequence through any conforming proxy is:

1. Complete the application's OAuth flow with the `play-sessions` scope.
2. Call `create_play_session` with that bearer token.
3. Receive `playSessionId` and include it in every stateful tool call, even
   after a reconnect or a new MCP transport request.
4. Any Glama-routed process loads that Play Session from the shared SQLite
   repository, checks the authenticated principal, reconstructs state, commits
   by revision, and returns the next state.
5. The application OAuth principal owns the saved session and controls its
   list, resume, and delete operations.

The Glama process does not need one MCP server per player for this sequence. It
does need durable shared application storage, and every replica would need to
mount the same transactional store. Glama currently documents a dedicated
machine per deployment, but does not document its replica topology, so a single
persistent `/data` volume is the natural initial shape. Horizontal scaling
would need an explicit storage review; SQLite on unrelated machine-local
volumes would split the canonical session owner.

## Fit assessment

| Requirement                               | Evidence                                                                                                                          | Status                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Run the public Node container             | Glama supports Dockerfile/GitHub builds and Node containers                                                                       | Fits                                                                               |
| Serve many conversations from one process | D&D routes state with explicit handles and authorization rather than transport state                                              | Fits                                                                               |
| Recover after restart                     | Glama offers `/data`; D&D persists both Play Session and authorization SQLite databases                                           | Fits if both paths use the mounted volume                                          |
| MCP transport                             | Glama exposes Streamable HTTP and wraps stdio; D&D already exposes HTTP                                                           | Fits; use D&D's native HTTP server                                                 |
| Health check                              | Glama probes `/ping`; D&D now serves `/ping` and `/health`                                                                        | Fits                                                                               |
| Play-session privacy                      | Glama documents full input/output payload persistence                                                                             | Does not fit current D&D contract                                                  |
| Saved-session OAuth                       | D&D needs same-origin `/api/auth` and `/.well-known/*`; Glama documents only the Gateway `/mcp` URL                               | Unresolved; live routing and OAuth test required                                   |
| Public user identity                      | Glama identity/connection profile is not documented as an upstream application principal                                          | D&D must keep its own application OAuth model                                      |
| Release/configuration                     | D&D production builds pass `DND_MCP_RELEASE`; the Glama image now defaults it for dashboard builds and can override it at runtime | Fits for private evaluation; production attestation still requires an exact commit |

## Smallest responsible Glama experiment

The first deployment should remain private. It should use
`operations/public-mcp/Dockerfile`, set both SQLite paths under `/data`, and
run the existing anonymous-boundary smoke against the Gateway `/mcp` endpoint.
That smoke proves catalog discovery and fail-closed hosted stateful access; it
does not prove the application's authenticated OAuth flow. Start with
anonymous catalog calls; use synthetic Play Sessions only after the
application's OAuth flow is reachable through the same external origin.
Before public use, the experiment must additionally establish all of the
following:

1. Glama reaches the application's `/ping` health alias and reports the
   deployment healthy.
2. The external origin reaches `/mcp`, protected-resource discovery,
   authorization-server discovery, login/consent pages, token and registration
   endpoints, and JWKS on one canonical origin.
3. Anonymous catalog calls remain anonymous while the application's OAuth
   challenges and bearer tokens reach the application correctly for stateful
   calls.
4. Restarts retain both SQLite databases and the authorization secret.
5. Glama disables or field-redacts JSON-RPC payload capture so bearer tokens,
   Play Session ids, and private game state are not stored in gateway logs. If
   it cannot, the public D&D service should stay on the existing
   provider-neutral container ingress rather than use Glama's Gateway.
6. Two unrelated Glama accounts complete the application's OAuth flow and
   operate independent Play Sessions concurrently; neither account can read,
   resume, save, list, or delete the other's session.

Glama can still be useful as a directory listing even if its hosted Gateway
cannot meet these conditions. As Huly demonstrates, `glama.json` ownership and
Glama inspection are separate from adopting Glama as the production
application/session boundary.
