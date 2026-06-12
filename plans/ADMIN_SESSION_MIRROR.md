# Admin Session Mirror

## Purpose

The Admin Session Mirror is a manually started demo/presentation companion for
MCP-driven play. It is not the D&D authority and it is not required for MCP to
work.

MCP remains independent:

- MCP owns its normal in-process session state.
- MCP tools must succeed or fail by D&D/runtime rules, not by mirror
  availability.
- If the mirror is absent, unreachable, or restarted, MCP behavior is unchanged.

The mirror exists only to let an admin UI observe accepted MCP state changes
without manual refresh.

## Architecture

```text
Agent / MCP client
        |
        v
MCP process
  - owns session state
  - derives admin projection after accepted state-changing tool calls
  - optionally publishes projection snapshot
        |
        v
Admin Session Mirror (manual Effect/Node app)
  - stores latest projection per mirrorSessionId
  - fans projection snapshots out as Effect streams
        |
        v
React admin/demo UI
  - read-only
  - renders latest projection
```

The mirror is a projection cache and stream hub. It does not run character
creation, battle reducers, or rule projections.

## Publish Contract

MCP publishes `AdminMirrorProjectionEnvelope` snapshots:

```ts
{
  mirrorSessionId: AdminMirrorSessionId;
  publisherInstanceId: AdminMirrorPublisherInstanceId;
  sequence: AdminMirrorSequence;
  sourceProcessId: number;
  projection: AdminSessionProjection;
}
```

The stable presentation lane is `mirrorSessionId`. The per-process identity is
`publisherInstanceId`. A restarted MCP process can reuse the same
`mirrorSessionId`, but it receives a new `publisherInstanceId` and restarts its
local sequence.

The mirror must not infer true continuity across MCP restarts. It can only say
that a new publisher instance is now writing to the same presentation lane.

## Projection Boundary

The first projection boundary is:

```ts
{
  session: AdminMirrorSessionSummary
  battle: BattleSnapshot | null
  characters: readonly CharacterSessionRow[]
}
```

The projection is derived by MCP because MCP owns the authoritative in-memory
session. Character ids live in `characters[]`, not in `session`, so the mirror
contract cannot represent a session character id without a corresponding
character row.

Future fields may be added when real admin screens need them, for example draft
inspection or an audit timeline. Do not add raw `BattleState` to the mirror
contract.

## Streams

Effect streams belong in the mirror, not in the MCP session store.

- MCP side: optional publisher sink, no-op by default.
- Mirror side: receives envelopes, stores the latest session state, and exposes a
  stream such as `Stream<AdminMirrorSessionState>` to UI-facing transports.

This keeps MCP independent while still using Effect's stream model where it is
the right abstraction: fanout from the mirror process to connected observers.

## Failure Semantics

Mirror publishing is best-effort:

- Accepted MCP tool calls are not rolled back if publishing fails.
- Rejected MCP tool calls should not publish a new projection.
- If a projection is missed, a later snapshot can correct the UI.
- If the mirror starts after MCP has already mutated state, it cannot recover
  past in-memory state unless a future explicit snapshot pull or durable journal
  is added.

## Multiple Publishers

For demo mode, the mirror uses last-writer-wins per `mirrorSessionId`.

If different `publisherInstanceId` values publish to the same
`mirrorSessionId` inside a freshness window, the mirror should surface a
multi-source warning to the UI. It should not reject commands or attempt
distributed locking.

## Durable Observability Non-Goal

This spike is not the durable Postgres contract.

- Current: MCP publishes presentation snapshots directly to an optional mirror.
- Future durable observability must be designed from MCP/core-owned facts and
  rule-runtime boundaries, not inherited from this demo mirror contract.
- A future Postgres substrate may store snapshots, events, commands, or another
  shape entirely; this spike should not decide that API by precedent.

The admin UI renders this experimental presentation projection only. Persistence
and replay decisions remain outside the demo UI and mirror boundary.

## Experimental Boundaries

This spike is intentionally not production infrastructure.

- The mirror is single-process and in-memory. Restarting it loses cached
  projections.
- Publishing is best-effort and coalesces to the latest pending snapshot when
  the mirror is slow. Its presentation timeline is not an audit log.
- There is no authentication, durable replay, distributed lock, or cross-process
  coordinator election.
- The mirror binds to loopback by default. Host-accessible demos must opt in
  with `DND_ADMIN_MIRROR_HOST=0.0.0.0`.
- The admin UI is read-only demo UI. It is not an authoritative editor and MCP
  does not depend on it.
