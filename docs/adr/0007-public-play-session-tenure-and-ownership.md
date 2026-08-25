---
status: accepted
---

# Public Play Sessions begin as guests and become principal-owned when saved

The public Oracle must be fully explorable before sign-in without making a
temporary session look permanent. A new signed-out journey therefore creates a
**Guest Play Session**. The application issues an opaque, unguessable guest
access grant, separate from `PlaySessionId`, that the agent carries without
asking the user to manage it. Catalog browsing, character creation, Character
Session operations, and Battles are all available to a guest. Guest Play
Sessions normally expire after seven days without a successful session
operation. Under measured capacity pressure, the application may delete the
oldest inactive Guest Play Sessions, but a guest is never eligible for pressure
cleanup until it has been inactive for 24 hours.

A Guest Play Session survives transport reconnects and hosting-process or
isolate replacement while it remains retained. Access requires both its
correlation identity and guest access grant; possession of that grant is the
only guest authorization evidence. Any caller that obtains the grant can use
the guest session, so user-facing text, logs, metrics, and traces must redact it.
Guest sessions are absent from authenticated saved-session listings, so losing
the grant makes the retained session unavailable to that user even though the
application may still hold it.

Saving uses the standard MCP OAuth authorization flow and atomically changes the
same canonical Play Session into a **Saved Play Session** owned by exactly one
authenticated principal. It never copies or reconstructs the workspace. The
guest access grant stops authorizing access after that transition, while
`PlaySessionId` remains workflow correlation rather than an authentication
credential. Signed-in users create Saved Play Sessions by default. They may list
and explicitly resume their own sessions, but the application never silently
selects one. Saved Play Sessions expire after 90 days without a successful
session operation and support immediate permanent deletion. Deliberate
multi-owner sharing is outside the first public release.

A Saved Play Session also survives transport reconnects and hosting-process or
isolate replacement. Its principal may list and explicitly resume it from a new
conversation or device after authentication. Authorization checks the principal
on every session operation; a different principal, a stale guest grant, a
ChatGPT conversation id, and an MCP transport-session id are never ownership
evidence.

Authentication is requested at tool level only for saving, recovery, deletion,
and other principal-specific operations; it is not a prerequisite for catalog
browsing or guest play. Tools advertise their anonymous or OAuth requirements,
and a principal-specific operation without a valid token returns the standard
MCP OAuth challenge that lets the client begin linking. This optional-auth shape is
documented by the
[OpenAI Plugin authentication contract](https://developers.openai.com/plugins/build/auth)
and the
[MCP authorization specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization).
The OAuth and persistence contracts are hosting-provider-neutral.
The application owns one canonical recoverable Play Session representation;
transports, hosting integrations, ChatGPT history, Plugin Skills, and widgets
may carry identity or project results but never own shadow session state.
Process restart, isolate replacement, and transport reconnect therefore reload
or route to that representation rather than creating another owner.

Every stateful result projects the session's guest-or-saved tenure and the
retention facts the application can currently prove. Plugin guidance explains
temporary guest tenure when the session is created and at meaningful milestones
such as character finalization, Battle closeout, or an expressed intention to
return. It does not repeatedly interrupt ordinary play. Once a handle is absent,
the application preserves the singular typed unavailable result rather than
retaining a second tombstone store merely to guess whether deletion, expiry,
pressure cleanup, or another loss caused the absence.

This supersedes the public-product consequences of the process-lifetime decision
recorded in GitHub issue #304. The recoverable HTTP composition implements this
boundary; the stdio composition remains a convenient process-local development
path and does not redefine public ownership or retention.
