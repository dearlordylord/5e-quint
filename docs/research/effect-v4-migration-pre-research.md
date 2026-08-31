# Effect v4 migration pre-research

> **Research evidence, not architecture authority.** This note records primary-source
> findings for planning a later Effect v3 to v4 migration. Stable product structure
> belongs in [`ARCHITECTURE.md`](../../ARCHITECTURE.md), as routed by
> [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md).

Research checked: 2026-08-25.

## Question

What can this repository reuse from the completed Effect v3 to v4 migration in the
sibling Huly MCP checkout, and what must be researched or designed specifically for
this repository before implementation tickets are issued?

This note uses only primary sources: the two repositories' manifests, source, tests,
checked-in migration evidence, and git history, plus the exact upstream Effect source
and migration guides pinned by Huly MCP. Huly MCP is implementation precedent, not
the authority for the Effect version this repository should choose now.

## Executive finding

The reusable part of Huly MCP's migration is its **control strategy**, not its exact
package pins or edit list:

1. freeze an Effect 3 behavioral baseline before changing dependencies;
2. pin and verify one exact Effect 4 cohort;
3. accept one explicitly measured controlled-red interval on an integration branch;
4. establish shared semantic seams before broad edits;
5. migrate coherent domain families with focused runnable evidence;
6. restore whole-tree typecheck, tests, public protocol parity, and packaged-artifact
   certification before contraction and release.

This repository has a larger and differently shaped migration surface. Its dominant
facts are 701 Effect-importing TypeScript files, 276 Schema-using files, 5,052
`Schema.Literal` calls, 3,114 `Schema.Struct` calls, 560 `Schema.Union` calls, 409
`Schema.decodeUnknownEither` calls, 319 `Schema.optionalWith` calls, and thousands of
direct `Either` operations. Effect v4 replaces `Either` with `Result`; the pinned
upstream import map says `effect/Either -> effect/Result`, while Schema's Either
decoder becomes an Exit decoder. This makes the Result/Schema boundary a first-order
wide refactor here, not a minor follow-up.

The migration should therefore use an integration branch with package- or
domain-sized batches and a final integrate-and-verify ticket. It should not promise
that every intermediate batch keeps the whole workspace green after the dependency
cutover. Each batch can still require focused typecheck and tests, and the final
contraction must prove that no Effect 3 packages, imports, APIs, or temporary migration
exceptions remain.

No target Effect 4 version is selected by this research. Huly MCP used
`4.0.0-rc.108` on 2026-08-12; copying that historical RC in 2026-08-25 would be an
unsupported inference. Version and Node-runtime selection need their own exact-cohort
research against the currently intended packages and lockfile.

The npm registry reported `effect`'s `rc` tag as `4.0.0-rc.112` on the research
date, while `latest` still named Effect 3.22.1. The same `rc.112` tag existed for
`@effect/platform-node` and `@effect/vitest`. This establishes the available cohort,
not the repository's selected target; an implementation ticket must pin and inspect
the exact chosen artifacts instead of following a moving tag.

## Huly MCP: exact migration range and graph

The immutable Effect 3 product baseline was tag commit
`ffdb965a66f635eabbba65e51f061606b13b49cb`. The migration work began with the
baseline-oracle commit `5a5d1aa7acee408dc710d2f77652b0b5726cdad0` and ended with
release-parity certification commit `15339876559c72f88dfe9b72e851d3ba08a9c5a2`.
The dependency cutover itself began one commit later at
`fd5b80bb07e154455a2e5aae5e5834f3d4d77532`. The first release tags after the
migration were produced at `5ea4a46`.

The git graph is material. The main migration line was linear from the oracle through
transport/CLI certification, while an independently developed stdio-shutdown change
(`78a45e7`) was merged at `143609d` before clean-consumer and final parity checks:

```text
ffdb965  Effect 3 release baseline
   |
5a5d1aa  capture Effect 3 behavioral oracle
fd5b80b  cut over dependency cohort (controlled red)
c9a0d99  establish v4 test primitives
b74ce5a  establish Schema and Draft-07 foundation
c8f0e62  centralize Cause/Exit interpretation
1fd1222  migrate service declarations
410f623  migrate configuration and telemetry
514577b  migrate client/resource lifecycle
0fa06c8  migrate first domain vertical
ad9da6f  migrate domain wave
887f532  migrate specialist/administration wave
933e4c1  migrate registry and schema corpus
a6412a5  migrate transports and CLI
74850c7  migration certification
   |\
   | 78a45e7  bounded stdio shutdown from the baseline branch
143609d  merge and reconcile
496943e  clean-consumer certification
1533987  final live and release parity certification
```

