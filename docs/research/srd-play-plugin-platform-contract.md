# ChatGPT developer-mode contract for the SRD Play Plugin

> **Research evidence, not architecture authority.** This note records the
> current OpenAI platform contract for a later Wayfinder decision. Stable
> product structure belongs in the document routed by
> [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md).

Research checked: 2026-08-20.

## Question

What current ChatGPT developer-mode Plugin contract constrains the SRD Play
Plugin, including remote MCP transport and hosting, Plugin Skills and server
instructions, user identity and authentication, session continuity, durable
per-user persistence, and limits that materially affect the v1 specification?

## Decision-ready finding

The first usable SRD Play Plugin can be a conversation-first Plugin containing a
focused Plugin Skill and a registered connection to the existing MCP server. It
does **not** need public hosting for developer-mode evaluation: ChatGPT can reach
a private stdio or HTTP MCP server through Secure MCP Tunnel. The complete
installed Plugin is then packaged in a local or personal marketplace for testing.
[Connect and test a Plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[package a Plugin](https://developers.openai.com/plugins/build/plugins)

The v1 conversation must carry an explicit application `SessionId` through tool
results and later calls. OpenAI documents follow-up calls that reuse identifiers,
but it does not promise that one MCP transport session survives every tool call,
chat boundary, reconnect, metadata refresh, or server restart. Application state
must therefore not be keyed only by an in-memory MCP connection.
[Connect and test a Plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[build an MCP server](https://developers.openai.com/plugins/build/mcp-server)

Durable state that belongs to a person across conversations is not a free ChatGPT
Plugin facility. The current documentation provides no stable ChatGPT user ID to
an anonymous MCP server. Durable per-user Character Sessions therefore require our
own backing store plus our own OAuth 2.1 identity boundary. This is materially more
work than conversation-scoped state and should not block the developer-mode v1.
[Authentication](https://developers.openai.com/plugins/build/auth)

## Plugin and developer-mode shape

A Plugin is the installable package. It can contain Skills, an MCP server
connection, or both; optional UI is returned by the MCP server and is not required.
The appropriate SRD Play shape is both: the MCP server owns live state and controlled
operations, while a Skill teaches ChatGPT the repeatable Character Creation and
Battle workflows.
[Plugin architecture](https://developers.openai.com/plugins/concepts/plugins)

Every Plugin has `.codex-plugin/plugin.json`. A Plugin that references a registered
MCP server also has an `.app.json`; the filename is a compatibility name and the
underlying primitive remains the MCP server. Bundled Skills live under `skills/`.
For local testing, the Plugin can be listed in a personal or repository marketplace.
[Package your Plugin](https://developers.openai.com/plugins/build/plugins)

The developer workflow is:

1. enable Developer mode under **Settings → Security and login**;
2. register the MCP connection in ChatGPT Plugins and retain its
   `plugin_asdk_app...` technical ID;
3. package that connection and the Skill in the Plugin manifest;
4. add the Plugin to a local marketplace, install it, and test it in a new chat.

Developer-mode availability depends on the account and workspace policy. A local
marketplace is an authoring and testing source, not a public-directory publication.
[Connect and test your Plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[Package your Plugin](https://developers.openai.com/plugins/build/plugins)

## Transport and hosting

ChatGPT expects MCP over Streamable HTTP at a stable URL, normally `/mcp`, when it
connects directly to a hosted server. A public production Plugin needs a stable,
publicly reachable HTTPS endpoint with suitable latency, availability,
authentication boundaries, logs, and metrics. Serverless, container, edge, and
traditional hosting are all allowed; OpenAI does not select a host for the builder.
[Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)

Developer mode has a smaller route. Secure MCP Tunnel can expose a private MCP
server without putting it on the public internet, and the tunnel can reach either
stdio or HTTP. A temporary HTTPS forwarding service is also suitable for testing.
Neither route satisfies later public-submission requirements.
[Connect and test your Plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)

Consequences for this repository:

- The existing stdio transport can be used for the earliest Developer-mode
  experiment through Secure MCP Tunnel.
- A Streamable HTTP adapter is required before direct hosted connection or public
  submission, but public hosting is not a prerequisite for the v1 specification or
  its first developer-mode proof.
- Transport is an adapter boundary. It must not become a second owner of Character
  Creation, Character Session, Battle, or dice semantics.

## Workflow guidance: Plugin Skill and server instructions

The Plugin Skill is the main workflow guide. OpenAI assigns it tool sequences,
decision points, output requirements, examples, templates, and rules about facts the
model must not infer. A Skill can declare its MCP dependency in
`agents/openai.yaml`. Its description controls when the model considers it, so the
Skill should be focused on the recognizable user goal of exploring the SRD Surface
through Character Creation and Battle, not on a broad D&D persona.
[Build Skills](https://developers.openai.com/plugins/build/skills)

The MCP initialization `instructions` field is a smaller, server-wide control.
OpenAI recommends it for cross-tool sequencing and shared limits, with the most
important guidance in the first 512 characters. It must not duplicate every tool
description or try to set the model's personality. Tool names, descriptions,
schemas, annotations, and handlers remain part of the user-visible behavior.
[Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)

For SRD Play, this gives a clear division:

- **Plugin Skill:** guide discovery, Character Creation, Character Session → Battle
  handoff, Battle play, Battle → Character Session handoff, recovery from Runtime
  Holes, and engaging synthetic narration.
- **Server instructions:** state only global tool protocol, such as reading current
  state before mutation and carrying the returned application `SessionId` forward.
- **Tool contracts:** expose exact supported operations and typed choices. They are
  the boundary that prevents ChatGPT from inventing executable mechanics or PHB+
  Authored Records.

Skills imported from an MCP server are static submission-time snapshots; ChatGPT
does not fetch them live at runtime. For the developer-mode Plugin, a bundled Skill
is simpler and makes instruction changes explicit in the Plugin package.
[Build Skills](https://developers.openai.com/plugins/build/skills)

## Identity and authentication

An MCP server can be anonymous when it exposes no private user data. Anything that
exposes user-specific data or write actions should authenticate the user. The server,
not ChatGPT or the Skill, must authorize every request.
[Authentication](https://developers.openai.com/plugins/build/auth),
[Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)

Authenticated Plugins use the MCP OAuth 2.1 contract. Our MCP server is the resource
server; our identity provider or custom service is the authorization server; ChatGPT
is the OAuth client. ChatGPT performs authorization-code flow with PKCE, attaches the
access token to later MCP requests, and expects the server to verify issuer,
audience, expiry, and scopes on every request. The authorization server must provide
the required discovery metadata. ChatGPT can use CIMD, dynamic client registration,
or a predefined OAuth client.
[Authentication](https://developers.openai.com/plugins/build/auth)

This authenticates a user to **our** service. It is not evidence that an anonymous
tool call contains the user's ChatGPT account identity. If v1 adds durable personal
Character Sessions, the canonical storage key must be a subject issued and verified
by our authorization boundary, not a display name, conversation value, MCP
connection ID, or model-supplied field.

## Session continuity and persistence

Three lifetimes must remain distinct:

| Lifetime | Platform evidence | Product consequence |
| --- | --- | --- |
| One tool call | ChatGPT sends structured arguments and receives structured/model-readable results. | A call can apply one controlled operation. |
| One conversation | OpenAI explicitly tests follow-up prompts that reuse identifiers from earlier results. | Return an application `SessionId` and enough current state for ChatGPT to continue the workflow. |
| Across conversations | OAuth links can authenticate later requests, but OpenAI documents no anonymous stable-user identity or built-in Plugin data store. | Durable per-user state needs our OAuth identity and backing store. |

[MCP server concept](https://developers.openai.com/plugins/concepts/mcp-server),
[Connect and test your Plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[Authentication](https://developers.openai.com/plugins/build/auth)

The documentation does not give an MCP transport session a product-level lifetime.
It also requires deployed servers to reach any required data stores, which places
durability behind the MCP server rather than in ChatGPT. Therefore:

- do not rely on process memory or MCP transport continuity as the only owner of an
  active Character Session or Battle;
- use explicit domain session identity in every stateful tool protocol;
- for the no-auth developer v1, conversation-scoped state may be held in a bounded
  development store and treated as disposable;
- add cross-conversation recovery only after an authenticated principal and durable
  store exist.

[Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)

## Material v1 limits

- Developer mode can be unavailable because of account or workspace policy.
- The first Plugin can remain private and tunnel-backed; public submission adds a
  stable public HTTPS endpoint, domain verification, review, and reviewed metadata
  snapshots.
- ChatGPT refreshes developer-mode MCP metadata explicitly. After tool metadata
  changes, refresh the connection and start a new conversation for evaluation.
- Tool results must work without custom UI. The read-only widget experiment is
  optional and must not be required to complete Character Creation or Battle.
- Skills are instructions, not an authorization or rules boundary. The server must
  validate every input and enforce authorization.
- OpenAI recommends focused tools, explicit input/output schemas, stable identifiers,
  accurate safety annotations, and model-readable results. These are contract work,
  not optional polish for a stateful game workflow.
- Plugins work in Chat and Work on ChatGPT web, desktop, and mobile when available to
  the account. Installation and Plugin availability still depend on the supported
  surface and workspace policy.

[Connect and test your Plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[Build an MCP server](https://developers.openai.com/plugins/build/mcp-server),
[Plugins in ChatGPT](https://learn.chatgpt.com/docs/plugins)

## Recommended v1 platform contract

1. Package one focused SRD Play Skill plus the MCP connection as a personal
   developer-mode Plugin.
2. Use Secure MCP Tunnel against the existing stdio server for the earliest proof;
   add Streamable HTTP when direct hosting becomes useful.
3. Make every stateful result carry an explicit application `SessionId`; never treat
   MCP connection continuity as canonical state identity.
4. Make the full conversation workflow operate without UI.
5. Keep the first developer proof anonymous and its Character Sessions disposable.
6. Treat durable cross-conversation Character Sessions as a conditional extension:
   include them only if the implementation deliberately adds an OAuth 2.1 identity
   boundary and durable store. ChatGPT supplies neither automatically.
7. Keep the read-only widget and Sites/shared-storage experiments non-blocking; they
   do not alter the core Plugin contract established here.

## Unresolved by official documentation

The official OpenAI documentation does not promise the lifetime of one Streamable
HTTP MCP session, a stable anonymous user or conversation identifier delivered to
tools, automatic restoration of application state in a new chat, or Plugin-owned
durable storage. Any design that depends on one of those properties needs a bounded
prototype and must treat the result as observed behavior, not a platform guarantee.
