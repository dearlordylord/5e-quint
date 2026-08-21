# Raw-swarm performance, token cost, and deterministic randomness

Research date: 2026-08-14. This report separates measured facts from design
hypotheses. The representative execution is
`generated-battle-004`, whose transcript header records Git revision
`7dd52785b947159092ed2cdd7895e5b428000ee4` and whose exact transcript hash is
`69f30fb4f34155aa95845c141f303e65c78743a4814a5623700950cc2d1a9bad`.

Identity note: every `generated-battle-*` label in this historical report is
the identity of a retained historical artifact set. It is not a current
`Scenario` id, an admitted Scenario, or a current `Execution`/Run identity;
the labels remain only to preserve traceability to the cited evidence.

## Conclusion

The dominant structural cost was carrying and repeatedly presenting large
execution projections, not SQLite's WAL mode and not the number of SDK calls
alone. Issue #282 implements a three-tier evidence boundary:

1. Keep the complete, append-only SDK JSONL as the authoritative replay
   artifact.
2. Derive a hash-linked audit (call sequence, operation, input,
   session hashes, result hash, and review-relevant typed facts).
3. Give the player and reviewer bounded, role-specific projections. Keep the raw
   record addressable by sequence for drill-down, but do not put the whole
   transcript or an entire `discoverBattleActs` result in every model context.

