# `@dnd/opaque-oracle`

## Purpose

The Opaque Oracle is the behavioral calibration instrument used by independent
Target SDK conformance tests. Target-owned tests submit reproducible
`OracleCase` values to the source-free distribution and compare their SDK's
observations with the returned `OracleTrace`, without receiving the TypeScript
source or depending on the Oracle at product runtime.

It addresses composed-workflow drift: an independent SDK can implement the
individual rules yet disagree at the boundaries between Character Creation,
fresh Character Sheet construction, Battle entry, and Battle continuation. The
Oracle makes those production observations reproducible without handing the
Target a second implementation to copy.

The Oracle is neither a reference SDK nor rules authority, and a difference is
evidence rather than an automatic Oracle verdict. RAW and calibrated QNT remain
authoritative; the Target implementer diagnoses an
[`Oracle Discrepancy`](../../docs/cleanroom/CONTEXT.md#oracle-discrepancy) against
them. The canonical Cleanroom role is defined under
[`Opaque Oracle`](../../docs/cleanroom/CONTEXT.md#opaque-oracle).

The Opaque Oracle is a strict Case/Trace contract over one call-local
production evaluation. Its workflow outcomes and continuation frontiers are
presentation-free; a selected `CharacterBuildFact` may retain authored
selection identity such as `authoredStartingItem.itemName` at that boundary.
It covers Character Creation, fresh Character Sheet construction, mixed-origin
Battle entry, ordered Act attempts, Runtime Hole fills, interrupt decisions,
rejection/retry, and operation settlement back to Acts or awaiting input.

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
arbitrary-roster Battle owner facts. Draft snapshots, revisions, presentation
labels/messages, sessions, caches, transport envelopes, and Battle replay
internals never enter the Trace. The selected-build identity exception is the
authored identity already carried by the production `CharacterBuildFact`; it
is not a second Oracle presentation field.

The Trace preserves creation frontiers, one projected Battle checkpoint at each
stop, and ordered typed rejections. Each checkpoint carries a phase-appropriate
initiative stack with `alreadyActed` and non-empty `stillToAct` entries; the
current actor and combatant order are derived from that stack. Each Battle stop exposes exactly one
non-empty Acts frontier, one mechanical ordinary-hole frontier with its
accepted fills, or one mechanical interrupt-decision frontier with its choices.
Settling a Battle operation returns to Acts or awaiting input; Battle has no
terminal resolution branch. Invalid Battle attempts retain the same projected
checkpoint/frontier and the call-local evaluator continues with the next Case
attempt, so a later retry can succeed. Input exhaustion and surplus are
explicit workflow rejections; malformed or impossible owner projections escape
as defects. `decodeOracleCase*` and `decodeOracleTrace*` reject unknown
members, duplicate set members, duplicate JSON object keys, and inconsistent
checkpoint/frontier references. Decoding runs in this order: the
duplicate-aware raw JSON scan, structural Document decoding, semantic
admission, and evaluation. The generated Document schemas are published in
[`publication/`](publication/) and independently compiled with Draft 2020-12
Ajv; semantic admission remains the owner for runtime correlations that a
standard JSON Schema cannot express. Internal sessions, interrupt frames,
partial procedure state, transport state, and continuation tokens never enter
the wire contract.

Successful traces contain stripped production Battle checkpoints and frontiers
projected by the production `discoverBattleActs`,
`resolveBattleRuntimeSubject`, `resolveBattleRuntimeInterrupt`, and
`battleMechanicalFrontier` owners. Entry projection failures retain the
production owner's typed, origin-correlated diagnostics; independent failures
are accumulated by the existing arbitrary-roster composition owner. The
call-local `BattleRuntimeSession` drives the protocol for one evaluation only;
no Oracle replay engine or durable product session is introduced.

## Published Document schemas

`@dnd/opaque-oracle` owns the three compact, deterministic Draft 2020-12
artifacts in [`publication/`](publication/): Case, Trace, and Evaluation Batch.
They are generated directly from the canonical structural Document schemas by
`pnpm generate:schemas` and checked with `pnpm check:schema-sync`. The sync
check rejects missing or orphan files, byte drift, wrong root metadata, invalid
JSON, and artifacts that an independent Ajv compiler cannot compile.

Draft 2020-12 validates the admitted JSON shape, but it cannot see duplicate
raw JSON member names and cannot express arbitrary correlations between
records, owners, checkpoints, and frontiers. The raw scanner therefore owns
duplicate member detection, while semantic admission owns those correlations;
neither concern is presented as schema parity.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the package ownership boundary and
the selected-build identity exception.

## Packaged executable

The package has one source-free executable root and one immutable application
composition. Build and verify it with:

```sh
pnpm --filter @dnd/opaque-oracle build
pnpm --filter @dnd/opaque-oracle check-distribution
```

The resulting `dist/` contains `oracle.mjs`, the three committed publication
schemas, the strict startup projection, and `oracle-identity.json`. The
identity is the SHA-256 value of named, length-framed executable/schema/
projection bytes; metadata itself is not hashed. Runtime startup verifies all
of those bytes and constructs Unit/Stat Block services from the parsed
projection before exposing any command:

```sh
dist/oracle.mjs identity
dist/oracle.mjs stream < requests.ndjson
dist/oracle.mjs serve --host 127.0.0.1 --port 0
```

`identity` emits one compact identity response. `stream` is persistent and
accepts arbitrary UTF-8 byte chunks separated by LF, including blank frames and
an unterminated final frame. Each accepted or rejected batch produces one
compact response and LF. A decode/domain rejection is normal response data;
an unexpected defect writes no response for that frame and exits nonzero.
`serve` binds only numeric IPv4 loopback, writes one compact JSON readiness
value containing the actual port, and serves the same application through
`GET /oracle/identity` and `POST /oracle/evaluations`. Evaluated batches return
200, decode rejection returns 400, and an unexpected evaluator defect returns
an atomic 500 defect envelope; workflow rejection remains an evaluated Trace.
The server closes on SIGINT or SIGTERM. Request bodies are bounded and
request-local; no Cases or reducer state persist between requests. The
executable resolves assets beside itself, so it remains usable from an
unrelated working directory without network access or workspace dependencies.
The optional build entrypoint override is a test-only injection seam for
atomic-defect tests; production command-line arguments cannot select it.

## Corpus CLI

The package-local `oracle` CLI exposes three Effect commands:

```sh
pnpm --filter @dnd/opaque-oracle generate:corpus
pnpm --filter @dnd/opaque-oracle check:corpus
pnpm --filter @dnd/opaque-oracle write:corpus
```

`generate:corpus` validates the generated bytes against all committed
publication schemas and the live evaluator, then writes the artifact only to
stdout. `check:corpus` reads the package-local
`corpus/oracle-evaluation-corpus.json`, rejects duplicate raw JSON members,
performs structural and semantic admission, independently validates the
Batch, every Case, and every Trace with Draft 2020-12 Ajv, and compares both
the live traces and exact canonical bytes. Neither command mutates the
filesystem.

`write:corpus` performs the same complete validation before creating the
target directory, writing a same-directory temporary file, renaming it over
the target, and cleaning up the temporary path. Override paths with
`--corpus` and `--publication-directory` when embedding the CLI or testing
filesystem behavior.
