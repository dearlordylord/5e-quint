# Issue #65 dependency pre-research for the #64 executable root

> **Research evidence, not architecture authority.** Stable structure belongs in
> [`ARCHITECTURE.md`](../../ARCHITECTURE.md) and the package architecture; issue
> acceptance remains owned by the live specification and tickets.

Research checked: 2026-08-27. Source checkout:
`de93053135377475908812ef180d19a061300e05`.

## Executive finding

Issue [#65](https://github.com/dearlordylord/5e-quint/issues/65) must add one
loopback HTTP mode to the executable and distribution root created by
[#64](https://github.com/dearlordylord/5e-quint/issues/64). It cannot add an HTTP
package, server-only bundle, second catalog composition, second decoder, or
transport-owned evaluator. The downstream parity ticket explicitly tests both
modes through the packaged public entrypoint
([#66](https://github.com/dearlordylord/5e-quint/issues/66)).

Therefore #64 should establish these seams now:

1. one deterministic distribution builder and one executable entry file;
2. one root command with `identity` and persistent `stream` modes, to which #65
   can add `serve` without changing the executable path or distribution layout;
3. one immutable distribution/application value containing the
   `DistributionId` and the two catalog services;
4. one application operation from raw JSON text to the shared evaluated or
   decode-rejected response algebra, with defects left in the failure channel;
5. a thin CLI line-framing adapter over that operation.

The promoted specification requires identity lookup, persistent line-delimited
batch evaluation, and later local HTTP serving in the same CLI. It also requires
HTTP to place transport status around the same decoded response algebra
([accepted specification, Opaque Oracle](https://github.com/dearlordylord/5e-quint/issues/12)).

```text
one packaged executable
        |
        +-- identity ----+
        +-- stream ------+--> one immutable distribution
        +-- serve (#65) -+        |-- DistributionId
                                  |-- filtered Unit/Stat Block catalogs
                                  `-- raw JSON -> canonical decode -> evaluateOracleBatch
```

## Live dependency and acceptance facts

- #65 is open, has no issue comments, and is natively blocked by #64. Its
  acceptance says HTTP is another mode of the #64 executable, uses the canonical
  codec and operation, shares only immutable services, binds loopback, has typed
  lifecycle/identity discovery, returns Trace-domain rejections normally, and
  returns atomic 5xx for defects
  ([#65](https://github.com/dearlordylord/5e-quint/issues/65)).
- #64 is open and natively blocked by #95. It owns the first packaged executable,
  persistent CLI, per-Case fresh state, one `DistributionId`, atomic batch
  behavior, and the source-free/offline distribution
  ([#64](https://github.com/dearlordylord/5e-quint/issues/64)).
- The checkout already integrates the #95 implementation commits even though the
  live #95 ticket remains open. The repository audit establishes the corrected
  linear chain `#95 -> #64 -> #65 -> #66`
  ([boundary audit](oracle-cleanroom-boundary-audit.md#corrected-graphs)).
- #66 will run one parameterized black-box suite over both packaged modes. That
  makes a private HTTP evaluator or tests against internal helpers insufficient
  even if their values happen to match
  ([#66](https://github.com/dearlordylord/5e-quint/issues/66)).

## Canonical facts already implemented by #95

These are the owners #64 and #65 should call directly:

- `OracleEvaluationBatchSchema` is already the strict non-empty input batch;
  `OracleCaseSchema` and `OracleTraceSchema` are the canonical Case/Trace owners
  ([schema](../../packages/opaque-oracle/src/oracle-case-trace-schema.ts#L211)).
- `decodeOracleEvaluationBatchJson` already performs duplicate-aware raw JSON
  parsing followed by structural and semantic admission. Both transports must
  pass the original UTF-8 body text through this function; parsing with
  `JSON.parse` in a transport first would lose duplicate-member evidence
  ([codec](../../packages/opaque-oracle/src/oracle-case-trace.ts#L97),
  [raw scanner](../../packages/opaque-oracle/src/oracle-decode.ts#L282)).
- `evaluateOracleBatch` is the canonical sequential production operation. It
  injects one shared `OracleEvaluationServices` value but calls
  `evaluateOracleCase` separately for every position
  ([operation](../../packages/opaque-oracle/src/oracle-evaluation.ts#L73)).
  `evaluateOracleCase` creates its draft, sheet, Battle session, progression,
  and Battle frame inside the call, so its mutation is Case-local
  ([evaluation](../../packages/opaque-oracle/src/oracle-evaluation.ts#L89)).
- Direct tests already prove deterministic repeated Case evaluation and A/B/A
  batch isolation/singleton decomposition
  ([determinism](../../packages/opaque-oracle/src/oracle-case-trace.test.ts#L496),
  [batch isolation](../../packages/opaque-oracle/src/oracle-case-trace.test.ts#L1642)).
- `ORACLE_PUBLICATION_ARTIFACTS` is the one schema-publication byte owner. It
  currently contains three artifacts—Case, Trace, and Evaluation Batch—with
  stable root ids. Distribution identity must bind this complete current set,
  not choose one artifact or regenerate another schema graph
  ([publication](../../packages/opaque-oracle/src/oracle-publication.ts#L8)).
- The #95 corpus is generated from Cases and the production batch evaluator;
  traces are not authored expectations. Its A/B/A corpus is useful black-box
  input for #64/#65, but it is not a stored-trace substitute for live transport
  evaluation
  ([corpus owner](../../packages/opaque-oracle/src/oracle-corpus.ts#L86),
  [corpus tests](../../packages/opaque-oracle/src/oracle-corpus.test.ts#L84)).

## Current gaps and stale assumptions

### There is no #64 executable or distribution surface yet

The package is private, exports `./src/index.ts`, has no `bin`, no `build`
script, and a `noEmit` TypeScript configuration. Its only executable is the
source-run corpus-authoring CLI under `scripts/`
([manifest](../../packages/opaque-oracle/package.json),
[`tsconfig`](../../packages/opaque-oracle/tsconfig.json)). That CLI's
`generate/check/write` commands, filesystem/Ajv dependencies, and package-local
paths are #95 authoring concerns, not the persistent black-box evaluation CLI
([corpus CLI](../../packages/opaque-oracle/scripts/oracle-evaluation-cli.ts#L268)).

Consequently #64 should not rename or extend the corpus CLI into the application
bootstrap. It should add a production entry under `src/` and keep the authoring
script as a consumer of shared core facts.

### Production service construction is in the wrong owner for reuse

`buildProductionOracleEvaluationServices` currently lives in the corpus CLI,
builds the complete SRD Unit and Stat Block catalogs, and is called by that
script's own `runMain`
([builder](../../packages/opaque-oracle/scripts/oracle-evaluation-cli.ts#L187),
[bootstrap](../../packages/opaque-oracle/scripts/oracle-evaluation-cli.ts#L1160)).
It cannot be imported as the #64/#65 composition root: doing so couples the
packaged application to source authoring/filesystem tooling, and it does not
satisfy the filtered-startup-catalog acceptance.

The distribution service builder should move to a production-owned module and
produce the exact service value used by both `stream` and later `serve`. The
corpus script may reuse lower-level catalog construction where appropriate, but
must not become the application's bootstrap.

### The filtered startup projection is not implemented

The current catalog services expose `get`, `list`, and assertion lookup over the
full SRD collections
([Unit catalog](../../packages/surface/src/surface/unit-catalog.ts#L424),
[Stat Block catalog](../../packages/surface/src/surface/stat-block-catalog.ts#L37)).
No production function in this checkout derives the levels-1-and-2 Oracle
workflow projection. The Unit catalog builder validates only some reference
families and explicitly leaves class-feature grant references for later
point-of-use checks, so filtering `listUnits()` naively can create an incomplete
authored graph
([Unit catalog construction](../../packages/surface/src/surface/unit-catalog.ts#L1046)).

The accepted boundary requires startup to derive this projection from canonical
generated content, preserve complete graphs and required authored-reference
closure, and not redefine the separate levels-1-through-10 Cleanroom Mechanics
Slice
([#22 resolution](https://github.com/dearlordylord/5e-quint/issues/22#issuecomment-4963692153),
[Cleanroom terms](../cleanroom/CONTEXT.md#cleanroom-workflow-horizon)). A
handwritten id allowlist, a partial record filter, or shipping the full catalog
would violate that constraint. This is the main implementation gap #64 must
resolve or explicitly escalate; #65 must consume the resulting service and
projection unchanged.

### `DistributionId` does not exist in current source

There is no current type, schema, constructor, metadata artifact, or runtime
value named `DistributionId`. The accepted specification limits it to the
executable, Oracle schema, and filtered startup catalog projection; it is not a
Core id, compatibility manifest, conformance receipt, or rules authority
([#12](https://github.com/dearlordylord/5e-quint/issues/12),
[#40](https://github.com/dearlordylord/5e-quint/issues/40)).

The detailed Case/Trace decision recorded the intended shape as
`sha256:` plus 64 lowercase hexadecimal characters and the preimage as all
semantic payload bytes—executable, schema set, and filtered projection—excluding
only the metadata file that stores the resulting digest
([historical decision at the accepted handoff](https://github.com/dearlordylord/5e-quint/blob/e0bd11af0/plans/wayfinder/cleanroom-sdk/oracle-case-trace-algebra.md#L671-L711)).
Implement one branded `DistributionId` schema/constructor, one build-time digest,
and one immutable loaded value. Do not store component hashes, capability status,
or a second manifest beside it.

### Earlier topology statements are stale, not constraints to preserve

The #22 resolution said the exact Case/Trace algebra did not yet exist; #94/#95
have now supplied it. The package architecture also currently says the package
does not own transport. For #64/#65 that should be refined to say the **core
Case-to-Trace operation** owns no transport state while the one package-owned
application executable owns its thin CLI/HTTP adapters. Treating the older text
as a ban on an executable adapter would contradict the current accepted
one-application topology
([package architecture](../../packages/opaque-oracle/ARCHITECTURE.md),
[#12](https://github.com/dearlordylord/5e-quint/issues/12)).

## Required #64 shape for later HTTP extension

### Shared application protocol

#64 should add canonical, schema-decoded application responses outside Case and
Trace:

```text
OracleIdentityResponse = { distributionId }
OracleEvaluatedResponse = { tag: "evaluated", distributionId, traces: NonEmpty<OracleTrace> }
OracleDecodeRejectedResponse = { tag: "decodeRejected", distributionId, issues }
OracleBatchResponse = OracleEvaluatedResponse | OracleDecodeRejectedResponse
```

There is no singleton wire variant and no per-Case/request id. The response
schema and compact encoder belong with the shared application operation, not in
the CLI adapter. This follows the accepted framing decision and lets #65 map
evaluated/decode-rejected values to HTTP 200/400 without redefining their JSON
([#23 resolution](https://github.com/dearlordylord/5e-quint/issues/23#issuecomment-4964257912),
[detailed framing](https://github.com/dearlordylord/5e-quint/blob/e0bd11af0/plans/wayfinder/cleanroom-sdk/oracle-case-trace-algebra.md#L671-L760)).

The shared operation should take raw JSON text plus the immutable distribution:

1. decode the whole batch with `decodeOracleEvaluationBatchJson`;
2. return `decodeRejected` as normal typed response data without evaluating;
3. call `evaluateOracleBatch` only after successful whole-batch decoding;
4. construct and serialize the complete evaluated response only after all Cases
   return;
5. leave an unexpected throw/Effect defect outside `OracleBatchResponse`.

Buffering the response before a single transport write is what makes a defect in
a later Case discard the earlier computed Traces. Converting a caught defect to
a Trace or writing each Trace as it is computed would violate #64 and #65.

### One bootstrap and mode dispatcher

Use one executable entry and one root command. #64 implements `identity` and
`stream`; #65 extends the same exhaustive mode union/root command with `serve`.
Do not create uncalled HTTP placeholders in #64, but keep argument parsing,
distribution loading, logging policy, and shutdown ownership outside the
stream-specific adapter.

`stream` owns only line framing:

- every non-empty or blank input line is passed as one raw frame to the shared
  operation (blank is therefore typed `invalidJson`, not a keepalive);
- each evaluated/decode-rejected frame yields exactly one compact response plus
  LF, in order;
- EOF is clean shutdown, including a final non-LF-terminated non-empty frame;
- a defect writes no contract response for that frame, emits only diagnostic
  stderr, exits nonzero, and processes no later frame.

#65 can then add a loopback server adapter whose request body is the same raw
text, whose identity response comes from the same immutable value, and whose
status mapping is 200 evaluated, 400 decode rejected, and atomic 5xx defect. The
server must not retain batches, Cases, Traces, reducer sessions, or mutable
request caches. Typed bind/listen/address/shutdown facts belong to the HTTP
adapter; evaluation state does not.

### One deterministic distribution root

The build should emit one self-contained directory containing the executable,
the current canonical schema artifacts, the exact filtered catalog projection,
and narrow identity metadata. A deterministic build step should hash stable,
named payload bytes in a fixed order and then write the identity metadata, with
source maps disabled. #65 modifies this same executable and distribution; it
does not add an HTTP tarball or server distribution.

Bundling is a natural fit because Surface imports generated JSON statically and
the workspace already uses esbuild for source-free Node bundles with
`bundle: true`, ESM, and `sourcemap: false`
([existing build precedent](../../scripts/raw-swarm/sdk-player/consumer-distribution.ts#L370)).
The exact tool is not the domain contract. The black-box test must inspect the
emitted tree and bytes for TypeScript, maps, symlinks/workspace links, repository
paths, and external-network requirements rather than assuming bundling proves
absence.

## Likely files and verification

Likely owners to add or change in #64:

- `packages/opaque-oracle/src/`: shared application protocol/response schemas,
  `DistributionId`, distribution services/composition, raw-text batch operation,
  stream adapter, and the single executable entry;
- `packages/opaque-oracle/scripts/`: deterministic distribution builder and any
  test-only packaged defect fixture; keep the existing corpus CLI separate;
- `packages/opaque-oracle/package.json`: one public `build` command and packaged
  entry metadata; use pnpm only;
- `packages/opaque-oracle/README.md` and `ARCHITECTURE.md`, plus the root package
  ownership paragraph/table, to distinguish transport-free operation state from
  package-owned executable adapters;
- focused protocol/stream/distribution tests and a clean-directory black-box
  packaging test.

Focused verification should include:

- package typecheck and tests;
- schema sync and corpus checks;
- deterministic double-build byte/identity equality;
- packaged `identity` and multi-frame `stream` runs from a clean unrelated cwd;
- singleton, batch, malformed/duplicate/empty, A/B/A, repeated-message, prior-
  message isolation, and domain-rejection cases compared with direct evaluation;
- a test-only packaged defect composition proving no current-frame response and
  nonzero exit without adding a production defect trigger;
- emitted-tree/source-map/symlink/workspace/repository-link/offline checks;
- reviewer-loop convergence for RAW/PHB+, domain language, architecture/
  connascence, and code/spec.

#65 should reuse that black-box harness and add loopback bind, launch discovery,
identity, request/status, persistent-process isolation, shutdown, and defect 5xx
cases. #66 then parameterizes the final public-entrypoint suite over both modes.

## RAW lookup

No SRD passage lookup is needed for #64/#65 transport, response, identity,
packaging, or lifecycle work because it changes no D&D rule semantics. Record
that fact in review. The applicable authorities are the accepted Cleanroom
specification, Cleanroom vocabulary, package architecture, and existing typed
runtime owners.

If implementing the missing catalog projection requires inventing a new rule
about progression eligibility, authored-reference closure, or record mechanics
rather than mechanically projecting existing typed generated facts, that is a
rules/content change. At that point the implementer must use the repository's
local SRD/ubiquitous-language workflow—or stop and coordinate with the separate
Cleanroom Mechanics Slice owner [#29](https://github.com/dearlordylord/5e-quint/issues/29)—instead of encoding an id allowlist or browsing another rules source.