This is a projection, not a second source of truth. The raw transcript hash,
SDK revision, canonical result hashes, and exact-sequence extraction path must
remain sufficient to regenerate and challenge every derived fact. The current
raw-swarm README now states the same boundary: the canonical transcript is
authoritative, while reviewers receive a bounded projection first
([OPERATIONS.md:368-375](../../scripts/raw-swarm/OPERATIONS.md#L368-L375)).

New generation, authoring, player, and review launches write a typed invocation
ledger from first-party JSON events. Missing usage is explicitly unavailable,
not zero. New player runs also separate continuation typecheck, prefix replay,
SDK execution, and evidence-write time. The retained baseline predates those
ledgers, so its aggregate `tokens used` footer is reported but is not silently
treated as directly comparable.

The complete controlled comparison has now selected the issue's simplification
path. Against a clean same-scenario player baseline, the frontier-specific
declaration-help candidate used 118.98% more input-plus-output tokens and took
123.67% more wall time. The bounded player observation remains useful and is
retained, but the frontier-specific declaration/type-help publication and hash
protocol did not demonstrate whole-path value and are removed. Transcript,
audit, replay, invocation telemetry, SQLite indexing, and portable export remain
because their integrity and payload benefits were independently demonstrated.

## Engineering-cost and outcome report

This section records the approximately twelve-hour implementation period
reported by the user on 2026-08-18. Repository evidence directly timestamps an
8-hour-51-minute interval from the first retained failed packet run at 17:53 to
the accepted player gate at 02:44 local time. The first issue implementation
commit was recorded at 18:58. The remaining observed time included design,
discussion, review, and work before the first retained artifact, but those
activities did not have a phase ledger. They cannot be allocated more exactly
without inventing precision. That missing engineering-time ledger is itself a
process defect.

| Evidence window                                                   | Wall interval | What it contains                                                                              |
| ----------------------------------------------------------------- | ------------: | --------------------------------------------------------------------------------------------- |
| First retained packet experiment to first implementation commit   |          1h05 | Packet/reviewer experiments and integration before the first commit                           |
| First implementation commit to final evidence-pipeline checkpoint |          4h23 | Audit, telemetry, reviewer, comparison, SQLite/export, and verification work                  |
| Player optimization checkpoint series                             |          3h24 | Independent invocation, fill declarations, actionable frontier, three token gates, and review |
| User-observed remainder without a phase ledger                    |    about 3h09 | Earlier design/discussion/review and other work that cannot be allocated exactly              |

The rows are wall-clock intervals and may include waiting or concurrent work;
they are not summed CPU time.

### Code and elapsed optimization cost

Two code-size views are relevant and must not be conflated. Against the
pre-feature merge base `d02f45b86`, the maintained tree at the accepted
`f41796bb` gate changed 71 files: 16,597 added and 1,859 deleted lines. Of
those, 10,863 added/631 deleted lines are production or tooling code, 4,948/1,195
are tests, and 786/33 are documentation. The smaller two-dot comparison from
the already-implemented side-branch checkpoint `4e7a80a2` to `f41796bb`
changed 66 files with 9,192 additions and 2,032 deletions. That second number
measures replacement of an existing prototype; it is not the current #282
maintenance footprint. These are net range statistics, not sums that
double-count later rewrites.

The player-token optimization phase alone spans `a3fff39c` at 23:20 through
`f41796bb` at 02:44: a 3-hour-24-minute commit window. Its final range changes
28 files with 2,586 additions and 543 deletions: 1,297/102 production lines,
1,165/420 test lines, and 124/21 documentation lines. That is substantial
harness complexity, not a small implementation cost.

| Iteration                                                       | Commit change | Checkpoint interval |                  Code churn |                                          Three-invocation result |
| --------------------------------------------------------------- | ------------- | ------------------: | --------------------------: | ---------------------------------------------------------------: |
| Fresh invocation per continuation                               | `e4b638c3`    |                1h33 | +1,307/-499 across 14 files | 234,293 mean input tokens; 4.24% worse than the 224,757 baseline |
| Hash-linked fill declaration help                               | `5fdc7ad0`    |                1h08 |    +816/-14 across 10 files |                                    184,077 mean; 18.1% reduction |
| Pre-call actionable frontier and frontier-specific declarations | `b8ad06ed`    |                0h35 |    +464/-41 across 19 files |                                   137,402 mean; 38.87% reduction |
| Measurement record                                              | `f41796bb`    |                0h07 |     +10 documentation lines |                             Records the user-accepted short gate |

Checkpoint intervals run from the previous listed commit to the named commit;
they include implementation, tests, review, and waiting and are not claims of
exclusive typing time.

The three short player experiments used 555,028 ms (9.25 minutes) of measured
model time. The broader retained model ledger contains at least 19,956,411
known input tokens and 1.95 hours of model runtime during the implementation
window; two review invocations have unavailable usage and are excluded.
Most elapsed engineering time was therefore implementation, diagnosis,
verification, evidence handling, and review rather than the short player model
measurements themselves.

The agent-goal ledger is a separate cost population from those harness model
invocations. At the stringency review checkpoint it recorded 7,171,742 agent
tokens and 45,247 seconds (about 12 hours 34 minutes). At the final
simplification checkpoint it records 10,305,698 agent tokens and 66,771 seconds
(about 18 hours 33 minutes) for the #282 objective. Neither total should be
added to the harness invocation total: the goal ledger measures the engineering
agent, while the retained invocation ledger measures models run by the harness.
Both are required to describe the work's token cost honestly.

### Realized benefits

- The operation-specific reviewer audit is 146,727 bytes, 0.384% of the
  38,232,957-byte transcript, while retaining exact call-sequence provenance.
- The fixed transcript reprojects to 185,273 bytes of player turns, 16.94 times
  smaller than the 3,137,666-byte retained observations; the largest turn is
  19,373 bytes under the 32-KiB cap. The increase from the earlier measurement
  is the cost of retaining canonical hole payloads and every actionable
  character/stat-block resource variant rather than projecting an incomplete
  parallel shape.
- Searchable fixed-run SQLite call facts are 81,779 bytes, 0.215% of the former
  38,107,978-byte duplicated step payload. The rebuilt searchable index is
  503,808 bytes rather than the 229,924,864-byte legacy database.
- Typed invocation ledgers distinguish unavailable usage from zero and retain
  input, cached input, cache-write, output, reasoning, elapsed-time, model, and
  exit facts. Supervisor timing separates typecheck, prior-call replay, new SDK
  work, and evidence writing.
- One bounded reviewer packet plus exact-sequence extraction reproduced,
  rejected, or superseded all fourteen baseline verdicts instead of silently
  losing claims. The fixed packet reviewer used 254,130 input tokens; the first
  command-heavy attempt had used 10,758,512.
- The player still authors and executes an ordinary typed continuation against
  the real public SDK. Initial and later projections are transcript-bound and
  replay-verified rather than becoming another execution authority.
- Legacy inventory, immutable artifact recovery, portable export, and hash
  verification are implemented. No replay cache was added before its two-part
  admission evidence was available.

### Complete controlled comparison of the declaration-help experiment

The pre-removal declaration-help experiment and baseline used byte-identical
generated-battle-004 scenario prose, scenario review, characters, and setup.
Both players completed the battle and replayed deterministically. The experiment
is pinned to Git revision `2495806ed`; these measurements justify removing its
player-facing type-help protocol and are not measurements of the resulting
simplified code.

| Player measure            | Comparable baseline | Declaration-help experiment | Reduction |
| ------------------------- | ------------------: | --------------------------: | --------: |
| Input + output tokens     |           8,040,127 |                  17,606,310 |  -118.98% |
| Wall time                 |          497,049 ms |                1,111,766 ms |  -123.67% |
| Tokens per continuation   |        229,718 (35) |                382,746 (46) |   -66.62% |
| Tokens per canonical call |         94,590 (85) |                217,362 (81) |  -129.79% |
| Uncached input + output   |             208,575 |                     298,662 |   -43.19% |

The baseline evidence is
`generated-battle-004-controlled-282-legacy-baseline-1-sdk-player`; the final
experiment is `generated-battle-004-controlled-282-final-6-sdk-player`. Its
transcript is 21,741,533 bytes and contains 46 continuations. Its supervisor
spent about 46.9 seconds outside the model: 17.6 seconds on
continuation typechecking, 28.6 seconds on prior-call replay, 0.43 seconds on
new SDK execution, and 0.26 seconds writing evidence. Replay therefore did not
meet the issue's 60-second cache threshold, so no replay cache was admitted.

The comparable fixed packet reviewer baseline used 321,326 input-plus-output
tokens and 1,216,960 ms. The declaration-help experiment used 264,891 tokens
and 1,103,884 ms: reductions of 17.56% and 9.29%, respectively, both below the
required 50%.
A direct attempt to construct a new reviewer packet from the legacy player
transcript failed closed before model invocation because the packet would have
been 1,027,142 bytes, above the 921,600-byte cap. The cap was not raised and no
new compaction mechanism was added.

The final run also demonstrated why the retained evidence machinery matters.
Independent review confirmed two Battle Runtime defects and one SDK contract
defect, now tracked as GitHub issues #284, #285, and #286. It rejected an
incorrect review claim about spell spatial facts and separated a player-invalid
loadout from engine defects. These results support retaining the transcript,
bounded audit, exact-sequence extraction, replay, and searchable index; they do
not support retaining the failed player type-help experiment.

### Drawbacks and resolved decision points

- The earlier 38.87% three-invocation improvement did not generalize to the
  complete path. It was diagnostic evidence only and is superseded by the
  controlled comparison above.
- The first invocation remains a 273,200-token outlier. Later invocations were
  approximately 69,500 tokens. Its extra exploration included rereading the
  frontier, a failed `jq` command, an unnecessary fill-help query already
  represented in the frontier file, a failed `npx tsc`, and a 17.9-KiB compiler
  error. The harness reduction does not prevent this behavioral variance.
- The measured player trials used the explicitly recorded
  `instructionalFallback` isolation because the consumer permission profile was
  unavailable. The player received only the scratch distribution by contract,
  but filesystem isolation was not technically enforced. This weakens the
  cleanroom boundary even though it does not change the recorded SDK calls.
- The first controlled player used 6,742,713 input tokens over 30
  continuations and stopped on an unsupported object-target frontier. It is not
  a complete comparison and cannot validate the newer independent-invocation
  behavior.
- Historical milestone and final-pre-play composite-review inputs were not
  retained. Exact replay of those baseline phases is impossible without
  fabricating provenance; newly authored control envelopes must be labeled as
  such.
- Exact historical milestone and final-pre-play review envelopes remain
  unavailable, so no saving is claimed for those phases. The player and fixed
  packet-review comparisons above are comparable and both fail their gates.
- Moving full payloads out of SQLite improves the searchable index, but does
  not erase artifact storage. The current portable export is about 472 MB, the
  controlled player is about 23 MB, and retained failed experiments add about
  210 MB. The 230-MB legacy database is deliberately still retained.
- The optimization introduced 1,297 added/102 deleted production/tooling lines
  and 1,165 added/420 deleted test lines before a complete run proved the
  economic outcome. That ordering was too expensive: a smaller executable
  spike and three-invocation gate should
  have preceded the generalized artifact/type-help implementation.
- The first reliability review found that the candidate conflated character and
  stat-block resource pools and dropped kind-specific hole payloads such as
  `statBlockRechargeRoll.rechargeTargets`. The repaired projection now decodes
  each canonical resource variant, retains the complete canonical `BattleHole`,
  and fails closed on malformed or unadmitted shapes. This repair increased the
  fixed player projection by 36,707 bytes while preserving a 16.94-times
  reduction and the 32-KiB per-turn cap.
- Earlier issue comments contain slightly stale derived-byte figures. The
  checked `generated-battle-004-fixed-measurement.json` values above supersede
  them.

### Effect of unrelated local modifications

Unrelated local changes were materially troublesome but did not contaminate
the commits or measurements. The uncommitted `attack-main.ts` work removed 145
lines and added 9, leaving the normal SDK typecheck with unresolved production
errors. This forced repeated synchronization into clean linked worktrees for
honest typecheck, integration, and token trials. It added setup and diagnostic
work and created drift risk; six issue-282 linked worktrees remain as evidence
or verification environments. There is no trustworthy timer for that overhead.

The two unrelated research-document edits and `apply-test.txt` did not affect
execution or measurements. They required explicit staging exclusions and thus
added a smaller accidental-commit risk. All #282 commits staged explicit file
lists, and the controlled trials ran from clean detached commits, so none of
those unrelated modifications entered the measured artifacts.

### Economic assessment and retained design

Twelve hours would be unreasonable if the result were only a 38.87% player
token reduction. The work also delivered order-of-magnitude audit,
observation, and index-payload reductions plus integrity, telemetry, export,
and verdict-mapping capabilities required by the issue. Those evidence
boundaries should remain: removing them would trade away measured integrity and
payload improvements rather than merely deleting optimization code.

The player-optimization phase was overbuilt relative to the evidence: 3 hours
24 minutes and 2,586 added lines preceded a short result that reversed on the
complete run. The appropriate middle ground is now evidence-based rather than
aspirational:

1. retain the complete transcript as authority and the bounded, hash-linked
   player/reviewer/index projections whose reliability or payload benefit was
   demonstrated;
2. retain the persistent player invocation and real public-SDK execution, but
   let TypeScript declarations serve compilation rather than publishing a
   second frontier-specific model-help protocol;
3. remove frontier fill-type artifacts, publication hashes, and their protocol
   and test surface;
4. add no replay cache, generic compaction, or replacement context layer.

This accepts the measured negative performance result instead of defending sunk
cost. The simplification was then verified and its maintenance footprint
measured directly.

The simplification itself changes 11 files, adds 22 lines, and deletes 1,137
lines (net -1,115). It deletes the two frontier/type-help implementations and
their tests rather than leaving unused compatibility machinery. Because the
unrelated #227 branch was merged into `master` during #282, a raw
pre-feature-to-HEAD diff would incorrectly attribute that branch to this work.
Using the union of files changed by #282 before that merge and the explicit
#282 follow-up commits after it, while excluding the user's unrelated dirty
research files, the final maintained upper-bound view is 72 files with 18,380
added and 1,991 deleted lines: 10,820/752 production or tooling, 6,483/1,193
tests, and 1,077/46 documentation. This union can still include changes made by
#227 to the same files, so it is intentionally reported as an upper bound, not
as exact authorship. The exact simplification delta above is unaffected by that
history.

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
the first context projection bounded and to retain command scrollback only for
diagnostics.

The implemented operation-specific audit is 146,677 bytes for the same
141 records, or 0.38% of the 38,232,957-byte authoritative transcript. It keeps
canonical inputs, hashes, existing error discriminants, and bounded relation,
act-frontier, hole, damage, and movement facts; it embeds no full session,
snapshot, or result. Reprojecting the 140 calls into 88 semantic player turns
produces 148,566 bytes, 21.12 times smaller than the retained 3,137,666-byte
observation stream. The largest turn is 15,262 bytes, below the 32-KiB cap.
The fixed-program audit checks 20 direct cross-continuation frontier reuses and
all 15 subject-continuation phase references; its two full-session references
only copied data into the obsolete arbitrary observation and were not tactical
inputs.

### SQLite report store

The retained pre-rebuild database is
[`player-swarm-legacy.db`](../../scripts/raw-swarm/out/player-swarm-legacy.db).
Read-only inspection found:

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

The rebuilt working index is 503,808 bytes. It currently contains 6 runs, 436
calls, 6 reviews, 62 verdicts, 5 issues, and 48 run-artifact references after
the controlled issue-282 evidence was ingested. Its legacy rebuild checkpoint
matched all 5 runs, 382 calls, 5 reviews, 47 verdicts, and 1 issue from the
original database before the new evidence was added. The two overwritten shared
run paths and two overwritten review paths were recovered from their exact
run-specific artifacts; none of the ten legacy run/review references is
database-only. Fixed-run searchable call metadata and typed review facts total
81,779 bytes, or 0.215% of the former 38,107,978-byte step payload. A verified
portable export contains the consistent index snapshot and every referenced
hash-linked transcript, review, replay supervisor, scenario, authored program,
character/setup, prefix, and final artifact. The 229,924,864-byte legacy
database remains untouched until final replacement verification.

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
- The post-play reviewer receives the all-call audit first and can
  extract exact raw sequence records through a hash-checking operation. Codex
  JSON events and the typed invocation ledger replace formatted scrollback as
  the usage authority; an agent log remains diagnostic evidence.

The current continuation protocol already supplies a useful integrity seam:
the supervisor freezes the first observable continuation and checks the
append-only program prefix ([`OPERATIONS.md:282-303`](../../scripts/raw-swarm/OPERATIONS.md#L282-L303)).
That seam can support a checked replay cursor: validate the full prefix once,
cache the verified session and next sequence inside the long-lived supervisor,
and apply only the appended suffix on the next request. Retain periodic full
checkpoints and the append-only transcript so a restart still performs a full
verification. This should be benchmarked against the current replay-on-every-
request behavior; it must not turn an unverified cache into an authority.

## Recommended evidence and persistence layout

```text
authoritative SDK call stream (full JSONL, immutable, hash-linked)
  ├── derived audit (per-call hashes/deltas/projections)
  ├── random-access sequence index (offset, operation, continuation, hashes)
  ├── player decision digest (small, current decision only)
  ├── reviewer digest (claims and sequence references; raw drill-down)
  └── SQLite metadata (run/revision/hash/blob references; no large JSON rows)
```

The derived audit should retain, at minimum, run identity and raw transcript
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
digest, and byte offset. Store full JSONL, derived audit, and large review
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
does not persist session rollout files. At the time of this measurement, the
launchers did not request `--json`, so their retained logs were formatted
scrollback rather than a stable usage ledger. The implemented launchers now
require `--json` while retaining `--output-last-message`, and retain a bounded
invocation ledger containing:
thread/session id, model, reasoning effort, elapsed time, exit status, and
usage. Codex's first-party [`exec_events.rs`](https://github.com/openai/codex/blob/main/codex-rs/exec/src/exec_events.rs)
defines `turn.completed` usage fields for input tokens, cached input tokens,
cache-write input tokens, output tokens, and reasoning output tokens. That
distinguishes context growth from model reasoning and output. It also
allows a measured comparison of packet-based versus direct-transcript reviewer contexts; no
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
policy before dynamic scenario/audit data. Then append the derived audit and
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
   byte hash, and emits derived audit JSONL plus a sequence/entity index.
2. The reviewer receives the derived audit, scenario/setup facts, and a small
   final-state digest. The prompt gives an exact command for extracting raw
   records by sequence; it does not ask the model to `cat` a 38-MB file.
3. If a claim needs deep evidence, the reviewer requests only those records.
   The harness records which sequences were supplied, preserving review
   provenance.
4. Retain structured review JSON and usage events by default. Retain the
   verbose review log compressed or on failure, linked by hash, instead of
   making it the normal reviewer context.

The implemented #282 flow makes the context boundary executable. A
deterministic packet contains the derived audit, bounded turn projections,
reviewable run artifacts, domain authorities, and only catalog passages whose
authored headings occur in those artifacts, alongside the generally cited
local rules files. The encoded packet is capped before invocation. The runner
then rejects commands and tools so the measurement remains one model turn.
Exact-sequence extraction is a separate retained operator drill-down. This
closes the measured failure mode in
which one Luna turn issued 142 repository commands, returned 2.79 MB of command
output, and accumulated 10.76 million input tokens despite starting from the
derived audit.

A subsequent packet experiment showed why extraction cannot remain an
invisible second turn. The reviewer emitted an interim claim, invoked one
extractor command, then lost its event stream to an idle timeout after 793,950
milliseconds. `codex exec` reported status 0 but produced no final review file.
The measured packet review therefore rejects every command or tool event and
validates the decoded output plus scenario, Git, and transcript identity before
success. An operator can retain extracted records and start another explicitly
measured review when drill-down is warranted.

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
source with uncontrolled inputs ([`OPERATIONS.md:294-303`](../../scripts/raw-swarm/OPERATIONS.md#L294-L303)).
Retain authored source and model logs for accountability and diagnosis, but
judge RAW execution against the canonical call stream and separately audited
random-draw records.

## Validation and residual risks

The fixed transcript gates the derived audit at 10%, the player projection at a
fivefold reduction, and indexed call facts at 10% of the former step payload.
The retained program is parsed to distinguish model-visible tactical reads from
canonical session transport and discarded full-observation copies. Exact
sequence drill-down binds transcript identity, record bytes, sequence,
operation, and outcome.

Controlled runs retain first-party invocation ledgers and supervisor phase
timings. Whole-path comparison checks scenario/model identity and reports tokens
per invocation, continuation, and call. The comparable player and fixed packet
review baselines now show that the declaration-help experiment failed the 60%
complete-path and 50% post-play-review gates. Historical footer totals remain
explicitly incomparable to JSON event counters and are not used to soften that
result. Wall time is compared only where scenario identity and complete path
duration are retained.

The first controlled player measurement used one model conversation for all 30
tactical continuations. Its 6,742,713 input tokens included 6,517,248 cached
input tokens, showing that the conversation repeatedly carried accumulated tool
history despite the bounded observation. That result motivated an
independent-invocation experiment. Strategy continuity passed only through the
bounded tactical note, latest observation, and retained ordinary TypeScript
source. This changed model-context transport, not SDK execution authority: the
append-only canonical call transcript and frozen program prefix remained the
same evidence owners.

The first three independent invocations used 56,481, 381,737, and 264,660
input tokens. The second and third invocations repeatedly searched the 5.7-MB
public declaration graph to reconstruct individual `BattleFill` branches, so
their 234,293-token mean did not improve on the comparable persistent-player
mean. That run was stopped before a fourth completed invocation and retained at
`scripts/raw-swarm/out/failed-independent-282-run-1` rather than being reported
as a successful comparison.

The correction kept the declaration graph as the type authority and generated
one hash-linked declaration record for each `BattleFill` discriminant, capped
at 80 KiB per record and 160 KiB across the trusted artifact. The current graph
produces 53 records totaling 144,070 bytes. An initial player-facing query
utility was removed after the player bypassed the intended bounded protocol and
read the full artifact. The trusted supervisor now renders only the declarations
required by the latest observed frontier, bound to the observation and
declaration-graph hashes. Player instructions require one coherent selected
subject to resolve downstream holes when facts are already available; otherwise
the next continuation rereads the newly published observation and frontier.

The next three-invocation gate at `5fdc7ad0f` used 257,425, 180,567, and
114,240 input tokens (184,077 mean) and 83.1, 70.9, and 50.5 seconds. That is
only an 18.1% mean reduction from the comparable 224,757-token continuation
baseline, so the runner was stopped before invocation four. Its evidence is
retained at
`scripts/raw-swarm/out/failed-independent-282-type-help-trial-2`.

The event stream showed that each fresh invocation reread about 29 KiB of
static player, scenario, package-architecture, observation, and program text.
The first invocation also had to call discovery before it could observe an
actionable act. The next correction therefore supplies the initial act frontier
from the supervisor before call 1, writes the observed frontier's exact fill
declarations before each model invocation, and removes the package architecture
README from the player input. These are context-boundary changes; the authored
continuation still calls the real public SDK and the transcript remains the
execution authority.

At `b8ad06edb`, the next controlled gate used 273,200, 69,502, and 69,503
input tokens for its first three invocations: a 137,402 mean and a 38.87%
reduction from the comparable 224,757-token continuation baseline. The first
invocation remained the outlier; later invocations held near 69.5k. The user
accepted this measured reduction on 2026-08-18 rather than requiring the
original 40% short-gate threshold. The interrupted gate evidence, including a
fourth completed invocation, is retained at
`scripts/raw-swarm/out/failed-independent-282-frontier-trial-3`; it is not a
complete-path result. The user then required a complete controlled comparison
rather than another short gate.
Six later independent invocations consumed 1,189,210 input tokens and 457.8
seconds before completion, already exceeding the retained complete-player
baseline of 449,970 tokens. The independent-invocation loop was therefore
removed rather than extended with another context protocol.

The later complete controlled run used one persistent player invocation. It
failed every normalized player-performance denominator, as recorded in the
complete comparison above. The frontier fill-type artifact and its publication
hash protocol were therefore removed. The retained player path now uses the
bounded trusted observation, supervisor-owned continuation limit, emitted
TypeScript declarations for compilation, and append-only evidence without a
second player-facing type-help product.

The complete run measured only 28,610 ms of prefix replay, below the 60-second
cache threshold. A replay cache is therefore rejected for this implementation.
App-server reuse, compression, and seeded model decisions remain separate work
rather than being mixed into this change.

## Decisions retained after design review

The accepted smallest boundary uses two derived projections. A validated
all-call derived audit serves reviewers, while a separate semantic current-turn
projection serves the player. The player projection contains bounded act and
hole facts plus materially changed entities; it does not contain generic JSON
patches or complete SDK results. A byte-capped tactical note can preserve player
reasoning but is not evidence. Exact raw transcript records remain available to
reviewers through a hash-checking sequence extractor.

Public fill authoring is checked by the emitted declaration graph and local
TypeScript compiler. No declaration-derived player document or query protocol
is retained: the complete comparison did not justify that additional context
and synchronization surface.

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
- The retained run artifacts linked above and the concurrent derived-audit
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

The final simplification was verified with the public Raw Swarm SDK-player gate:
TypeScript and 22 test files / 123 tests passed, including the external-consumer
distribution and deterministic transcript replay coverage. No additional
agent-player scenario was launched after simplification.
