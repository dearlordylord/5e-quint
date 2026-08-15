# Raw-swarm performance, token cost, and deterministic randomness

Research date: 2026-08-14. This report separates measured facts from design
hypotheses. The representative execution is
`generated-battle-004`, whose transcript header records Git revision
`7dd52785b947159092ed2cdd7895e5b428000ee4` and whose exact transcript hash is
`69f30fb4f34155aa95845c141f303e65c78743a4814a5623700950cc2d1a9bad`.

## Conclusion

The dominant structural cost was carrying and repeatedly presenting large
execution projections, not SQLite's WAL mode and not the number of SDK calls
alone. Issue #282 implements a three-tier evidence boundary:

1. Keep the complete, append-only SDK JSONL as the authoritative replay
   artifact.
2. Derive a hash-linked compact audit (call sequence, operation, input,
   session hashes and deltas, result hash, and review-relevant projection).
3. Give the player and reviewer small, role-specific digests. Keep the raw
   record addressable by sequence for drill-down, but do not put the whole
   transcript or an entire `discoverBattleActs` result in every model context.

This is a projection, not a second source of truth. The raw transcript hash,
SDK revision, canonical result hashes, and exact-sequence extraction path must
remain sufficient to regenerate and challenge every compact fact. The current
raw-swarm README now states the same boundary: the canonical transcript is
authoritative, while reviewers receive a compact projection first
([README.md:368-375](../../scripts/raw-swarm/README.md#L368-L375)).

New generation, authoring, player, and review launches write a typed invocation
ledger from first-party JSON events. Missing usage is explicitly unavailable,
not zero. New player runs also separate continuation typecheck, prefix replay,
SDK execution, and evidence-write time. The retained baseline predates those
ledgers, so its aggregate `tokens used` footer is reported but is not silently
treated as directly comparable.

## What was measured

### Latest direct-SDK run

The files below are retained under
[`generated-battle-004-sdk-player`](../../scripts/raw-swarm/out/generated-battle-004-sdk-player/).

| Artifact                   |                                                                                 Measured value | Interpretation                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------: | ---------------------------------------------------------------------------------------------------------- |
| Canonical SDK transcript   |                                                            38,232,957 bytes; 141 JSONL records | One header plus 140 calls; 139 returned and 1 threw                                                        |
| Continuations              |                                                                                             88 | One player observation/continuation round-trip per line in `observations.jsonl`                            |
| Transcript payload fields  | input sessions 13,439,895 bytes; output sessions 13,344,405; results 10,848,368; inputs 39,918 | Full session state is serialized on both sides of almost every call                                        |
| Observations               |                                                                    3,137,666 bytes; 88 records | Largest observation is about 400 KB                                                                        |
| Frozen authored program    |                                                                      80,592 bytes; 1,864 lines | The append-only program is much smaller than the call stream                                               |
| Captured replay supervisor |                                                                                6,536,827 bytes | A generated replay bundle is another large retained artifact, but it is not model context by itself        |
| Player log                 |                                              1,781,950 bytes; CLI footer `tokens used` 449,970 | Aggregate only; no usage breakdown                                                                         |
| Review result              |                                                                      10,708 bytes; 14 verdicts | The structured review is small                                                                             |
| Review log                 |                                           15,118,708 bytes; CLI footer `tokens used` 1,526,452 | The unstructured command/tool scrollback is larger than the player log and far larger than the review JSON |

The run directory is 49,804,849 bytes. The review launcher feeds the
transcript path and retained artifacts to one Luna `codex exec` invocation, but
redirects all formatted stdout/stderr to the retained review log
([`run-raw-review.sh:17-25`](../../scripts/raw-swarm/run-raw-review.sh#L17-L25)).
The review prompt explicitly asks for the retained program, observations,
final outcome, and agent summary, then asks the reviewer to reconstruct and
falsify the canonical calls
([`sdk-player.prompt.txt:1-19`](../../scripts/raw-swarm/reviews/sdk-player.prompt.txt#L1-L19)).
That is good evidence discipline, but it creates a clear opportunity to make
the first context projection compact and to retain command scrollback only for
diagnostics.

The implemented operation-specific compact audit is 146,677 bytes for the same
141 records, or 0.38% of the 38,232,957-byte authoritative transcript. It keeps
canonical inputs, hashes, existing error discriminants, and bounded relation,
act-frontier, hole, damage, and movement facts; it embeds no full session,
snapshot, or result. Reprojecting the 140 calls into 88 semantic player turns
produces 149,269 bytes, 21.02 times smaller than the retained 3,137,666-byte
observation stream. The largest turn is 15,262 bytes, below the 32-KiB cap.
The fixed-program audit checks 20 direct cross-continuation frontier reuses and
all 15 subject-continuation phase references; its two full-session references
only copied data into the obsolete arbitrary observation and were not tactical
inputs.

### SQLite report store

The current database is
[`player-swarm.db`](../../scripts/raw-swarm/out/player-swarm.db). Read-only
inspection found:

| Fact                                             |                                          Value |
| ------------------------------------------------ | ---------------------------------------------: |
| Runs / steps / review rounds / verdicts / issues |                           5 / 382 / 5 / 47 / 1 |
| Database file                                    | 229,924,864 bytes; 56,134 pages at 4,096 bytes |
| `steps.args` + `steps.response` payload          |                              210,647,494 bytes |
| Run 6 (`generated-battle-004`) step rows         |             140 rows; 38,107,978 payload bytes |
| Run 6 raw transcript                             |                               38,232,957 bytes |
| Verdict evidence text                            |                          25,261 bytes in total |
| `freelist_count`                                 |                                    4,565 pages |
| Sidecars after clean close                       |            `-wal` 0 bytes; `-shm` 32,768 bytes |

The run-6 database payload was approximately the same size as the raw
transcript because the former [`report.ts`](../../scripts/raw-swarm/report.ts)
mapped each SDK call into a step containing the full input session, and a
response containing the full output session and result. The database has no
explicit `steps(runId, seq)` or foreign-key indexes; the only non-rowid index
is the automatic primary-key index for `issues.fingerprint`. This is a
storage-layout problem before it is a WAL tuning problem.

The rebuilt artifact index is 2.1 MB. It preserves all 5 runs, 382 calls, 5
reviews, 47 verdicts, 1 issue, and the existing GitHub link. The two overwritten
shared run paths and two overwritten review paths were recovered from their
exact run-specific artifacts; none of the ten legacy run/review references is
database-only. Fixed-run searchable call metadata and typed review facts total
81,779 bytes, or 0.215% of the former 38,107,978-byte step payload. A verified
portable export contains the consistent index snapshot and every referenced
hash-linked transcript, review, replay supervisor, scenario, authored program,
character/setup, prefix, and final artifact. The 230-MB legacy database remains
untouched until final replacement verification.

## Where the repeated work comes from

The direct-SDK shape is sound for auditability, but its current cost centers
are visible in the harness:

- [`supervisor-cli.ts`](../../scripts/raw-swarm/sdk-player/supervisor-cli.ts)
  still typechecks each submitted continuation and verifies every prior call
  before executing the new suffix. New timing records make that replay cost
  measurable. A captured full 140-call replay takes roughly 3.4–3.7 seconds,
  but the cache gate is cumulative replay of a fresh run and at least 10% of
  non-model supervisor time; no cache is admitted before both thresholds pass.
- [`player-client.ts`](../../scripts/raw-swarm/sdk-player/player-client.ts)
  still sends real ordinary `attempt.ts` source, but `OBSERVATION.json` now
  contains only the supervisor's bounded semantic turn projection and the
  player's capped tactical note. Complete sessions and results remain solely in
  the canonical transcript.
- The post-play reviewer receives the compact all-call audit first and can
  extract exact raw sequence records through a hash-checking operation. Codex
  JSON events and the typed invocation ledger replace formatted scrollback as
  the usage authority; an agent log remains diagnostic evidence.

The current continuation protocol already supplies a useful integrity seam:
the supervisor freezes the first observable continuation and checks the
append-only program prefix ([`README.md:282-303`](../../scripts/raw-swarm/README.md#L282-L303)).
That seam can support a checked replay cursor: validate the full prefix once,
cache the verified session and next sequence inside the long-lived supervisor,
and apply only the appended suffix on the next request. Retain periodic full
checkpoints and the append-only transcript so a restart still performs a full
verification. This should be benchmarked against the current replay-on-every-
request behavior; it must not turn an unverified cache into an authority.

## Recommended evidence and persistence layout

```text
authoritative SDK call stream (full JSONL, immutable, hash-linked)
  ├── compact audit (derived per-call hashes/deltas/projections)
  ├── random-access sequence index (offset, operation, continuation, hashes)
  ├── player decision digest (small, current decision only)
  ├── reviewer digest (claims and sequence references; raw drill-down)
  └── SQLite metadata (run/revision/hash/blob references; no large JSON rows)
```

The compact audit should retain, at minimum, run identity and raw transcript
hash; SDK/replay revision; sequence and continuation; operation; canonical
input and input-session hash; output-session hash; result hash; returned/throw
outcome; and a deterministic session delta. A result projection may omit
fields duplicated by the session, but every omitted fact needs a raw sequence
reference. Canonical map/set encoding and object-key ordering must match the
existing `jsonValue`/`canonicalJson` rules. JSON-path deltas should be
validated by replaying them against the corresponding input session and
checking the retained output hash. Consider full session checkpoints every
fixed number of calls for random access, with deltas between checkpoints; do
not replace the raw transcript with deltas alone.

SQLite should hold searchable metadata and immutable references, for example
run identity, sequence, operation, continuation, hashes, compressed-blob
digest, and byte offset. Store full JSONL, compact audit, and large review
debug logs as content-addressed compressed files outside the database. The
review row can retain the structured output and artifact digest. Add indexes
only for actual lookup patterns (`runId, seq`, operation, issue fingerprint)
after the rows are small; indexes cannot compensate for repeatedly storing
multi-megabyte JSON values.

SQLite WAL is still appropriate for the local report writer. SQLite documents
that WAL permits readers alongside a writer but still allows only one writer at
a time, and that the default autocheckpoint is about 1,000 pages (roughly 4
MB) ([WAL documentation](https://sqlite.org/wal.html)). Keep the `-wal` and
`-shm` files with the database while a connection is open or while copying a
live database; checkpoint deliberately after bulk ingestion when no reader is
holding a snapshot. Use `VACUUM`/`VACUUM INTO` only for an intentional compact
copy, not as the main fix. SQLite's [backup API](https://www.sqlite.org/backup.html)
is the relevant way to make a consistent snapshot while the database is in
use. The measured 230-MB file is overwhelmingly large row payload, so moving
those payloads out of SQLite is expected to help more than changing WAL
settings.

## Model invocation and context strategy

### Capture usage before optimizing

The installed player launcher starts one Sol `codex exec` process with
`--ephemeral` and the review launcher starts one Luna `codex exec` process;
scenario generation additionally starts separate ephemeral invocations for the
generator and each logically independent reviewer
([`generate-scenario.ts:46-112`](../../scripts/raw-swarm/generate-scenario.ts#L46-L112),
[`generate-scenario.ts:185-294`](../../scripts/raw-swarm/generate-scenario.ts#L185-L294)).
The official [Codex CLI reference](https://developers.openai.com/codex/cli/reference/)
says that `codex exec` is non-interactive, `--json` emits newline-delimited
events, `--output-last-message` writes the final response, and `--ephemeral`
does not persist session rollout files. The current launchers do not request
`--json`, so their retained logs are formatted scrollback rather than a stable
usage ledger.

The next run should add `--json` (while retaining
`--output-last-message`) and retain only a compact per-turn event projection:
thread/session id, model, reasoning effort, elapsed time, exit status, and
usage. Codex's first-party [`exec_events.rs`](https://github.com/openai/codex/blob/main/codex-rs/exec/src/exec_events.rs)
defines `turn.completed` usage fields for input tokens, cached input tokens,
cache-write input tokens, output tokens, and reasoning output tokens. That
will distinguish context growth from model reasoning and output. It also
allows a measured comparison of compact versus raw reviewer contexts; no
dollar estimate should be made from the current footer alone.

### One composite scenario review, separate report responsibilities

RAW, content availability, SDK capability, and artifact policy remain mandatory
and separately named report sections, but they do not require four model
invocations. Issue #282 deliberately composes them into one Luna/max review per
milestone; readiness remains a separate decision. The harness retains the exact
composite prompt, result, output schema, and invocation identity so a missing or
blurred responsibility is debuggable. This removes repeated scenario/context
loading without inventing an aggregate pass that could hide one failed section.

If session startup later remains material, the official
[app-server protocol README](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
provides persisted threads, `turn/start`, token usage, compaction, and paginated
reads. That is a deferred option, not part of the implemented optimization; it
needs a same-scenario benchmark before adoption.

The player already uses one long-lived `codex exec` process, so moving it to
app-server is not automatically a token saving. The likely win is explicit
turn boundaries, usage capture, bounded digests, and controlled compaction. A
long conversation can still bill repeated input even when state is retained:
the OpenAI [conversation-state guide](https://developers.openai.com/api/docs/guides/conversation-state)
documents continuation state, while the [compaction guide](https://developers.openai.com/api/docs/guides/compaction)
describes replacing an overgrown window with the returned compacted items.
App-server's compact-start operation is a practical equivalent at the Codex
thread boundary.

Place stable instructions, public SDK declarations, schemas, and reviewer
policy before dynamic scenario/audit data. Then append the compact digest and
only the requested raw sequence. OpenAI's [prompt-caching guide](https://developers.openai.com/api/docs/guides/prompt-caching)
requires exact stable prefixes for reuse and exposes `cached_tokens` and
`cache_write_tokens`; capture those counters rather than assuming cache hits.
Reasoning effort is also a real cost: reasoning tokens occupy context and are
billed as output ([reasoning guide](https://developers.openai.com/api/docs/guides/reasoning)).
Reducing redundant evidence can therefore lower both input context and the
amount of reasoning needed to find the relevant call, but that outcome remains
to be measured.

### Suggested review flow

1. A deterministic preflight reads the raw transcript once, verifies its exact
   byte hash, and emits compact audit JSONL plus a sequence/entity index.
2. The reviewer receives the compact audit, scenario/setup facts, and a small
   final-state digest. The prompt gives an exact command for extracting raw
   records by sequence; it does not ask the model to `cat` a 38-MB file.
3. If a claim needs deep evidence, the reviewer requests only those records.
   The harness records which sequences were supplied, preserving review
   provenance.
4. Retain structured review JSON and usage events by default. Retain the
   verbose review log compressed or on failure, linked by hash, instead of
   making it the normal reviewer context.

## Seeded randomness: future design

The installed dependency is Effect 3.21.5. Its local first-party source says
that `Random.make(seed)` hashes a seed to create a predictable pseudo-random
sequence ([`node_modules/effect/src/Random.ts:148-171`](../../node_modules/effect/src/Random.ts#L148-L171)).
The implementation constructs a mutable `PCGRandom` and implements
`nextIntBetween(min, max)` as `integer(max - min) + min`
([`internal/random.ts:22-50,90`](../../node_modules/effect/src/internal/random.ts#L22-L50));
the upper bound is therefore exclusive. The exact tagged source is also
available in the [Effect 3.21.5 repository](https://github.com/Effect-TS/effect/blob/effect%403.21.5/packages/effect/src/Random.ts)
and [internal implementation](https://github.com/Effect-TS/effect/blob/effect%403.21.5/packages/effect/src/internal/random.ts).

For future player dice, expose an explicit supervisor-owned draw operation,
not ambient `Math.random()` and not a hidden mutable cursor:

```text
draw = (runSeed, branchId, continuation, stableDrawId,
        distribution, algorithmVersion) -> integer
```

The supervisor should validate the draw id, allowed sides/distribution, and
uniqueness within its scope; derive the value from the complete key (or create
a fresh, pinned PRNG from that key); and retain the request, algorithm version,
seed hash, and returned value in the run evidence. A draw must be a named
semantic event such as `fighter-attack-1`, not “the next random number”. This
prevents an inserted retry or a different branch from shifting every later
roll. If Effect's PRNG is used, pin the exact Effect version and test vectors;
an application-owned stable hash/PRF is preferable when cross-version replay
is a requirement. The current WIP prototype at commit `91db5b994` uses a
fresh `Random.make(seed:continuation:draw)` for named die rolls, which is the
right shape for avoiding a hidden cursor, but it still needs draw retention,
duplicate-name rejection, algorithm/version metadata, and broader tests before
it can be the replay contract.

Seeded player rolls do not seed model generation. The model may choose a
different continuation, tool sequence, retry, or branch even when every named
die draw returns the same value. The generation campaign also uses host
`randomInt` to select candidates (`generate-scenario.ts:368-370`); that is a
separate generation concern, and discarded candidates are not runtime evidence.

### Why call replay is not source replay

The two operations prove different things:

- **Recorded-call replay** re-evaluates the admitted setup, then applies the
  exact operation and input sequence against the recorded SDK/replay revision,
  checking input-session, output-session, and result hashes. The direct replay
  command requires the clean recorded Git revision and checks scenario and
  supervisor hashes ([`replay-sdk-player.ts:18-51`](../../scripts/raw-swarm/replay-sdk-player.ts#L18-L51)).
  This proves that the concrete recorded interaction is reproducible.
- **Authored-source replay** executes the continuation TypeScript again. It
  can call a different operation, omit a call, retry, branch on a changed
  observation, or consume time, filesystem, network, process, model, or random
  inputs. A named seed can stabilize only the random values explicitly routed
  through that draw service; it cannot force the source to make the same calls.

Therefore the raw-swarm README's rule is correct: deterministic replay applies
to the canonical SDK call stream at its recorded revision, not arbitrary agent
source with uncontrolled inputs ([`README.md:294-303`](../../scripts/raw-swarm/README.md#L294-L303)).
Retain authored source and model logs for accountability and diagnosis, but
judge RAW execution against the canonical call stream and separately audited
random-draw records.

## Validation and residual risks

The fixed transcript gates the compact audit at 10%, the player projection at a
fivefold reduction, and indexed call facts at 10% of the former step payload.
The retained program is parsed to distinguish model-visible tactical reads from
canonical session transport and discarded full-observation copies. Exact
sequence drill-down binds transcript identity, record bytes, sequence,
operation, and outcome.

Controlled runs retain first-party invocation ledgers and supervisor phase
timings. Whole-path comparison checks scenario/model identity and reports tokens
per invocation, continuation, and call. Legacy footer totals are explicitly
incomparable to JSON event counters; the harness does not claim the 50% player
or 60% reviewer token gates until a comparable fixed-protocol baseline exists.
Wall time remains comparable only when the same scenario identity and complete
path duration are retained.

The fixed 88-prefix benchmark measured 430,212 ms of cumulative replay, so the
60-second cache gate is met. Cache admission remains deferred until the fresh
controlled run proves replay is also at least 10% of non-model supervisor time;
the retained baseline predates phase timing evidence. App-server reuse,
compression, and seeded model decisions remain deferred rather than being
mixed into this change.

## Decisions retained after design review

The accepted smallest boundary uses two derived projections. A validated
all-call compact audit serves reviewers, while a separate semantic current-turn
projection serves the player. The player projection contains bounded act and
hole facts plus materially changed entities; it does not contain generic JSON
patches or complete SDK results. A byte-capped tactical note can preserve player
reasoning but is not evidence. Exact raw transcript records remain available to
reviewers through a hash-checking sequence extractor.

The following alternatives are deliberately preserved for later evaluation:

- **Deferred:** generic JSON session patches in the reviewer audit, pending
  coverage for arrays, encoded maps and sets, root replacement, malformed paths,
  and reconstruction against the retained output hash.
- **Deferred:** live player-side `inspectCall` served by the supervisor. The
  first version uses bounded actionable facts during play and offline exact-call
  extraction during review. Reconsider a live read-only request only if measured
  player evidence shows the bounded projection is insufficient.
- **Deferred:** a more detailed error taxonomy. The first version retains
  existing canonical discriminants and sequence references.
- **Rejected for the current design:** one shared digest for player and reviewer,
  because they have different questions and information needs.
- **Rejected for the current design:** embedding full sessions, full discovery
  payloads, or complete operation results in every player turn projection.
- **Rejected:** treating player-authored observations or tactical notes as
  execution authority, or allowing an inspection path to mutate state, replay
  calls, or bypass transcript validation.

## Primary source map

Repository sources inspected:

- [`scripts/raw-swarm/README.md`](../../scripts/raw-swarm/README.md),
  [`run-sdk-player.ts`](../../scripts/raw-swarm/run-sdk-player.ts),
  [`supervisor-cli.ts`](../../scripts/raw-swarm/sdk-player/supervisor-cli.ts),
  [`player-client.ts`](../../scripts/raw-swarm/sdk-player/player-client.ts),
  [`replay-sdk-player.ts`](../../scripts/raw-swarm/replay-sdk-player.ts), and
  [`report.ts`](../../scripts/raw-swarm/report.ts).
- The retained run artifacts linked above and the concurrent compact-audit
  experiment [`sdk-audit.ts`](../../scripts/raw-swarm/sdk-player/sdk-audit.ts).
- Installed Effect 3.21.5 source at
  [`Random.ts`](../../node_modules/effect/src/Random.ts) and
  [`internal/random.ts`](../../node_modules/effect/src/internal/random.ts).

First-party external sources:

- [Codex CLI developer command reference](https://developers.openai.com/codex/cli/reference/)
  and [Codex app-server protocol](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md).
- [Codex `exec` event usage source](https://github.com/openai/codex/blob/main/codex-rs/exec/src/exec_events.rs).
- OpenAI [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching),
  [conversation state](https://developers.openai.com/api/docs/guides/conversation-state),
  [compaction](https://developers.openai.com/api/docs/guides/compaction), and
  [reasoning](https://developers.openai.com/api/docs/guides/reasoning) guides.
- Effect [3.21.5 `Random.ts`](https://github.com/Effect-TS/effect/blob/effect%403.21.5/packages/effect/src/Random.ts)
  and [internal random implementation](https://github.com/Effect-TS/effect/blob/effect%403.21.5/packages/effect/src/internal/random.ts).
- SQLite [WAL](https://sqlite.org/wal.html), [pragmas](https://sqlite.org/pragma.html),
  and [backup API](https://www.sqlite.org/backup.html) documentation.

No tests or broad verification commands were run for this research-only report.
