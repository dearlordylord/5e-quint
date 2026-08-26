# `@dnd/opaque-oracle`

The Opaque Oracle is a strict, presentation-free Case/Trace contract over one
call-local production evaluation. This package currently covers the
Character Creation-to-fresh-Character-Sheet increment.

`OracleCase` carries only varying creation decisions and the one fresh-sheet
table fact that is not derivable from a finalized `CharacterBuild`:

- an ordered sequence of non-empty creation fill batches; and
- either an ordinary fresh sheet or a non-empty, duplicate-free Wild Shape
  known-form set.

`evaluateOracleCase` creates a blank draft with deterministic case-local draft
and sheet identities, supplies the current draft revision to each production
creation reducer call, and projects the existing creation and fresh-sheet owner
facts. Draft snapshots, revisions, labels, messages, sessions, caches,
transport envelopes, and Battle internals never enter the Trace.

The Trace preserves creation frontiers and ordered typed rejections. Input
exhaustion and surplus are explicit workflow rejections; malformed or
impossible owner projections escape as defects. `decodeOracleCase*` and
`decodeOracleTrace*` reject unknown members, duplicate set members, duplicate
JSON object keys, and invalid lifecycle sequences. The JSON Schema helpers use
the same schemas as the decoders.

The package intentionally does not publish Battle variants in this increment.
The later mixed-origin Battle entry increment can extend this package by
composing the existing character-to-battle projection while retaining this
Case/Trace authority.
