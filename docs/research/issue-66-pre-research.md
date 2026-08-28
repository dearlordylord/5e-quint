# Issue #66 pre-research: prove packaged CLI/HTTP equivalence

> **Research evidence, not architecture or acceptance authority.** Stable
> structure belongs in [`ARCHITECTURE.md`](../../ARCHITECTURE.md) and the
> package architecture. The live issues own acceptance. This note records an
> implementation reading of those owners and may be deleted after the facts it
> discovers are promoted.

Research refreshed: 2026-08-28. Source checkout:
[`62bca64de7475e7780f2ee94dcab3131a73ea67a`](https://github.com/dearlordylord/5e-quint/commit/62bca64de7475e7780f2ee94dcab3131a73ea67a),
the integration merge of the #65 HTTP implementation.

## Executive finding

Issue [#66](https://github.com/dearlordylord/5e-quint/issues/66) is **partially
implemented, not obsolete**. The runtime already routes both packaged
evaluation modes through one immutable `OracleApplication` and its canonical
raw-JSON operation. Existing black-box tests separately prove substantial CLI
and HTTP behavior, but there is no one parameterized packaged-entrypoint suite
and no assertion that compares the decoded CLI and HTTP results for the same
inputs. The remaining increment is therefore test-only unless that new proof
finds a production defect
([application](../../packages/opaque-oracle/src/oracle-distribution.ts#L59),
[stream delegation](../../packages/opaque-oracle/src/oracle-stream.ts#L64),
[HTTP delegation](../../packages/opaque-oracle/src/oracle-http-internal.ts#L417),
[#66 acceptance](https://github.com/dearlordylord/5e-quint/issues/66)).

The highest seam is the already packaged `oracle.mjs`, staged once and invoked
from an unrelated directory with external networking denied. One test-local
scenario table should drive the same raw batch payload bytes through persistent
`stream` frames and sequential loopback HTTP requests, decode successful and
decode-rejected bodies with the existing `OracleBatchResponseSchema`, and
compare those canonical values. Defects have deliberately different transport
representations, so the shared assertion is atomic failure classification—not
invented wire equality: CLI exits nonzero with no response line, while HTTP
returns the exact 500 defect envelope with no Trace and remains usable
([accepted specification](https://github.com/dearlordylord/5e-quint/issues/12),
[Case/Trace decision](https://github.com/dearlordylord/5e-quint/issues/23#issuecomment-4964257912),
[process contract](../../packages/opaque-oracle/src/oracle-process-contract.ts#L96)).

Issue #66 requires no new production field, schema, export, evaluator, adapter
registry, distribution asset, or comparator API. Do not create one for the
test parameterization
([#66](https://github.com/dearlordylord/5e-quint/issues/66),
[package architecture](../../packages/opaque-oracle/ARCHITECTURE.md#application-composition-and-distribution)).

## Live issue and dependency status

- #66 is open, unassigned, has no comments, is labelled `ready-for-agent`, and
  is a child of non-runnable aggregate #33. Its one native blocker is open,
  assigned #65; #64 is transitive
  ([#66](https://github.com/dearlordylord/5e-quint/issues/66),
  [#33](https://github.com/dearlordylord/5e-quint/issues/33),
  [#65](https://github.com/dearlordylord/5e-quint/issues/65),
  [#64](https://github.com/dearlordylord/5e-quint/issues/64)).
- The checkout already contains the #64 executable and the #65 HTTP surface at
  merge `62bca64de`; this is code readiness, not tracker readiness. The native
  #65 edge remains open, so #66 remains formally blocked until #65 is closed.
  The live transitive chain continues through open #64 to open fixture-corpus
  #95 even though those implementations are also present in the integration
  history
  ([#65](https://github.com/dearlordylord/5e-quint/issues/65),
  [#64](https://github.com/dearlordylord/5e-quint/issues/64),
  [#95](https://github.com/dearlordylord/5e-quint/issues/95),
  [current commands](../../packages/opaque-oracle/src/oracle-bootstrap.ts#L20)).
- #66 natively blocks open #40. #40 is the later aggregate that packages the
  calibrated source-free Oracle with the Cleanroom Mechanics Slice and QNT
  calibration branches; completing #66 alone does not complete or unblock #40
  because #29 and #31 are separate blockers
  ([#40](https://github.com/dearlordylord/5e-quint/issues/40)).
- #33 owns only the CLI/HTTP delivery aggregate and closes after #64, #65, and
  #66 are integrated and closed. It is not another executable or test owner
  ([#33](https://github.com/dearlordylord/5e-quint/issues/33)).

No issue-tracker mutation belongs to this research note. The implementation
agent should not claim #66 while its native blocker remains open
([issue-tracker procedure](../agents/issue-tracker.md#wayfinding-operations)).

## Binding acceptance

The live #66 issue narrows the work to one parameterized black-box proof over
packaged public entrypoints. The promoted #12 specification supplies the
underlying Oracle laws; the closed #22 and #23 decisions explain their origin
without replacing #12 as the current acceptance owner
([#66](https://github.com/dearlordylord/5e-quint/issues/66),
[#12](https://github.com/dearlordylord/5e-quint/issues/12),
[#22 resolution](https://github.com/dearlordylord/5e-quint/issues/22#issuecomment-4963692153),
[#23 resolution](https://github.com/dearlordylord/5e-quint/issues/23#issuecomment-4964257912)).

The exact proof obligations are:

1. **One codec and canonical value.** Feed equivalent raw batch payload bytes
   to both modes; LF belongs only to stream framing. Normal results must decode
   as the same existing
   `OracleBatchResponse`: evaluated payloads correspond positionally and decode
   rejections contain the same complete, canonically ordered issues. HTTP 200
   or 400 is transport classification around that value
   ([#12 Opaque Oracle contract](https://github.com/dearlordylord/5e-quint/issues/12),
   [response algebra](../../packages/opaque-oracle/src/oracle-process-contract.ts#L96),
   [HTTP status projection](../../packages/opaque-oracle/src/oracle-http-internal.ts#L468)).
2. **Position and singleton decomposition.** A non-empty ordered multi-Case
   result equals the concatenation of each singleton result in both modes,
   including after an unrelated prior message in the same persistent process
   or listener
   ([#12](https://github.com/dearlordylord/5e-quint/issues/12),
   [historical algebra decision](https://github.com/dearlordylord/5e-quint/blob/e0bd11af0/plans/wayfinder/cleanroom-sdk/oracle-case-trace-algebra.md#portable-case-and-black-box-fixture-corpus)).
3. **No mutable Case leakage.** An A/B/A sequence returns equal values for the
   two A positions and a distinguishable value for B through both persistent
   modes. Only immutable application services may span requests
   ([#66](https://github.com/dearlordylord/5e-quint/issues/66),
   [corpus A/B/A owner](../../packages/opaque-oracle/src/oracle-evaluation-corpus-source.ts#L116),
   [application ownership](../../packages/opaque-oracle/ARCHITECTURE.md#application-composition-and-distribution)).
4. **Domain rejection remains evaluated.** Structurally valid Cases whose
   workflow rejects must produce equal Trace data. For HTTP that remains 200;
   it is not a decode or transport rejection
   ([#65](https://github.com/dearlordylord/5e-quint/issues/65),
   [README contract](../../packages/opaque-oracle/README.md#packaged-executable)).
5. **Whole-response defect atomicity.** An injected later-Case defect must
   expose no earlier Trace. CLI produces no response line, exits nonzero, and
   processes no later frame. HTTP returns only the exact defect envelope with
   status 500, exposes no Trace member or prefix, and the persistent listener
   can evaluate a later independent request
   ([#12](https://github.com/dearlordylord/5e-quint/issues/12),
   [test-only defect entry](../../packages/opaque-oracle/scripts/oracle-defect-test-entry.ts#L12),
   [defect schema](../../packages/opaque-oracle/src/oracle-process-contract.ts#L143),
   [packaged lifecycle contract](../../packages/opaque-oracle/README.md#packaged-executable)).
6. **Public packaging seam.** Every parity observation comes from the staged
   source-free executable's `stream`, `serve`, or identity entrypoint—not
   `evaluateOracleBatch`, `application.evaluateJson`, `runOracleStream`, or an
   internal HTTP handler
   ([#66](https://github.com/dearlordylord/5e-quint/issues/66),
   [distribution package entry](../../packages/opaque-oracle/package.json#L7)).
7. **No reusable Target machinery.** The proof may use package-local test
   functions, but it must not publish a comparator, harness, stored expected
   Trace substitute, transport-owned rules state, connector wrapper, or shadow
   reducer
   ([#66](https://github.com/dearlordylord/5e-quint/issues/66),
   [#12 Cleanroom boundary](https://github.com/dearlordylord/5e-quint/issues/12)).

## What #65 now supplies

The pre-#65 plan is stale as an implementation checklist. These facts already
exist and should be consumed rather than redesigned:

- `oracle-main.ts` and `runOracleProcess` are the one executable/bootstrap.
  Their exhaustive command algebra contains `identity`, `stream`, and `serve`;
  startup loads one application before dispatch
  ([command algebra](../../packages/opaque-oracle/src/oracle-bootstrap.ts#L20),
  [application load and dispatch](../../packages/opaque-oracle/src/oracle-bootstrap.ts#L108)).
- `OracleApplication` is loader-created, privately branded, immutable, and
  owns identity, parsed startup projection, evaluation services, and the
  canonical `evaluateJson` operation
  ([application](../../packages/opaque-oracle/src/oracle-distribution.ts#L59),
  [composition](../../packages/opaque-oracle/src/oracle-distribution.ts#L230)).
- `evaluateOracleBatchJson` is the one production raw-text operation. It decodes
  the full batch before evaluation and produces the existing
  evaluated/decode-rejected response union. The separate package-internal
  constructor and application replacement helper own the test-only evaluator
  injection
  ([public operation](../../packages/opaque-oracle/src/oracle-batch-operation.ts#L17),
  [internal operation constructor](../../packages/opaque-oracle/src/oracle-batch-operation-internal.ts#L18),
  [test application composition](../../packages/opaque-oracle/src/oracle-distribution.ts#L70)).
- Stream and HTTP both receive the same `OracleApplication` and call its
  `evaluateJson`. Neither owns a transport-specific evaluator
  ([stream](../../packages/opaque-oracle/src/oracle-stream.ts#L64),
  [HTTP](../../packages/opaque-oracle/src/oracle-http-internal.ts#L427)).
- `OracleBatchResponseSchema`, `OracleIdentityResponseSchema`, and the HTTP-only
  defect envelope already define all values #66 needs to decode. The defect
  envelope deliberately does not widen `OracleBatchResponse`
  ([process contract](../../packages/opaque-oracle/src/oracle-process-contract.ts#L96)).
- The committed corpus already authors one deterministic 12-Case A/B/A batch
  with production-derived creation, fresh-sheet, mixed-roster, Battle
  frontier, retry, resolution, interrupt, input-surplus, fill-rejection, and
  empty-roster outcomes. Its Cases are the strongest existing input source and
  the recommended #66 parity slice; that is an implementation inference, not a
  new acceptance requirement. Its stored Traces must not become the parity
  oracle
  ([source Cases](../../packages/opaque-oracle/src/oracle-evaluation-corpus-source.ts#L116),
  [corpus coverage test](../../packages/opaque-oracle/src/oracle-corpus.test.ts#L118)).
- The distribution test already owns the staged clean-directory harness,
  external-network denial, synchronous packaged stream invocation,
  asynchronous HTTP readiness/request/shutdown helpers, and the exact
  test-entrypoint build seam
  ([black-box owner](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L46),
  [stream runner](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L163),
  [HTTP launcher](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L205)).

The production distribution file set, schemas, startup projection, identity
digest, builder, checker, runtime application, codecs, stream adapter, and HTTP
adapter require no planned change for #66. A runtime edit is justified only by
a failure discovered by the new black-box proof
([distribution ownership](../../packages/opaque-oracle/ARCHITECTURE.md#application-composition-and-distribution),
[#66 outcome](https://github.com/dearlordylord/5e-quint/issues/66)).

### Documentation outdatedness found during the trace

`docs/research/issue-65-pre-research.md` is now historical evidence, not a
current implementation plan. Among other pre-merge statements, it says only
`identity` and `stream` exist, describes `oracle-http.ts` as a new file still to
be added, names an `OracleStreamEvaluator` seam that no longer exists, and
refers to `application.distributionId` even though identity is owned at
`application.identity.distributionId`. Stable HTTP ownership has already been
promoted to the package and root architecture, and the research note's own
header permits deletion after promotion
([historical note](issue-65-pre-research.md),
[current application](../../packages/opaque-oracle/src/oracle-distribution.ts#L59),
[current package architecture](../../packages/opaque-oracle/ARCHITECTURE.md#application-composition-and-distribution)).

Do not refresh that historical note into a second authority as part of #66.
The #66 implementation should simply stop using its pre-merge file/API list as
guidance
([documentation ownership](../../CONTEXT-MAP.md#related-authorities)).

One separate stable-glossary drift also exists: the Cleanroom `Oracle Case`
definition mentions only Battle Act attempts with Runtime Hole fills, while the
canonical schema admits both ordinary-subject attempts and interrupt-decision
attempts. The same glossary already names interrupt decisions as a continuation
frontier. This is not needed to prove transport parity and should not expand
the #66 test slice; route it to the Cleanroom context owner as a bounded
documentation correction
([Cleanroom glossary](../cleanroom/CONTEXT.md),
[attempt schema](../../packages/opaque-oracle/src/oracle-case-trace-schema.ts#L163),
[context map](../../CONTEXT-MAP.md#contexts)).

## Exact gap in the current tests

The current packaged tests are adjacent but not parameterized together:

- The first large distribution test proves deterministic packaging, identity,
  CLI batch/singleton decomposition, CLI A/B/A isolation, malformed frames,
  workflow rejection, and a clean unrelated working directory
  ([CLI test](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L392),
  [decomposition](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L552),
  [isolation](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L589)).
- A second independently built distribution test proves HTTP/direct-evaluator
  equality, HTTP A/B/A isolation, malformed/status mapping, workflow rejection,
  shutdown, an atomic HTTP defect, and recovery after that defect
  ([HTTP test](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L715),
  [direct comparison](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L798),
  [defect](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L914)).
- A third distribution build proves CLI defect atomicity
  ([CLI defect test](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L998)).

No assertion compares an HTTP `OracleBatchResponse` with the CLI response for
the same bytes. HTTP does not currently prove batch-to-singleton decomposition,
and the normal/defect builds are repeated instead of being shared by the two
modes. These are the decisive missing #66 facts
([#66 highest seam](https://github.com/dearlordylord/5e-quint/issues/66),
[current HTTP assertions](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L798)).

There is also one concrete false witness to correct while consolidating. The
CLI malformed input sequence puts invalid UTF-8 at response index 5, after the
multi-issue `{"cases":[{}],"extra":true}` frame, but the assertion names index
4 `invalidUtf8Response`. It therefore checks the structural-invalid response,
not the invalid UTF-8 response. The lower stream test and packaged HTTP test do
cover invalid UTF-8, but the packaged CLI proof does not inspect the intended
invalid-UTF-8 issue payload specifically
([input ordering](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L606),
[misindexed assertion](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L631),
[stream test](../../packages/opaque-oracle/src/oracle-stream.test.ts#L75),
[HTTP assertion](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L849)).

## Implementation slice

### Canonical owner and API

Keep the change in
`packages/opaque-oracle/src/oracle-distribution.test.ts`, the existing
source-free packaged black-box owner. Extend or consolidate its local harness;
do not add an exported transport abstraction. The only production API under
test remains the packaged executable command/route surface. Decode observations
with `OracleBatchResponseSchema` and identity with
`OracleIdentityResponseSchema`
([test owner](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L391),
[schemas](../../packages/opaque-oracle/src/oracle-process-contract.ts#L114)).

A local discriminated test result may distinguish a decoded normal response
from transport defect evidence so the scenario table can state the common
atomicity law. That type must stay in the test file and must not become a
domain response, package export, adapter API, or reusable Target comparator
([defect boundary](../../packages/opaque-oracle/src/oracle-process-contract.ts#L143),
[#66 prohibition](https://github.com/dearlordylord/5e-quint/issues/66)).

### Minimal edit shape

1. Build and stage one ordinary distribution once inside the parity suite;
   reuse the existing unrelated cwd and network-denial preload for both modes.
2. Launch one persistent HTTP process and drive one persistent stream process
   with the same ordered normal scenario inputs. If a local runner abstraction
   is useful, keep it test-only and make its outputs parsed contract values,
   statuses, and process evidence—not another Oracle algebra.
3. Prefer the committed corpus **Cases** as the existing comprehensive input
   source. Do not compare against `corpus.traces`; derive equivalence from the
   two packaged modes and from live singleton decomposition.
4. Parameterize the malformed byte cases once and require exact decoded issue
   equality across modes. Fix the invalid-UTF-8 index by associating each input
   with its observation rather than remembering response positions.
5. Build the defect entry distribution once and run both its stream and HTTP
   entrypoints. Assert each transport's decided atomic failure shape and the
   absence of partial traces; do not normalize the wire contracts into a new
   production value.
6. Preserve the existing transport-specific assertions for identity,
   Content-Type/status, loopback readiness, SIGINT/SIGTERM shutdown,
   distribution determinism, asset isolation, and tamper rejection. They are
   supporting #64/#65 evidence, not substitutes for the cross-mode table
   ([existing harness](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L392),
   [#64](https://github.com/dearlordylord/5e-quint/issues/64),
   [#65](https://github.com/dearlordylord/5e-quint/issues/65)).

No other production file is expected to change. If test readability requires a
test-support module, it must remain package-private, have only current test
consumers, and avoid duplicating launch/build state already owned by the
distribution test; keeping the helper local is the lower-connascence default
([repository dead-code and connascence rules](../../.claude/review-rules.md)).

## Required test matrix

| Scenario | Shared packaged assertion | Transport-specific assertion |
| --- | --- | --- |
| Identity | All ordinary CLI/HTTP observations use the ordinary build's `DistributionId`; defect CLI identity and HTTP defect evidence use the separately hashed defect build's identity. | CLI identity is one LF-terminated value; HTTP identity is 200 JSON. The ordinary and alternate-entrypoint identities need not equal because executable bytes differ. |
| Whole committed batch | CLI and HTTP decode to equal `evaluated` values with one Trace per Case in original order. | HTTP is 200; CLI process succeeds with one response line. |
| Every singleton | Concatenated singleton Traces equal the whole-batch Traces in CLI and HTTP, and the two modes agree. | Exercise fresh CLI as well as persistent CLI; HTTP uses sequential requests on one listener. |
| Prior unrelated message | Batch/singleton decomposition still holds after an unrelated earlier frame/request. | The same CLI process and HTTP listener remain alive. |
| A/B/A | First and third responses are equal, B is distinguishable, and both modes agree. | Use the corpus's intentional leading A/B/A Cases. |
| Domain/workflow rejection | `inputExhausted`, `fillRejected`, and other corpus rejections are equal evaluated Trace data, not decode rejection. | HTTP remains 200; CLI remains a normal response. |
| Malformed JSON | Empty/blank, invalid JSON, duplicate-member, empty-batch, invalid-UTF-8, and structural-invalid inputs yield equal `decodeRejected` values and accumulated issue order. A mixed batch containing a valid Case plus multiple independently invalid Cases produces one decode rejection with no Trace prefix. | HTTP is 400; CLI remains alive and emits one response per frame. |
| Later-Case defect | Neither transport exposes an earlier computed Trace or any partial response. | CLI has empty stdout, nonzero exit, and no later frame; HTTP is exact 500 defect JSON and a later independent request succeeds. |
| Clean process | Both modes run the same exact staged artifact from an unrelated cwd with external networking denied. | Only numeric IPv4 loopback is permitted for the local HTTP test. |

The matrix derives from #66, the promoted Oracle testing decisions in #12, and
the historical Case/Trace fixture decision. It intentionally does not reopen
transport-only 404/405/413/415 policy or listener lifecycle tests already owned
by #65
([#66](https://github.com/dearlordylord/5e-quint/issues/66),
[#12 testing decisions](https://github.com/dearlordylord/5e-quint/issues/12),
[decision fixture matrix](https://github.com/dearlordylord/5e-quint/blob/e0bd11af0/plans/wayfinder/cleanroom-sdk/oracle-case-trace-algebra.md#portable-case-and-black-box-fixture-corpus),
[HTTP transport tests](../../packages/opaque-oracle/src/oracle-http.test.ts#L324)).

## Prohibited duplicate state and seams

The reviewer should reject any #66 implementation that introduces:

- a second application, distribution build root, startup projection, identity,
  catalog composition, or per-mode `DistributionId`;
- a transport-specific decoder, evaluator, Case/Trace type, response union, or
  expected-value algorithm;
- a production `Transport`, `Comparator`, `ParityResult`, registry, or adapter
  API created only to make the tests share code;
- stored corpus Traces used as the truth against which both transports pass;
- request ids, Case ids, seeds, protocol versions, or correlation fields added
  to solve test bookkeeping;
- mutable Cases, decoded batches, reducer sessions, or prior responses retained
  by the test target between messages;
- a production defect trigger or command-line switch—the existing alternate
  package entrypoint is the test-only seam; or
- authored-identity dispatch, new mechanics fixtures, or PHB+ identity. The
  existing SRD/synthetic corpus is sufficient.

These exclusions are owned by the live issue, accepted specification,
application architecture, and repository design rules
([#66](https://github.com/dearlordylord/5e-quint/issues/66),
[#12](https://github.com/dearlordylord/5e-quint/issues/12),
[application architecture](../../packages/opaque-oracle/ARCHITECTURE.md#application-composition-and-distribution),
[repository instructions](../../AGENTS.md#system-wide-design)).

## Verification and reviewer-loop convergence

Use the smallest checks while editing:

```sh
pnpm --filter @dnd/opaque-oracle test -- \
  src/oracle-distribution.test.ts --pool=threads --maxWorkers=1
pnpm --filter @dnd/opaque-oracle typecheck
pnpm --filter @dnd/opaque-oracle check:schema-sync
pnpm --filter @dnd/opaque-oracle check:corpus
pnpm --filter @dnd/opaque-oracle build
pnpm --filter @dnd/opaque-oracle check-distribution
```

Then run the public root gates directly:

```sh
pnpm typecheck
pnpm test
```

After reviewer convergence at a stable integration revision, run the current
public broad gate exposed by this source revision:

```sh
pnpm quality
```

The newer instructions supplied for the parent checkout name
`pnpm quality:milestone`, but this research base's `AGENTS.md` and
`package.json` expose only `pnpm quality`. Reconcile that revision difference
after integration and run the public command actually owned by the resulting
checkout; do not guess an internal or nonexistent substitute
([source-base instructions](../../AGENTS.md#verification-and-review),
[source-base scripts](../../package.json)).

Do not wrap the public root commands in another resource lock, invoke their
internal `:body`/`:turbo` scripts, or retry an exit 137 unchanged
([repository verification policy](../../AGENTS.md#verification-and-review),
[package scripts](../../packages/opaque-oracle/package.json#L16),
[root scripts](../../package.json)).

This expected slice changes tests and no D&D rule, QNT semantics, runtime
projection, Surface content, or mechanics admission. No SRD lookup, Quint
proof, or battle MBT run is required unless the implementation changes one of
those owners. Review must nevertheless repeat to convergence:

1. RAW/PHB+ safety: confirm the change only reuses the existing SRD/synthetic
   corpus and adds no rules claim or authored identity.
2. Ubiquitous/domain language: distinguish decode rejection, evaluated
   workflow/domain rejection, and unexpected defect; do not name a
   transport-only test observation as a domain result.
3. Architecture/connascence: confirm one build/application/codec/identity and
   test-local parameterization, with no positional malformed-frame protocol or
   duplicated expected-value algorithm.
4. Code/spec review: read `.claude/review-rules.md`, verify every #66 scenario
   against packaged public entrypoints, fix every reasonable finding, record a
   concrete reason for any rejection, and repeat the full loop until no
   reasonable finding remains.

Those loops and the no-new-rule classification are required by the repository
and the accepted specification
([review rules](../../.claude/review-rules.md),
[#12 verification](https://github.com/dearlordylord/5e-quint/issues/12)).

## Research verification note

This pre-research made no runtime or test change. A focused Vitest command was
attempted, but this linked worktree has no `node_modules` and `vitest` was
unavailable, so test discovery never began and no package verification
completed. This is an unavailable local dependency, not a test failure. The
research otherwise inspected the clean source revision, live issue
bodies/comments/native dependencies, accepted specification and decision
records, current source, committed corpus authoring, and the post-#65 packaged
tests. Implementation verification remains the responsibility of the #66
changeset.
