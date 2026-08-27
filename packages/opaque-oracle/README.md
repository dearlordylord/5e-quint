# `@dnd/opaque-oracle`

The Opaque Oracle is a strict, presentation-free Case/Trace contract over one
call-local production evaluation. It covers Character Creation, fresh
Character Sheet construction, mixed-origin Battle entry, ordered Act attempts,
Runtime Hole fills, interrupt decisions, rejection/retry, and resolution.

`OracleCase` carries only varying creation decisions and the one fresh-sheet
table fact that is not derivable from a finalized `CharacterBuild`:

- an ordered sequence of non-empty creation fill batches; and
- either an ordinary fresh sheet or a non-empty, duplicate-free Wild Shape
  known-form set; and
- an ordered roster (including empty, so the production owner can return its
  typed empty-roster rejection) represented either by Stat Block entries or by
  Stat Blocks surrounding exactly one Character Sheet entry; and
- an ordered sequence of either an ordinary subject with ordered Battle fills
  or one interrupt-decision Battle fill.

`evaluateOracleCase` creates a blank draft with deterministic case-local draft
and sheet identities, supplies the current draft revision to each production
creation reducer call, and projects the existing creation, fresh-sheet, and
arbitrary-roster Battle owner facts. Draft snapshots, revisions, labels,
messages, sessions, caches, transport envelopes, and Battle replay internals
never enter the Trace.

The Trace preserves creation frontiers, one projected Battle checkpoint at each
stop, and ordered typed rejections. Each checkpoint carries a phase-appropriate
initiative stack with `alreadyActed` and non-empty `stillToAct` entries; the
current actor and combatant order are derived from that stack. Each Battle stop exposes exactly one
non-empty Acts frontier, one mechanical ordinary-hole frontier with its
accepted fills, one mechanical interrupt-decision frontier with its choices,
or a terminal resolution outcome. Invalid Battle attempts retain the same
projected checkpoint/frontier and the call-local evaluator continues with the
next Case attempt, so a later retry can succeed. Input exhaustion and surplus
are explicit workflow rejections; malformed or impossible owner projections
escape as defects. `decodeOracleCase*` and `decodeOracleTrace*` reject unknown
members, duplicate set members, duplicate JSON object keys, and inconsistent
checkpoint/frontier references. Effect Schema is the sole Case/Trace validation
authority; internal sessions, interrupt frames, partial procedure state,
transport state, and continuation tokens never enter the wire contract.

Successful traces contain stripped production Battle checkpoints and frontiers
projected by the production `discoverBattleActs`,
`resolveBattleRuntimeSubject`, `resolveBattleRuntimeInterrupt`, and
`battleMechanicalFrontier` owners. Entry projection failures retain the
production owner's typed, origin-correlated diagnostics; independent failures
are accumulated by the existing arbitrary-roster composition owner. The
call-local `BattleRuntimeSession` drives the protocol for one evaluation only;
no Oracle replay engine or durable product session is introduced.
