# Oracle and Cleanroom boundary audit

Research date: 2026-08-26

## Decision

The repository already has the user-facing ChatGPT Battle, production
TypeScript runtime APIs, arbitrary mixed-roster entry, recoverable Play
Sessions, deterministic dice, ordinary Hole replay, nested interrupts, and
MCP HTTP/stdio parity. The Cleanroom program does not build another Battle
engine. It adds one source-free, stateless Opaque Oracle Case-to-Trace use mode
over the existing production application.

The previous issue graph incorrectly made that Cleanroom operation depend on a
product-wide Battle continuation redesign. The two programs are now separated.

The product redesign is not discarded wholesale. Independent review found
real product defects in ordinary partial-state handling, snapshot/frontier
conflation, duplicated consumer envelopes, and roster-admission diagnostics.
Those remain product work. Stateless replay of nested interrupts is rejected;
durable interrupt checkpoints remain Battle-owned.

## Evidence

- `@dnd/battle-runtime` already owns initialization, Act discovery,
  Hole/Fill replay, resolution, interrupts, and snapshots
  ([Battle Runtime README](../../packages/battle-runtime/README.md)).
- MCP exposes the complete ChatGPT journey through Character Creation,
  `start_battle`, `discover_battle_acts`, `fill_battle_hole`, turn progression,
  settlement, and recoverable Play Sessions
  ([MCP README](../../packages/mcp/README.md)).
- `start_battle` accepts a non-empty Character Session/Stat Block union and
  accumulates per-combatant projection failures
  ([input](../../packages/mcp/src/start-battle-tool-input.ts),
  [composition](../../packages/mcp/src/start-battle-tool.ts)).
- Current Battle continuation uses caller-retained ordinary fills and durable
  runtime-owned interrupt frames
  ([session execution](../../packages/battle-runtime/src/battle-session-execution.ts),
  [interrupt lifecycle](../../packages/battle-runtime/src/battle-reducer/interrupt-lifecycle.ts)).
- Current snapshots mix checkpoint mechanics, Acts, execution cursors, and
  interrupt frontiers
  ([snapshot type](../../packages/battle-runtime/src/battle-state-execution.ts),
  [projection](../../packages/battle-runtime/src/battle-reducer/battle-snapshot.ts)).
- MCP result payloads repeat snapshots and derive several frontier projections,
  establishing a product cleanup independent of Cleanroom
  ([payloads](../../packages/mcp/src/battle-tool-payloads.ts),
  [schemas](../../packages/mcp/src/battle-tool-output.ts)).
- ADR 0006 entered in commit `60e756bed` as part of an Oracle decomposition and
  incorrectly generalized caller-owned replay to interrupts. ADR 0009 replaces
  that decision while retaining ordinary replay and frontier separation.

Focused current-behavior verification passed:

- MCP recovery, HTTP/stdio parity, and end-user vertical: 3 files, 14 tests.
- Battle interrupt continuation and codec boundaries: 2 files, 43 tests.

## Ticket dispositions

| Ticket | Decision |
| --- | --- |
| `#12` | Improve the accepted specification to distinguish ordinary accepted-fill replay from runtime-owned interrupt checkpoints. |
| `#32/#61/#63` | Keep as non-runnable Opaque Oracle operation aggregates; remove retired-runner language and product-migration coupling. |
| `#33` | Keep as the non-runnable aggregate for one packaged CLI/HTTP application. |
| `#62` | Keep as the call-local Character Creation and fresh Character Sheet workflow increment. |
| `#64/#65/#66` | Keep and linearize around one packaged executable: CLI, then HTTP mode, then parity. |
| `#92` | Close and detach; it mixed completed history, product cleanup, and Cleanroom prerequisites. |
| `#160` | Keep and rewrite as product roster-admission cleanup; remove already-delivered cardinality claims. |
| `#161` | Keep as a standalone, non-runnable product checkpoint/frontier aggregate. |
| `#166` | Keep and narrow to ordinary replay/checkpoint/retry consistency. |
| `#169` | Keep and redefine the snapshot around the current durable checkpoint, excluding presentation and frontiers. |
| `#411` | Close; retain durable runtime-owned nested-interrupt checkpoints. |
| `#168` | Keep and redefine the exclusive envelope around durable checkpoints, without stateless interrupt replay. |
| `#412` | Keep as product consumer deduplication/migration, without any Oracle prerequisite role. |
| `#93/#121/#122/#94/#95` | Keep and rewrite as the remaining Opaque Oracle operation, Battle, schema, and fixture increments. |

## Corrected graphs

```text
Product Battle architecture

  #160

  #161
    ├─ #166
    ├─ #169
    ├─ #168
    └─ #412

  #166 ─┐
        ├→ #168 → #412
  #169 ─┘

  #411 closed

Cleanroom Opaque Oracle

  #93 → #62 → #121 → #122 → #94 → #95 → #64 → #65 → #66
```

There is no dependency between these two graphs. If an Opaque Oracle
implementation discovers a concrete missing production fact, that fact becomes
a bounded product blocker; the entire product migration is not presumed.

## Review method

The audit used current source, package and architecture owners, git history,
live GitHub issue bodies and dependencies, two independent GPT-5.6 Sol reviews,
and one independent Kimi K3 review. Review disagreement was resolved against
current product invariants and executable evidence rather than by vote.
