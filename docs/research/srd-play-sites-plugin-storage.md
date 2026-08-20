# Sites and Plugin storage for SRD Play

> **Research evidence, not architecture authority.** This note records current
> official OpenAI documentation and design inferences for a Wayfinder decision.
> Stable product structure belongs in the document selected through
> [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md).

Research checked: 2026-08-20.

## Question

Can a ChatGPT Site and a ChatGPT Plugin use one canonical store for
character-session and battle state without copying or synchronizing state? If so,
what supported identity, storage, and deployment arrangement makes that possible?

## Executive finding

**Do not design around a Plugin directly opening a Site's D1 or R2 binding.** The
official documentation describes D1 and R2 as storage bound to a Sites project. It
does not document credentials, an external storage API, cross-project bindings, or a
way for a separately hosted Plugin MCP server to attach to those bindings.
[Sites documentation](https://learn.chatgpt.com/docs/sites)

One canonical store is still feasible: put authoritative character-session and
battle state behind one server-side application service, then let both the Plugin and
the Site use that service. The strongest identity arrangement is one authorization
server whose stable account subject is used by both surfaces. The Plugin documentation
explicitly assigns authoritative business data and cross-session state to the MCP
server, an external service, and storage controlled by the developer; it also supports
OAuth 2.1 against the developer's authorization server.
[Plugin UI state guidance](https://developers.openai.com/plugins/build/chatgpt-ui),
[Plugin authentication](https://developers.openai.com/plugins/build/auth)

There is also a smaller, interesting experiment: try to host the Plugin's MCP route in
the same Sites project as the Site so that one server application uses the Site's D1
binding. Sites is documented as full-stack hosting with production URLs, but the Sites
documentation does not promise the Streamable HTTP, routing, streaming, timeout, or
OAuth behavior required by a Plugin MCP server. This is an **unsupported or unknown
compatibility question**, suitable only for a bounded, non-blocking prototype.
[Sites documentation](https://learn.chatgpt.com/docs/sites),
[MCP server deployment requirements](https://developers.openai.com/plugins/build/mcp-server)

## Documented capabilities

### Sites storage belongs to a Sites project

- Sites can provision D1 for durable structured data and R2 for uploaded files. A
  local Sites project records the hosted `project_id` and the *binding names* in
  `.openai/hosting.json`; the example uses `"d1": "DB"`. This is a project linkage,
  not a database connection string or portable credential.
- The documentation consistently describes this as a Site's storage: each Site has a
  10 GB D1 limit, while R2 has no fixed storage limit. Editors of that Site can read
  its live database data.
- Sites settings can hold hosted environment values and secrets. Secret values must
  not go in prompts, attached files, Site content, or `.openai/hosting.json`.
- Sites warns that some private networks, databases, frameworks, background services,
  and hosting patterns are unsupported. It does not enumerate a general external
  database contract.

All four facts come from the
[official Sites documentation](https://learn.chatgpt.com/docs/sites).

### Durable Plugin state belongs on the server side

The Plugin UI documentation separates three owners:

| State | Documented owner | Lifetime |
| --- | --- | --- |
| Authoritative business data | MCP server or external service | Long-lived |
| UI state | One UI instance | Active UI instance |
| Cross-session state | Storage controlled by the developer | Cross-session and cross-conversation |

It explicitly says not to use widget state as authoritative business data or durable
storage, and says to authenticate the user so the MCP server can map requests to the
correct account. This fits a canonical Character Session and Battle store behind the
production application boundary; a widget or Site is only a projection and caller.
[Plugin UI state guidance](https://developers.openai.com/plugins/build/chatgpt-ui)

The MCP server runs in hosting selected by the developer. Server-side network access
is limited by that hosting environment, not by the widget CSP. Therefore a separately
hosted MCP server can use a developer-owned database or call a canonical application
service, subject to the chosen host's network and secret facilities.
[Plugin security and privacy](https://developers.openai.com/plugins/guides/security-privacy)

### The two built-in identity surfaces are not documented as one identity

Sites documents two relevant identity shapes:

- a workspace-restricted Site uses ChatGPT identity for its sharing boundary;
- a public Site can use **Sign in with ChatGPT**, after which Sites forwards
  `oai-authenticated-user-email` and an optional
  `oai-authenticated-user-full-name` header to Site server code.

Sites does not document a stable ChatGPT user subject identifier in those headers.
[Sites identity documentation](https://learn.chatgpt.com/docs/sites#add-sign-in-with-chatgpt)

For customer-specific data and write operations, the Plugin documentation says to
authenticate the user. Its documented mechanism is OAuth 2.1: ChatGPT acts as the
client, the developer's authorization server authenticates the user and issues an
access token, and the MCP server verifies that token on each request. OIDC `openid`,
`email`, and `profile` scopes may be requested when advertised, but this identity is
provided by the developer's authorization server.
[Plugin authentication](https://developers.openai.com/plugins/build/auth)

No official page found in the documented Sites or Plugin sets states that a Site's
Sign in with ChatGPT identity and a Plugin's OAuth identity share a stable subject, or
that the Plugin receives the Site identity headers. Joining them by matching email
would therefore be an application inference, not a documented platform identity
contract. Email is also a poor canonical account key because the documented Site
surface provides no immutability guarantee.

## Supported, inferred, and unknown arrangements

| Arrangement | Status | Consequence |
| --- | --- | --- |
| Separately hosted Plugin opens a Site's D1/R2 binding directly | **Not documented** | Do not use as an architecture assumption. No portable binding credential or cross-project access contract is described. |
| Plugin and Site call one external canonical application service | **Supported on the Plugin side; Site integration requires validation** | Plugin docs explicitly support an external service and developer-controlled storage. Sites documents server-side code, external identity-provider Site shapes, and hosted secrets, but not a complete external-database or arbitrary-service compatibility contract. |
| Site exposes a server API over its D1; Plugin server calls that API | **Inference** | This can preserve one D1 source of truth, but external API use, service guarantees, and identity propagation are not documented as a Sites product contract. |
| Plugin MCP server is hosted inside the same Sites project and uses its D1 binding | **Unknown** | It may be technically possible, but Sites does not promise MCP Streamable HTTP compatibility or the required OAuth endpoints and transport behavior. Prototype before relying on it. |
| Both surfaces use the same external authorization server and stable account subject | **Documented building blocks; end-to-end integration requires validation** | Plugin OAuth directly supports this. Sites lists an external identity provider as an authentication-enabled Site shape, but its public page does not specify the complete integration protocol. |
| Match Site Sign in with ChatGPT email to Plugin OAuth email | **Inference** | Possible for a prototype, but not a documented stable identity alignment. Do not make email the durable domain identity without an account-linking policy. |

## Recommended architecture if the Site experiment becomes valuable

Use one canonical application service, not synchronized Site and Plugin stores:

```text
ChatGPT Plugin tools ─┐
                     ├─> SRD Play application service ─> canonical store
ChatGPT Site ─────────┘
```

The service owns Character Session and Battle authorization, versioning,
concurrency, and persistence. The Plugin and Site submit typed operations and receive
projections. Neither surface stores a second authoritative Character Session or
Battle. R2 is needed only if later product data includes file objects; structured
character-session and battle state belongs in the canonical structured store.

Use one developer-controlled account identity for durable records:

1. The Plugin authenticates through OAuth 2.1 to the developer's authorization
   server.
2. The Site authenticates through the same provider if the Sites runtime supports the
   required flow in the experiment.
3. The canonical service keys ownership by the provider's stable subject, not display
   name, email, ChatGPT conversation, or Site project identity.
4. Authorization remains server-side on every operation.

Keep service credentials in each deployment environment's secret facility. Sites
documents hosted environment secrets. The Plugin must not ask ChatGPT or the user for
API keys; the Plugin authentication guide also states that ChatGPT cannot present
custom API keys to MCP servers. User access should use OAuth, while any service-to-
service credential remains inside server hosting.
[Sites secrets](https://learn.chatgpt.com/docs/sites#configure-runtime-environment-values),
[Plugin authentication](https://developers.openai.com/plugins/build/auth)

## Bounded, non-blocking experiment

This experiment must not block the conversation-only SRD Play Plugin specification or
MVP. Use synthetic records and time-box it to answering platform compatibility, not
building another product.

### Probe A: same-project Sites hosting

Deploy one minimal Site with D1 and attempt to expose one MCP tool from the same
project. Verify, rather than assume:

1. MCP initialization and one tool call work through ChatGPT developer mode.
2. The hosted route supports required methods, headers, streaming behavior, timeouts,
   and reconnects.
3. OAuth discovery, callback, and token validation endpoints work on the same host.
4. A Site server action and the MCP tool read and update the same D1 record.
5. Concurrent writes reject stale revisions rather than overwrite silently.

Failure of any transport or authentication item ends this probe. Do not add an
adapter, mirror store, or synchronization process to rescue it.

### Probe B: external canonical service

If Probe A fails or Sites hosting is too opaque, deploy a minimal external service and
store with one synthetic record. Verify:

1. Plugin write -> Site read and Site write -> Plugin read use the same record.
2. Two authenticated users cannot read or mutate each other's record.
3. Both surfaces map to the same stable authorization-server subject.
4. Credentials remain server-side and can be rotated independently.
5. Record deletion is visible immediately through both surfaces.

This probe is successful only if there is one authoritative record and no copy,
cache-as-authority, reconciliation job, or email-based identity join.

## Decision answer

**Yes, a Site and Plugin can be designed around one canonical store, but the supported
design center is a developer-controlled server-side store or external application
service. Direct cross-product sharing of a Site's D1/R2 bindings is not documented.**

Treat same-project Sites hosting of the MCP server as a small parallel experiment. Do
not let it block the v1 Plugin or make it the persistence plan until the exact hosting,
MCP transport, identity, and authorization behavior passes the probes above.