This is directly reproducible with:

```bash
git -C ../hulymcp log --graph --oneline --boundary ffdb965..1533987
git -C ../hulymcp log --reverse --oneline ffdb965..1533987
```

The preserved owner for the sequence, focused commands, diagnostic counts, and
closure status is Huly MCP's
[`migration-ledger.md`](https://github.com/dearlordylord/huly-mcp/blob/15339876559c72f88dfe9b72e851d3ba08a9c5a2/docs/migrations/effect-4/migration-ledger.md).
The final user-visible evidence is its
[`final-parity-report.md`](https://github.com/dearlordylord/huly-mcp/blob/15339876559c72f88dfe9b72e851d3ba08a9c5a2/docs/migrations/effect-4/final-parity-report.md).

## What Huly MCP did before the cutover

The oracle commit deliberately preceded the package change. It captured the built
stdio tool-discovery corpus, input and output JSON Schemas, authored composition
constraints, resources, CLI route/help behavior, argument precedence, error streams,
exit statuses, bundle composition, and representative invalid requests. Object keys
were canonicalized while observable array order was retained; version-bearing fields
were normalized separately. The checked-in baseline explicitly did not regenerate
after the cutover. See Huly MCP's
[`baseline-certification.md`](https://github.com/dearlordylord/huly-mcp/blob/5a5d1aa7acee408dc710d2f77652b0b5726cdad0/docs/migrations/effect-4/baseline-certification.md)
and commit `5a5d1aa`.

The baseline was honest rather than cosmetically green. Deterministic oracle and
quality checks passed, while several live HTTP, stdio, tool-scope, and packed-CLI
checks already failed or degraded. Those pre-existing failures remained classified
instead of being attributed to Effect 4 later. This distinction is a reusable lesson:
the D&D baseline must record both green deterministic contracts and known-red or
environment-dependent evidence before dependency changes.

## The controlled-red cutover

Commit `fd5b80b` changed the dependency graph first and measured the resulting state.
For Huly MCP, the initial state was:

- build failure from the removed `@effect/platform` package;
- 10,022 TypeScript diagnostics in 538 files;
- Effect diagnostics that timed out after 120 seconds without a payload; and
- 252 failed and 13 passed Vitest files, with 250 failures caused during collection.

The ledger classified compiler failures by removed packages, Schema construction and
metadata, parsers/JSON Schema, services/layers/config, Effect runtime combinators,
Cause/Exit, and test APIs. It preserved raw command recipes for regenerating counts
without checking large compiler logs into git. The team did not run the already-known
failing aggregate gate merely to create more downstream noise.

The useful planning lesson is not “red builds are acceptable” in general. It is that
a v3/v4 dependency cutover can be a wide refactor for which no independently green
call-site batch exists. If this repository chooses the same approach, the exception
must be explicit, measured, short-lived, isolated to the migration branch, and closed
by a whole-tree verification ticket. Huly MCP's closed-ledger rule restored the full
gate as mandatory after convergence.

## API and semantic changes Huly MCP actually encountered

### Package graph and runtime

At its historical target, Huly MCP removed direct `@effect/cli` and
`@effect/platform`, moved those imports under `effect/unstable/*`, aligned remaining
Effect packages to exact `4.0.0-rc.108`, upgraded Effect-aware testing/tooling, and
verified one lockfile cohort in CI. Its Node support policy changed because the exact
platform dependency graph imposed a newer runtime floor. See commit `fd5b80b`, the
manifest diff `ffdb965..1533987`, and Huly MCP's
[`effect.md`](https://github.com/dearlordylord/huly-mcp/blob/15339876559c72f88dfe9b72e851d3ba08a9c5a2/docs/mcps/effect.md).

The upstream migration overview says v4 aligns Effect ecosystem versions, consolidates
many packages into `effect`, and reserves `effect/unstable/*` for unstable modules.
The exact source used by Huly MCP is commit
`bef7bf38ae4b73d5511043f707aed083de5da7cc`; its checked-in overview is
[`MIGRATION.md`](https://github.com/Effect-TS/effect/blob/bef7bf38ae4b73d5511043f707aed083de5da7cc/MIGRATION.md).

### Schema and JSON Schema

The exact upstream map and Schema guide require structural changes, including:

- `Schema.Union(a, b)` to `Schema.Union([a, b])`;
- multi-value `Schema.Literal(...)` to `Schema.Literals([...])`;
- `.annotations(...)` to `.annotate(...)`;
- `Schema.filter` to `Schema.check(Schema.makeFilter(...))` or a refinement;
- `Schema.int`, `positive`, and `nonNegative` to named v4 checks;
- `Schema.extend` to field-map assignment;
- `Schema.optionalWith` to a choice among `optional`, `optionalKey`, and explicit
  default/nullable transformations; and
- `Schema.decodeUnknownEither` to an Exit/Result-aware decoder, depending on the exact
  chosen cohort API.

The mappings are owned by the pinned upstream
[`schema.md`](https://github.com/Effect-TS/effect/blob/bef7bf38ae4b73d5511043f707aed083de5da7cc/migration/schema.md)
and the targeted entries in
[`v3-to-v4.md`](https://github.com/Effect-TS/effect/blob/bef7bf38ae4b73d5511043f707aed083de5da7cc/migration/v3-to-v4.md).
The migration skill explicitly requires searching the generated map per symbol and
then confirming the exact installed declaration; it prohibits invented APIs, casts,
and v3-shaped compatibility facades. See the pinned
[`effect-v3-to-v4` skill](https://github.com/Effect-TS/skills/blob/28822c9e19998876a6b0e0d97877442012ed4391/skills/effect-v3-to-v4/SKILL.md).

Huly MCP established one project-owned public JSON Schema adapter before migrating
the domain corpus. Effect performed the canonical Draft-07 conversion; the adapter
restored the existing MCP packaging, references, descriptions, and authored
constraints. It then compared the entire emitted corpus rather than assuming that a
type-correct Schema rewrite preserved client-visible JSON Schema. The final reviewed
corpus contained 21,086 explicitly classified structural differences. See commits
`b74ce5a`, `933e4c1`, and `74850c7`, plus
[`behavioral-oracle-delta-review.md`](https://github.com/dearlordylord/huly-mcp/blob/15339876559c72f88dfe9b72e851d3ba08a9c5a2/docs/migrations/effect-4/behavioral-oracle-delta-review.md).

### Result, Cause, Exit, and Promise boundaries

The upstream v4 import map replaces `Either` with `Result`; Schema parsing moves away
from Either-shaped parse results. Cause is flattened into an ordered `reasons` array,
and the old sequential/parallel tree distinction disappears. Runtime containers are
removed in favor of run functions on `Effect` with explicit services/contexts.
Primary owners are the pinned upstream
[`cause.md`](https://github.com/Effect-TS/effect/blob/bef7bf38ae4b73d5511043f707aed083de5da7cc/migration/cause.md),
[`runtime.md`](https://github.com/Effect-TS/effect/blob/bef7bf38ae4b73d5511043f707aed083de5da7cc/migration/runtime.md),
and generated import map.

Huly MCP centralized Cause/Exit interpretation before migrating downstream domains.
Promise and protocol boundaries used `runPromiseExit` and inspected `Exit` directly
instead of depending on framework-specific rejected-error wrappers. This reduced
distant coupling to Cause internals and kept secret-free error rendering in one seam.
See commit `c8f0e62` and Huly MCP's `src/runtime/cause-exit.ts` at that commit.

### Services, layers, resources, and concurrency

The upstream service guide replaces `Context.Tag`/`Effect.Service` with
`Context.Service`; v4 no longer generates the same implicit service layers. Layer
memoization is shared across separate `Effect.provide` calls unless isolation is
requested. `Scope.extend` becomes `Scope.provide`. Yieldable values such as `Ref`,
`Deferred`, and `Fiber` are no longer Effect subtypes and require explicit operations
such as `Ref.get`, `Deferred.await`, and `Fiber.join`. See the pinned upstream
[`services.md`](https://github.com/Effect-TS/effect/blob/bef7bf38ae4b73d5511043f707aed083de5da7cc/migration/services.md),
[`layer-memoization.md`](https://github.com/Effect-TS/effect/blob/bef7bf38ae4b73d5511043f707aed083de5da7cc/migration/layer-memoization.md),
[`scope.md`](https://github.com/Effect-TS/effect/blob/bef7bf38ae4b73d5511043f707aed083de5da7cc/migration/scope.md), and
[`yieldable.md`](https://github.com/Effect-TS/effect/blob/bef7bf38ae4b73d5511043f707aed083de5da7cc/migration/yieldable.md).

Huly MCP migrated declarations before resource consumers because restoring service
shapes removed a large cascade of unrelated diagnostics. It separately proved client
acquisition, exact-once release, interruption, scope ownership, request isolation,
and layer acquisition counts. Its concurrency tests replaced scheduler guesses and
wall-clock sleeps with `Deferred`, `Latch`, `Ref`, `TestClock`, and explicit fiber
ownership. See commits `1fd1222`, `514577b`, and `c9a0d99`, plus
[`testing-primitives.md`](https://github.com/dearlordylord/huly-mcp/blob/15339876559c72f88dfe9b72e851d3ba08a9c5a2/docs/migrations/effect-4/testing-primitives.md).

### Platform, CLI, and lifecycle

Huly MCP treated HTTP and CLI as semantic migrations rather than import renames.
The HTTP rewrite re-proved listener acquisition, readiness, request scopes,
authentication, shutdown, and finalizers. The CLI rewrite retained catalog-owned
routes/help, raw-argument precedence, error streams, and exit statuses despite a new
framework. The stdio process change separately proved EOF ownership loss, response
drain, bounded cleanup, and actual child exit. See commits `a6412a5` and `78a45e7` and
the #226-#228 sections of the migration ledger.

## Verification and review strategy that converged

Huly MCP used four nested evidence levels:

1. **per-slice focused tests and diagnostics** while the whole tree was controlled
   red;
2. **whole-tree compiler and strict Effect diagnostics** after domain convergence;
3. **deterministic public-contract comparison**, including all emitted MCP/CLI Schema
   and lifecycle behavior; and
4. **artifact and live certification**, including packed installs in clean pnpm and
   npm consumers on two Node lines, executable behavior, dependency closure, stdio,
   HTTP, and local-Huly integration.

The final gate passed 289 test files and 4,278 tests with the existing 99% coverage
thresholds. Clean consumers ran packaged artifacts rather than workspace builds.
These facts are recorded in commits `496943e` and `1533987` and in the final parity
report.

Review was iterative. The final live matrix found four defects that focused and
deterministic checks had missed: inherited/proxy-backed object fields at a Schema
boundary, request-local client identity, stdout/stderr separation, and unbounded
client cleanup. Immediately after the nominal parity commit, four more commits fixed
release certification arguments, pnpm dependency-graph auditing, bundled-script
dependency resolution, and stale generated artifact evidence before the release tag.
Therefore “whole workspace green” is necessary but not sufficient; packaging and
real boundary execution need independent evidence.

## This repository's current migration surface

The current root and workspace manifests install Effect 3.21.5. The root also
declares the independently versioned v3 packages `@effect/cli`, `@effect/platform`,
`@effect/platform-node`, `@effect/printer`, `@effect/printer-ansi`, and
`@effect/typeclass`; package manifests repeat `effect` ranges and MCP repeats
`@effect/platform-node`. These facts are in [`package.json`](../../package.json) and
the package manifests under [`packages/`](../../packages/).

`pnpm list -r --depth 0` currently resolves all workspace `effect` dependencies to
3.21.5, root `@effect/platform-node` to 0.106.0, and the MCP package to the same
platform-node version. Root printer/typeclass dependencies have no TypeScript import
matches under `packages` or `scripts` and should be audited for scripts/configuration
or removed before treating them as migration work.

The clean Effect 3 worktree at `76d9abaf0ec9c8369d5f95f603c5cce88704d26e`
passes the public `pnpm typecheck` command (13 of 13 package tasks). That is the
compiler baseline only; the pre-cutover oracle ticket must still run and record the
broader public gates.

There is also a cross-repository package gate, but it is already substantially
implemented. Six workspace packages consume stable `@firfi/quint-connect@2.1.0`,
whose published peer contract is `effect@^3.0.0`. The open, draft, mergeable
[`quint-connect` PR #23](https://github.com/dearlordylord/quint-connect-ts/pull/23)
migrates its existing Effect 4 prerelease line from beta.99 to exact `rc.108`, raises
the peer range to `^4.0.0-rc.108`, aligns `@effect/vitest`, and reports one resolved
Effect instance. Its Linux MBT, Windows lifecycle, and packed Node consumer checks
all pass. The PR already consumes published
`@firfi/itf-trace-parser@0.2.0-effect4.1`; that parser's Effect 4 peer range accepts
the RC and PR #23's lockfile resolves it against the same `rc.108` instance. A
separate parser release is therefore not currently required.

The underlying Effect 4 line is not speculative: its beta.99 parity work landed in
[`quint-connect` PR #13](https://github.com/dearlordylord/quint-connect-ts/pull/13),
its Windows lifecycle coverage landed in
[`PR #22`](https://github.com/dearlordylord/quint-connect-ts/pull/22), and npm's
`effect4` tag currently publishes `@firfi/quint-connect@2.0.2-effect4.1`. The open
gap is only that the published tag still contains the beta.99 cohort because PR #23
has not yet landed and released.

The remaining gate is to finish PR #23 against the cohort selected for this
repository and publish its changeset release. If this repository selects a newer RC
such as the currently tagged `rc.112`, the PR's exact direct Effect dependency and
tests must first be advanced to that same version; relying only on its permissive
peer range would retain `rc.108` beside the application's selected cohort.

A disposable `rc.112` probe confirmed that failures begin in the lowest shared
package rather than only at MCP/platform edges. `@dnd/shared` alone fails on removed
`Either`, variadic literals, Schema filter/check renames, removed
`NonEmptyTrimmedString`, and changed Brand refinement construction. The whole public
typecheck probe was not run because another checkout held the shared broad-verification
lock; no workspace-wide diagnostic count is claimed here.

Textual measurements over `packages/**/*.ts(x)` and `scripts/**/*.ts(x)` are:

| Surface                               |       Matches | Files / note                                                                            |
| ------------------------------------- | ------------: | --------------------------------------------------------------------------------------- |
| Files importing Effect or `@effect/*` |           701 | across runtime, Surface, MCP, app, and scripts                                          |
| Files containing `Schema` APIs        |           276 | public and internal boundaries                                                          |
| `Schema.Literal`                      |         5,052 | many are variadic from typed value arrays                                               |
| `Schema.Struct`                       |         3,114 | central authored/runtime shape vocabulary                                               |
| `Schema.Union`                        |           560 | v4 requires array members                                                               |
| `Schema.decodeUnknownEither`          |           409 | v4 changes both decoder and result container                                            |
| `Schema.optionalWith`                 |           319 | predominantly exact optional keys; at least 3 also decode defaults                      |
| `Schema.filter`                       |            82 | check/refinement migration                                                              |
| `Schema.extend`                       |            33 | field-composition migration                                                             |
| `JSONSchema.make`                     |             3 | public MCP and raw-swarm schema generation                                              |
| `ParseResult` text                    |            94 | 17 files; includes project-local types and upstream imports, so classify before editing |
| Direct `Either.isLeft`                |         2,670 | widespread control flow                                                                 |
| Direct `Either.left` / `right`        | 1,516 / 1,269 | wide Result migration                                                                   |
| `Match.exhaustive`                    |           452 | Match remains, but matcher container APIs must be checked individually                  |
| Actual platform-node entrypoints      |             2 | MCP and raw-swarm `NodeRuntime.runMain`                                                 |
| `Effect.runFork`                      |             4 | concentrated in MCP admin/stdio lifecycle                                               |
| `Effect.catchAllCause`                |             1 | MCP server boundary                                                                     |

These are planning signals, not acceptance counts. Identifiers such as `Effect`,
`Ref`, `Option`, and `Context` also exist in the D&D domain, so broad regex counts for
those names contain false positives. Every implementation ticket should use compiler
diagnostics and exact import ownership rather than global text replacement.

The blast radius is not evenly distributed. Effect-importing file counts are roughly
303 in `@dnd/battle-runtime`, 102 in `@dnd/mcp`, 83 in scripts, 69 in
`@dnd/character-sheet-runtime`, 60 in `@dnd/character-creation-runtime`, and 24 in
`@dnd/surface`; the remaining runtime and shared packages are smaller. The package map
and ownership boundaries are defined by [`ARCHITECTURE.md`](../../ARCHITECTURE.md),
not by this migration.

## D&D-specific compatibility seams

### Surface and runtime parsing

Effect Schema is not incidental here. Surface authored records, runtime protocol
facts, persisted play sessions, generated artifacts, and raw-swarm evidence all use
it. The migration must preserve authored identity/provenance boundaries and exact
optional-state meaning; an indiscriminate `optionalWith -> optional` rewrite would
violate project design. The current canonical exact-optional helper is visible in
[`schema-helpers.ts`](../../packages/surface/src/surface/schema-helpers.ts), while a
small number of Surface fields combine exact absence with decoding defaults and need
separate treatment.

### Public MCP JSON Schema

`@dnd/mcp` already owns one JSON Schema conversion seam in
[`schema-codec.ts`](../../packages/mcp/src/schema-codec.ts). It generates MCP input,
output, and model-facing projections, strips schema ids, preserves closed objects,
prunes impossible/unreferenced properties, and assigns stable output ids. The MCP
README states that exact Effect Schema remains the runtime encoder and boundary
authority while generated JSON Schema is a client contract. This is the natural
place to establish and certify v4 dialect conversion; adding a parallel converter
would contradict the repository's single-source design.

Before cutover, capture a deterministic corpus for every registered MCP tool's input,
output, and model-facing schema, including `$id`, `$ref`/definitions, descriptions,
required fields, `additionalProperties`, impossible-property pruning, authored
composition constraints, and public order where observable. Existing MCP protocol,
HTTP/stdio parity, schema codec, and acceptance tests should remain the behavioral
owners rather than being copied into a migration-only test universe. See
[`packages/mcp/README.md`](../../packages/mcp/README.md) and
[`packages/mcp/src/schema-codec.test.ts`](../../packages/mcp/src/schema-codec.test.ts).

### Result as a domain-wide protocol change

The project deliberately uses `Either` for runtime/domain failures. Effect v4's
`Result` replacement therefore changes a ubiquitous protocol across package APIs,
tests, reducer results, MCP adapters, scripts, and properties. This is the largest
departure from Huly MCP's ticket shape. Plan it as an explicit wide refactor with one
canonical v4 shape, not an adapter that preserves `Either` names or a mixed permanent
state. Migration batches should follow package dependency direction so lower-level
result types settle before their consumers.

### MCP and process lifecycle

The Effectful process surface is concentrated in `@dnd/mcp` and the raw-swarm battle
slice server. `@dnd/mcp` owns HTTP/stdio parity, public OAuth, persistent sessions,
admin mirroring, and stream/pubsub behavior, so it still requires a lifecycle tracer
bullet even though there are fewer Effect runtime calls than Huly MCP had. Re-prove
readiness, request isolation, interruption, response drain, process signals, and
exact-once store/database cleanup instead of assuming unchanged tests cover new fiber
semantics.

## Recommended pre-plan shape

The following is a planning recommendation, not an implementation specification:

1. **Select and pin the target cohort.** Verify the exact current Effect 4 packages,
   Node engines, Vitest compatibility, removed packages, local source reference, and
   the compatible `quint-connect` prerelease line. Add a
   lockfile/cohort verifier before migration edits.
2. **Capture the Effect 3 oracle.** Freeze public MCP Schema/protocol behavior,
   Surface publication and content-sync outputs, persisted-session decoding fixtures,
   raw-swarm artifacts, representative reducer results, current package builds, and
   the full `pnpm quality` result. Record known reds separately.
3. **Cut over and inventory.** Change manifests/lockfile once, run the public build,
   `pnpm typecheck`, focused Effect diagnostics if present, and test collection, then
   record exhaustive failure families. Do not run raw Turbo or bypass the repository's
   broad verification lock.
4. **Establish foundations.** Migrate the canonical Result/parse-result shape, Surface
   Schema helpers and exact optional semantics, MCP JSON Schema conversion, and
   concurrency/lifecycle testing primitives before mass edits.
5. **Migrate in dependency order.** A plausible sequence is shared/shared-algebras and
   Surface; character creation/sheet/battle runtime families; character-battle
   composition; MCP; app; and scripts/raw-swarm. Split the large battle runtime by
   coherent procedure families only where each batch has focused runnable evidence.
6. **Migrate platform/lifecycle as a tracer bullet.** Rebuild MCP and raw-swarm
   entrypoints against the exact v4 platform APIs and prove stdio, HTTP, OAuth,
   streaming/admin mirrors, shutdown, and cleanup.
7. **Converge reviewers and verification.** Repeat API-source lookup, domain/
   architecture, connascence, and code-review passes until findings converge. Restore
   `pnpm typecheck`, `pnpm test`, and `pnpm quality`; then compare the immutable oracle
   and run packaged/container smoke behavior.
8. **Contract.** Remove every Effect 3 package/import/API, temporary controlled-red
   ledger entry, duplicate conversion seam, and migration-only exception. Keep only
   durable contract tests and a short historical parity report.

The broad Result and Schema rewrites may require an integration branch whose batches
are not independently mergeable to master. Tickets should say so explicitly and make
all such batches block one final integrate-and-verify ticket. The foundation and
cohort/oracle tickets can remain independently green before the cutover.

## Risks and follow-up questions

- **Target drift:** Huly MCP's rc.108 signatures are historical. Search the exact
  selected package declarations and its migration source before using any mapping.
- **Quint bridge cohort:** stable `quint-connect` currently requires Effect 3. Finish
  and publish its already-green PR #23 against the selected exact cohort; do not accept
  duplicate Effect runtimes or peer overrides as migration completion. The published
  Effect 4 parser prerelease already resolves with the PR's RC and does not presently
  require a separate release.
- **Either/Result semantics:** left/right and failure/success naming is not only a
  rename; generic parameter ordering, accessors, Match finalizers, Schema errors, and
  serialized/debug representations need focused properties and API review.
- **Exact optionality:** most `optionalWith` uses encode domain distinctions. Preserve
  omitted, explicit `undefined`, defaulted empty collection, and nullable states as
  separate contracts.
- **JSON Schema dialect and metadata:** typecheck cannot detect lost descriptions,
  refs, closed-object behavior, impossible-property pruning, or model-facing
  projection drift.
- **Generated/committed content:** Surface JSON, trace artifacts, documentation, and
  raw-swarm evidence may change bytewise even when runtime meaning is preserved.
  Classify deltas rather than regenerating the baseline.
- **Resource semantics:** v4 yieldability, layer memoization, forking, and process
  keep-alive can change acquisition, startup, test isolation, and shutdown behavior
  without obvious type errors.
- **Verification resources:** this repository's public verification scripts share a
  heavy lock. Exit 137 or SIGKILL is an emergency under repository instructions, not
  permission to retry the migration gate unchanged.
- **Unused root packages:** confirm whether printer, printer-ansi, typeclass, CLI, and
  platform are configuration-only, stale, or consumed outside TypeScript before
  writing migration tickets for them.
- **Packaging:** determine the actual shipped artifacts and clean-consumer matrix for
  this greenfield private workspace; do not blindly copy Huly MCP's npm release gates.

## Reproduction commands

```bash
# Huly MCP history and evidence
git -C ../hulymcp log --graph --oneline --boundary ffdb965..1533987
git -C ../hulymcp diff --stat ffdb965..1533987
git -C ../hulymcp show fd5b80b:docs/migrations/effect-4/migration-ledger.md

# D&D dependency and source inventory
pnpm list -r --depth 0 effect @effect/platform @effect/platform-node
rg -l 'from "(@effect/|effect)' packages scripts --glob '*.ts' --glob '*.tsx'
rg -o 'Schema\.[A-Za-z_$][A-Za-z0-9_$]*' packages scripts \
  --glob '*.ts' --glob '*.tsx' | sort
rg -o 'Either\.[A-Za-z_$][A-Za-z0-9_$]*' packages scripts \
  --glob '*.ts' --glob '*.tsx' | sort

# Exact upstream lookup discipline for each encountered API
rg -n 'Schema\.optionalWith' \
  ../hulymcp/.reference/effect-v4.0.0-rc.108/migration/v3-to-v4.md
rg -n 'Schema\.optionalWith' \
  ../hulymcp/.reference/effect-v4.0.0-rc.108/migration/schema.md
```
