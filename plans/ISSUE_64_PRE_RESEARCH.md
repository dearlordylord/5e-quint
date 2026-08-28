# Issue 64 pre-research: persistent Opaque Oracle CLI distribution

Date: 2026-08-27

Status: pre-implementation research only for open GitHub issue
[#64](https://github.com/dearlordylord/5e-quint/issues/64). This note is not a
requirements, architecture, domain, or delivery owner. It belongs in `plans/`
while #64 needs the unresolved implementation decision below; research notes
are expressly non-owning working documents
([`plans/README.md`](README.md#finding-current-work)).

This is a dated research snapshot, not a live implementation status. The
implemented composition and distribution are owned by the package source and
architecture documents
([`packages/opaque-oracle/ARCHITECTURE.md`](../packages/opaque-oracle/ARCHITECTURE.md));
the note remains only as supporting evidence for the original decision.

## Decisive guidance

At the time of this research, #64 was **not implemented**, although its #95
source prerequisites were present in the checkout. The resulting implementation
lives in `@dnd/opaque-oracle` as one packaged application
root with identity and persistent evaluation modes; #65 must add HTTP to that
same root. Reuse the existing strict batch decoder and production evaluator.
Do not turn the source-side corpus CLI into a second evaluator or package it as
the runtime surface.

Before the transport work can honestly satisfy acceptance, settle one missing
owner: the repository has one canonical generated SRD aggregate
([`surface-catalog.ts`](../packages/surface/src/surface/surface-catalog.ts#L1-L10)),
but no current operation derives the Oracle's level-1-and-2 startup catalog
projection from it. The existing production composition installs the complete
SRD Unit and Stat Block collections
([`oracle-evaluation-cli.ts`](../packages/opaque-oracle/scripts/oracle-evaluation-cli.ts#L201-L265)).
Bundling that complete catalog, filtering by a handwritten id list, or hashing a
projection different from the one used to evaluate Cases would fail #64. Add a
single derivation whose parsed result both builds the immutable evaluator
services and enters the distribution identity. If that derivation actually
requires the not-yet-landed Cleanroom Mechanics Slice from #29, correct the
native dependency rather than weakening the criterion.

No RAW lookup is required. This is application composition, transport, and
packaging work and should record itself as structurally rules-neutral. A RAW/QNT
review becomes necessary only if implementation changes admission or evaluator
semantics rather than projecting the already accepted workflow horizon.

## Current acceptance and dependency state

The live issue was fetched through the first-party GitHub API on 2026-08-27. It
is open, unassigned, labelled `ready-for-agent`, has no comments, is a child of
#33, is blocked by #95, and blocks #65
([issue](https://github.com/dearlordylord/5e-quint/issues/64),
[native blocker API](https://api.github.com/repos/dearlordylord/5e-quint/issues/64/dependencies/blocked_by)).
Its current acceptance requires:

1. one source-free packaged executable/bootstrap that later gains HTTP, with no
   parallel distribution root;
2. a persistent CLI using the canonical Case, Trace, non-empty batch codec, and
   production operation, with no transport-specific evaluator;
3. fresh mutable evaluation state for every Case and only immutable shared
   application services across messages;
4. one immutable `DistributionId` binding the executable, schemas, and filtered
   startup catalog projection, discoverable through CLI identity lookup;
5. positional batch output equal to singleton decomposition;
6. typed whole-batch decoding before evaluation and atomic defect abort with no
   partial Trace output; and
7. a clean-directory/offline distribution containing no TypeScript, source
   maps, workspace links, or external-network requirement, proven by black-box
   persistent-process, codec, batch, isolation, identity, malformed-input, and
   defect tests.

The accepted Cleanroom vocabulary reinforces that a singleton is a one-Case
batch, not an alternate wire shape; the batch is non-empty, ordered, decoded
atomically, sequentially evaluated, position-corresponding, and observationally
unchanged by prior process messages
([`docs/cleanroom/CONTEXT.md`](../docs/cleanroom/CONTEXT.md#L63-L76)).

GitHub is formally stale/blocking: #95 remains open and its native blocker #94
also remains open. Repository policy says a ticket is unblocked only when every
native blocker is closed
([`docs/agents/issue-tracker.md`](../docs/agents/issue-tracker.md#L66-L76)).
Checkout readiness differs: HEAD `de9305313` merges the #95 branch, including
the corpus implementation and converged fixes
([`951de25cc`](https://github.com/dearlordylord/5e-quint/commit/951de25cc39aeb12895eac255c343e762794f9d3),
[`83e57b2eb`](https://github.com/dearlordylord/5e-quint/commit/83e57b2eb64dd7c8dc633b5bba59d87a49ca1506),
[`69e2852d3`](https://github.com/dearlordylord/5e-quint/commit/69e2852d3b2b94c4a482c5bf61dc0e8a9d1304d5)).
Thus source engineering can proceed on this branch, but issue closure must not
claim the native dependency has been reconciled.

## Existing owners to reuse

- `OracleEvaluationBatchSchema` already makes an empty batch unrepresentable
  with `Schema.NonEmptyArray(OracleCaseSchema)`
  ([`oracle-case-trace-schema.ts`](../packages/opaque-oracle/src/oracle-case-trace-schema.ts#L211-L234)).
- `decodeOracleEvaluationBatchJson` already performs duplicate-aware JSON
  scanning, structural Document decoding, canonicalization, and semantic
  admission; transport code must call it rather than parse or validate again
  ([`oracle-case-trace.ts`](../packages/opaque-oracle/src/oracle-case-trace.ts#L97-L158)).
  The shared decoder uses `errors: "all"` and returns a non-empty typed issue
  collection
  ([`oracle-decode.ts`](../packages/opaque-oracle/src/oracle-decode.ts#L6-L61)).
- `evaluateOracleCase` creates its draft, progression accumulator, fresh Sheet,
  and Battle session inside one call. `evaluateOracleBatch` maps Cases in order
  and returns a non-empty Trace tuple
  ([`oracle-evaluation.ts`](../packages/opaque-oracle/src/oracle-evaluation.ts#L73-L192)).
  This already supplies per-Case isolation and positional/singleton semantics;
  do not add process-level draft, sheet, battle, or Trace state.
- The immutable service boundary is currently exactly `UnitCatalog` plus
  `StatBlockCatalog`
  ([`oracle-evaluation.ts`](../packages/opaque-oracle/src/oracle-evaluation.ts#L73-L80)).
  The #95 CLI already demonstrates building those services once at composition
  and injecting them into handlers
  ([`oracle-evaluation-cli.ts`](../packages/opaque-oracle/scripts/oracle-evaluation-cli.ts#L196-L217)).
  Extract/reuse this composition; do not duplicate it in a new bootstrap.
- The three canonical compact Draft 2020-12 artifacts are derived from the
  canonical Document graphs and checked for exact-byte drift
  ([`oracle-publication.ts`](../packages/opaque-oracle/src/oracle-publication.ts#L9-L78),
  [`oracle-publication.test.ts`](../packages/opaque-oracle/src/oracle-publication.test.ts#L61-L94)).
- The committed #95 corpus and existing tests already provide production-derived
  normal, rejection/retry, ordering, duplicate, deterministic replay, and
  A/B/A positional decomposition witnesses
  ([`oracle-corpus.ts`](../packages/opaque-oracle/src/oracle-corpus.ts#L86-L137),
  [`oracle-case-trace.test.ts`](../packages/opaque-oracle/src/oracle-case-trace.test.ts#L1650-L1743)).
  Use its Cases as black-box inputs and compare packaged results with the direct
  evaluator; never use stored Traces as the evaluator.
- The current corpus CLI is development tooling: its only modes are
  `generate`, `check`, and `write`, and the package scripts launch its TypeScript
  with `tsx`
  ([`packages/opaque-oracle/package.json`](../packages/opaque-oracle/package.json#L13-L20),
  [`oracle-evaluation-cli.ts`](../packages/opaque-oracle/scripts/oracle-evaluation-cli.ts#L292-L361)).
  The package has no runtime distribution build and its TypeScript config is
  `noEmit`
  ([`tsconfig.json`](../packages/opaque-oracle/tsconfig.json#L1-L18)).
- The workspace already pins esbuild, permits its build, and has a local Node ESM
  bundling precedent with `sourcemap: false`
  ([root `package.json`](../package.json#L80-L109),
  [`pnpm-workspace.yaml`](../pnpm-workspace.yaml#L16-L22),
  [`consumer-distribution.ts`](../scripts/raw-swarm/sdk-player/consumer-distribution.ts#L489-L503)).
  Reuse the dependency and pattern, not the Raw Swarm module.

## Stale premises to avoid carrying forward

1. **Tracker status versus checkout state.** #93, #62, #121, #122, #94, and #95
   remain open in GitHub even though their integrated source is on this branch.
   Treat code as present and tracker closure as unresolved administrative state.
2. **The current package docs predate continuation and transport.** Main
   architecture still says the Oracle does not publish Runtime Holes or
   interrupt state
   ([`ARCHITECTURE.md`](../ARCHITECTURE.md#L188-L205)), while the owning package
   now documents ordinary-hole and interrupt-decision frontiers
   ([`packages/opaque-oracle/README.md`](../packages/opaque-oracle/README.md#L32-L61)).
   Package architecture also says it owns no transport
   ([`packages/opaque-oracle/ARCHITECTURE.md`](../packages/opaque-oracle/ARCHITECTURE.md#L1-L6)).
   #64 must update the stable and package-local ownership statements, not add an
   adapter to preserve stale prose.
3. **The source corpus CLI is not the requested CLI.** Its filesystem-oriented
   `generate/check/write` contract is useful source tooling but has no stdin
   evaluation stream, identity lookup, distribution, or clean-CWD behavior.
4. **The production service builder is not filtered.** It consumes the complete
   `srdUnitCollection` and `srdStatBlockCollection`; the accepted startup
   projection and its graph/reference preservation have no current code owner.
5. **The deleted Wayfinder encoding is historical, not current acceptance.** A
   former decision file suggested particular NDJSON response tags, a `sha256:`
   spelling, exit code 70, and a digest preimage. Its later status amendment
   explicitly makes the entire file historical evidence and routes current
   acceptance to #93-#95. Current #12/#64 still require persistent line-delimited
   evaluation, identity, and atomic defects, but do not freeze those retired
   spellings. Do not silently restore them
   ([historical status amendment](https://github.com/dearlordylord/5e-quint/blob/20bf2af2608b86b63a4a999e54790752cee0bcce/plans/wayfinder/cleanroom-sdk/oracle-case-trace-algebra.md#status-amendment-2026-07-16)).
   The #23 resolution remains useful provenance for the general framing decision
   ([issue comment](https://github.com/dearlordylord/5e-quint/issues/23#issuecomment-4964257912)).

## Proposed implementation shape

Keep one package and one distribution root. Exact filenames may be adjusted to
the package's vocabulary, but responsibilities should be separated as follows:

- `src/oracle-application.ts`: move/build the production immutable application
  value once. It should contain the parsed filtered startup projection and the
  exact `OracleEvaluationServices` built from that projection. The source corpus
  CLI and packaged bootstrap both consume it.
- `src/oracle-startup-catalog.ts`: derive the level-1-and-2 workflow projection
  from the canonical `srdSurface`, preserve whole required graphs/references,
  strictly decode it, and accumulate independent catalog issues. This must be a
  projection operation, not a durable support ledger or id allowlist. Thread a
  horizon-restricted existing creation support profile through discovery/fill
  if required; do not copy level literals into multiple callers.
- `src/oracle-process-contract.ts`: own a parsed/branded `DistributionId`, the
  identity response, and one exhaustive evaluated/decode-rejected batch response
  union. If these are public language-neutral wire values, generate their
  publication schemas from the same Effect schema graph rather than hand-write
  transport validators.
- `src/oracle-batch-operation.ts`: accept an already decoded
  `OracleEvaluationBatch`, call only `evaluateOracleBatch`, and construct the
  complete position-corresponding response. A raw companion accepts one JSON
  frame, calls `decodeOracleEvaluationBatchJson`, and returns decode rejection
  as normal data; evaluator defects remain a distinct failure channel.
- `src/oracle-stream.ts`: own persistent UTF-8/LF framing independently of
  evaluation. It must handle arbitrary byte chunking, blank frames, an
  unterminated final frame, invalid UTF-8, continued operation after decode
  rejection, and stop after a defect. Buffer one complete response before one
  stdout write; never stream individual Traces.
- `src/oracle-main.ts`: the single executable bootstrap with `oracle identity`
  and `oracle stream` modes. #65 adds `oracle serve` here; it must not create a
  second main or distribution.
- `scripts/build-oracle-distribution.ts`: bundle one minified Node ESM payload
  with no sourcemap or external workspace packages; stage canonical schema and
  startup-projection bytes; compute identity over named/length-framed semantic
  payload bytes; write only the resulting identity value as metadata so the
  digest has no self-reference. The runtime should fail closed if staged bytes
  no longer match that identity.
- `src/oracle-stream.test.ts` and
  `src/oracle-distribution.test.ts`: focused injected-boundary tests plus the
  clean-directory black-box seam. Inject a throwing evaluator only into a test
  build or typed operation test to prove that a later-Case defect discards an
  earlier computed Trace. Do not add a production “defect Case.”
- Update `packages/opaque-oracle/package.json`, the root public check scripts,
  `packages/opaque-oracle/README.md`,
  `packages/opaque-oracle/ARCHITECTURE.md`, and root `ARCHITECTURE.md`. #40 can
  later add portable fixtures/calibration artifacts to this same distribution
  root without replacing its bootstrap.

The response algebra must make these invalid states unrepresentable:

- evaluated and decode-rejected at once;
- optional/empty `issues` on rejection or optional/empty `traces` on success;
- an empty accepted request batch;
- a transport/domain rejection disguised as an exception;
- a defect disguised as a Trace or response containing a successful prefix;
- a `DistributionId` paired with services/catalog bytes it does not identify;
- process state containing a prior Case, Trace, draft, sheet, battle session,
  request id, or correlation id; and
- identity lookup and evaluation using different application roots.

Parse unknown bytes/JSON only at the stream boundary and carry narrowed values
forward. Accumulate independent batch issues rather than fail fast. These are
repository review gates, not optional style choices
([`.claude/review-rules.md`](../.claude/review-rules.md#L122-L176),
[boundary typing](../.claude/review-rules.md#L355-L394)). Catalog identity is
allowed at the authored catalog/admission boundary, but production evaluation
must continue to dispatch on parsed Surface shape, typed procedure facts, and
runtime state
([authored-identity review rule](../.claude/review-rules.md#L35-L65)).

## Packaging and black-box verification seam

Build into a temporary directory, copy only the staged distribution into a
second clean directory, and launch it with that directory as CWD and an empty
`NODE_PATH`. Resolve all packaged assets relative to the executable, never
`process.cwd()`; the current corpus defaults are deliberately package-CWD paths
([`oracle-evaluation-cli.ts`](../packages/opaque-oracle/scripts/oracle-evaluation-cli.ts#L53-L58))
and are not reusable for the runtime.

Recursively reject symlinks, `.ts`, `.tsx`, declarations, `.map`,
`sourceMappingURL`, `workspace:*`, repository/worktree absolute paths,
`node_modules`, and unresolved non-builtin imports. Run the process with a
test-side external-network denial hook (loopback is not needed until #65), then
recompute identity from the staged semantic bytes. Exercise:

- stable identity lookup and a tampered-byte failure;
- a valid singleton, distinguishable batch positions, and A/B/A messages in one
  persistent process;
- batch output equal to concatenated singleton outputs before and after unrelated
  prior messages;
- malformed JSON, duplicate raw members, blank input, invalid UTF-8, empty batch,
  and several independent invalid members;
- a workflow rejection as a normal Trace and continued processing afterward;
- EOF with and without a final LF; and
- an injected later-Case defect: nonzero termination, no response for that
  frame, no later frame, and no partial Trace bytes.

## Exact verification commands

Focused during implementation:

```sh
pnpm --filter @dnd/opaque-oracle typecheck
pnpm --filter @dnd/opaque-oracle test
pnpm --filter @dnd/opaque-oracle build
pnpm --filter @dnd/opaque-oracle check:distribution
pnpm check:opaque-oracle-schema-sync
pnpm check:opaque-oracle-corpus
pnpm check:surface-content-publication
pnpm check:authored-id-dispatch
pnpm check:cleanroom-provenance
```

The new `build` and `check:distribution` scripts do not exist yet; adding them is
part of #64. Keep the black-box test in the ordinary package test lane so it
cannot be omitted by running only the build.

After the RAW-neutrality, PHB+/domain-language, architecture/connascence, and
code-review loops converge, run the public broad commands directly:

```sh
pnpm typecheck
pnpm test
pnpm quality
```

Those commands acquire their own shared locks; do not wrap them or call their
internal Turbo/body variants
([`AGENTS.md`](../AGENTS.md#L123-L150), [root scripts](../package.json#L62-L71)).
No verification command was run for this read-only research task.

## Likely reviewer findings

- A second evaluator, service builder, startup catalog, schema graph, or
  executable root rather than refactoring the existing owners.
- A full or identity-allowlisted catalog presented as the level-1-and-2 complete
  graph/reference projection.
- Identity hashing a lookalike projection instead of the actual parsed service
  input; self-referential or order/concatenation-ambiguous digest input; or
  accidentally binding fixtures/receipts outside the accepted identity scope.
- `JSON.parse`/per-Case decode in transport code, fail-fast collection decoding,
  primitive `string` identity, optional success/error fields, or throwing on a
  normal decode/domain failure.
- Writing one Trace before a later Case defects, converting the defect into a
  decode/domain rejection, or continuing after the defect.
- UTF-8 replacement decoding, chunk-sensitive line splitting, blank-line
  keepalives, dropping the unterminated final frame, or retaining prior frame
  state.
- Packaging that relies on source CWD, workspace symlinks, externalized
  workspace packages, source maps/comments/paths, `node_modules`, or a network
  fetch.
- A test-only production defect trigger, stored corpus Trace as oracle, or tests
  that merely assert compile-time guarantees instead of black-box behavior.
- Failure to update the now-contradictory package and root architecture owners.
