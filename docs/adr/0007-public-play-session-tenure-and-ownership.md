---
status: accepted
---

# Hosted Play Sessions are principal-owned; local Play Sessions are ephemeral

The public Oracle allows anonymous stateless catalog discovery. Creating or
using a hosted Play Session requires the standard MCP OAuth flow and produces a
**Saved Play Session** owned by exactly one authenticated principal. A
`PlaySessionId` is workflow correlation, never authentication evidence.
Principals may list and explicitly resume only their own sessions; the
application never silently selects one. Saved Play Sessions expire after 90
days without a successful session operation and support immediate permanent
deletion. Deliberate multi-owner sharing is outside the first public release.

A Saved Play Session also survives transport reconnects and hosting-process or
isolate replacement. Its principal may list and explicitly resume it from a new
conversation or device after authentication. Authorization checks the principal
on every session operation; a different principal, a stale guest grant, a
ChatGPT conversation id, and an MCP transport-session id are never ownership
evidence.

Authentication is requested at tool level for every hosted stateful operation;
it is not a prerequisite for stateless catalog browsing. Hosted tools advertise
their OAuth requirement, and a stateful operation without a valid token returns
the standard MCP OAuth challenge that lets the client begin linking. This shape
is documented by the
[OpenAI Plugin authentication contract](https://developers.openai.com/plugins/build/auth)
and the
[MCP authorization specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization).
The OAuth and persistence contracts are hosting-provider-neutral.
The application owns one canonical recoverable Play Session representation;
transports, hosting integrations, ChatGPT history, Plugin Skills, and widgets
may carry identity or project results but never own shadow session state.
Process restart, isolate replacement, and transport reconnect therefore reload
or route to that representation rather than creating another owner.

The local stdio composition is a distinct authority boundary: it owns an in-
memory Play Session for the life of that server process, needs no credential,
and offers no list, recovery, promotion, or deletion contract. A local handle
cannot authorize any durable record, and a hosted identity cannot acquire a
local process's session.

Legacy guest rows created by an older release remain readable only by bounded
retirement code and expire under their original retention policy. New hosted
guest creation and guest-grant authorization are not public capabilities. This
preserves saved records without presenting two active ownership models.

Every stateful result projects only the tenure facts a caller needs. Once a handle is absent,
the application preserves the singular typed unavailable result rather than
retaining a second tombstone store merely to guess whether deletion, expiry,
pressure cleanup, or another loss caused the absence.

This supersedes the guest-capability decision previously recorded in this ADR
and the public-product consequences of GitHub issue #304. The recoverable HTTP
composition implements the principal-owned boundary; stdio implements the local
process boundary.
