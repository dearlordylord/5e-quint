# `@dnd/opaque-oracle`

The Opaque Oracle is a strict, presentation-free Case/Trace contract over one
call-local production evaluation. It covers Character Creation, fresh
Character Sheet construction, and entry into the initial mixed-origin Battle
frontier.

`OracleCase` carries only varying creation decisions and the one fresh-sheet
table fact that is not derivable from a finalized `CharacterBuild`:

- an ordered sequence of non-empty creation fill batches; and
- either an ordinary fresh sheet or a non-empty, duplicate-free Wild Shape
  known-form set; and
- a non-empty arbitrary roster whose entries explicitly select a Character
  Sheet or Stat Block origin and carry their combatant, initiative, ammunition,
  and initial-condition facts.

`evaluateOracleCase` creates a blank draft with deterministic case-local draft
and sheet identities, supplies the current draft revision to each production
creation reducer call, and projects the existing creation, fresh-sheet, and
arbitrary-roster Battle owner facts. Draft snapshots, revisions, labels,
messages, sessions, caches, transport envelopes, and Battle replay internals
never enter the Trace.

The Trace preserves creation frontiers and ordered typed rejections. Input
exhaustion and surplus are explicit workflow rejections; malformed or
impossible owner projections escape as defects. `decodeOracleCase*` and
`decodeOracleTrace*` reject unknown members, duplicate set members, duplicate
JSON object keys, and invalid lifecycle sequences. The JSON Schema helpers use
the same schemas as the decoders.

Successful traces contain one stripped production Battle checkpoint and one
presentation-free Acts frontier. Entry projection failures retain the
production owner's typed, origin-correlated diagnostics; independent failures
are accumulated by the existing arbitrary-roster composition owner. Battle
continuation and nested ordinary/nested continuation are intentionally outside
this contract.
