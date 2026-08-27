# Effect 4 controlled-red ledger

Date: 2026-08-26
Issue: [#371](https://github.com/dearlordylord/5e-quint/issues/371)
Cutover starting point: `fba977c5ed3abf554631ce43c006b5a0ad4c5557`
Environment: Node `v24.18.0`, pnpm `10.29.3`, Linux

Status: the dependency cutover is complete and the cohort gate is green. The
repository remains intentionally controlled-red for downstream Effect 4 API
migration: the current owner sweep records four failing package owners and nine
green owners, including `@dnd/shared-algebras` at zero diagnostics after #374
and `@dnd/surface` at zero after #373. This ledger is evidence, not a waiver,
and does not claim product or rule behavior is green.

## Scope and ownership

This issue owns the workspace dependency cutover, lockfile regeneration, the
cohort verifier and root quality gate, the selected Node/tool policy, and this
ledger. The #374 shared-algebra source, test, connector, and bridge migration
is complete in this refresh. The remaining source and test API migration is
downstream work owned by #375 and later issues. No D&D rule behavior, Quint
model behavior, authored identity, or Effect 3 behavioral-oracle output was
changed here.

The baseline oracle remains the authority for migration parity:
[`baseline-certification.md`](./baseline-certification.md) and
[`effect3-behavioral-oracle.json`](./effect3-behavioral-oracle.json).

The remaining `effect/Either` imports and v3-shaped schemas are intentionally
not changed by this cutover or #374. They are the downstream source/test
migration owned by #375 and later issues; this ledger makes their red state
explicit so the dependency gate can be activated without a compatibility
facade, cast, or waiver.

## Selected cohort and invariants

The following values are exact. The canonical probe in
[`docs/research/effect4-cohort-probe/`](../../research/effect4-cohort-probe/)
is the source for the Effect 4 cohort; the published Quint Connect release is
the repository catalog dependency used by D&D workspaces.

| Dependency or policy      | Required value                                                             | Evidence or rationale                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `effect`                  | `4.0.0-rc.112`                                                             | Direct dependency in every Effect-consuming workspace and the only lockfile `effect` version.                                                     |
| `@effect/platform-node`   | `4.0.0-rc.112`                                                             | Direct MCP/root dependency; its `@effect/platform-node-shared` peer package is the same release.                                                  |
| `@effect/vitest`          | `4.0.0-rc.112`                                                             | Retained v4 test integration package.                                                                                                             |
| `@firfi/quint-connect`    | `2.0.2-effect4.2`                                                          | Exact `pnpm-workspace.yaml` catalog value and exact lockfile package/snapshot.                                                                    |
| `@firfi/itf-trace-parser` | `0.2.0-effect4.1`                                                          | Canonical probe support package.                                                                                                                  |
| Vitest                    | `4.1.11`                                                                   | Exact direct tool dependency and lockfile version.                                                                                                |
| TypeScript                | `5.9.3`                                                                    | Exact direct compiler cohort.                                                                                                                     |
| `@types/node`             | `22.19.15`                                                                 | Exact selected Node declaration package.                                                                                                          |
| Redis                     | `6.2.1`                                                                    | Exact peer-compatible probe/runtime package.                                                                                                      |
| Node                      | `>=22.19.0`                                                                | Repository engine and CI/container floor required by the selected cohort.                                                                         |
| pnpm                      | `10.29.3`                                                                  | Exact root `packageManager`, resolved and checked by the verifier.                                                                                |
| `@typescript/native`      | `npm:typescript@^7.0.2`, resolved `typescript@7.0.2`                       | Deliberate native compiler alias outside the selected direct TypeScript cohort; the verifier allows only this additional TypeScript lock version. |
| Public MCP container      | `node:22.19.0-bookworm-slim`, Corepack pnpm `10.29.3`, strict-peer install | Runtime/container policy is aligned with the workspace, not just CI and the development image.                                                    |

The consolidated and unused direct Effect 3 packages are absent:
`@effect/cli`, `@effect/platform`, `@effect/printer`,
`@effect/printer-ansi`, and `@effect/typeclass`. The lockfile also has no
Effect 3 package or unsupported `@effect/*` package.

The executable invariant is:

```sh
pnpm check:effect4-cohort:self-test
pnpm check:effect4-cohort
```

Both commands passed. The root `quality:body` invokes both checks before the
build gate. The verifier self-tests nested workspace discovery, exact direct
pins, published catalog and direct-version drift, importer and snapshot
resolution drift, hidden/escaped lockfile Effect references, unsupported
Effect packages, the intentional TypeScript native alias, the required
Quint Connect manifest consumer, and missing lockfile sections.

## Installation and declaration evidence

| Command                                                                                                                                               | Result | Recorded evidence                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile --strict-peer-dependencies`                                                                                           | pass   | Installed 897 packages with pnpm `10.29.3`; the lockfile was accepted without peer errors. pnpm reported only its existing ignored-build-script notice for `msgpackr-extract`, `protobufjs`, and `unrs-resolver`; this was not a resource or verification failure.                             |
| `pnpm check:effect4-cohort:self-test`                                                                                                                 | pass   | `Effect 4 cohort verifier self-tests passed`.                                                                                                                                                                                                                                                  |
| `pnpm check:effect4-cohort`                                                                                                                           | pass   | `Effect 4 cohort verified: 4.0.0-rc.112`.                                                                                                                                                                                                                                                      |
| `pnpm regenerate:effect4-controlled-red`                                                                                                              | pass   | Regenerated [`controlled-red-inventory.json`](./controlled-red-inventory.json) after #375: 24,056 raw and 11,169 source-keyed deduplicated diagnostics; output SHA-256 `03995f44b977526cbe411e2c2d60258adabe3db890806016f9c68a4243b29ec2`.                                                     |
| Installed declaration probe                                                                                                                           | pass   | `effect`, `effect/Result`, `effect/Schema`, `@effect/vitest`, and `@effect/platform-node` loaded from the installed tree; `effect/Either` was absent as required by the v4 declaration surface; `Schema.decodeUnknownResult` was present; D&D resolved `@firfi/quint-connect@2.0.2-effect4.2`. |
| `node --check scripts/check-effect4-cohort.mjs`                                                                                                       | pass   | Verifier parses as valid Node module.                                                                                                                                                                                                                                                          |
| `node --check scripts/regenerate-effect4-controlled-red.mjs`                                                                                          | pass   | Inventory generator parses as valid Node module.                                                                                                                                                                                                                                               |
| `pnpm exec eslint scripts/check-effect4-cohort.mjs scripts/regenerate-effect4-controlled-red.mjs --max-warnings=0 --report-unused-disable-directives` | pass   | No diagnostics.                                                                                                                                                                                                                                                                                |
| Focused Prettier check over changed JSON/YAML/MJS/Markdown/workspace manifests                                                                        | pass   | All selected files use Prettier code style.                                                                                                                                                                                                                                                    |

## Public gate classification (initial cutover snapshot)

The following is the initial post-cutover snapshot, retained as historical
evidence from before the #372 and #373 downstream source migrations. Each
public workspace command acquired and released the repository broad lock
through its own documented wrapper. The historical owner status is recorded in
the regenerated inventory below.

| Command          | Result       | Controlled-red classification                                                                                                                                                                                                                                    |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`     | fail, exit 1 | `@dnd/app` transformed 662 modules, then Rollup could not resolve `effect/Either` imported by `packages/battle-runtime/src/stat-block-execution.ts`. This is the module-entrypoint family.                                                                       |
| `pnpm typecheck` | fail, exit 1 | Turbo stopped at `@dnd/shared`. The first public owner emitted 84 diagnostics: TS18046 2, TS2305 3, TS2307 1, TS2339 10, TS2345 20, TS2551 41, TS2554 5, and TS7006 2. This is expected v3-to-v4 API and inference fallout, not a dependency-resolution failure. |
| `pnpm test`      | fail, exit 1 | `@dnd/tactical-space` passed 1 file/53 tests. `@dnd/shared` then stopped the lane with two failed suites and zero collected tests: `Schema.int is not a function` and missing `effect/Either`.                                                                   |

The build and test failures are intentionally recorded at their first public
stop point in that historical snapshot. The owner sweep below is also retained
as historical #375 evidence; the current #376 regenerated inventory is recorded
in the later Issue #376 evidence snapshot.

## Exhaustive typecheck inventory (historical #375 snapshot)

The owner sweep, totals, and tables in this subsection are retained historical
#375 evidence and are not the current #376 counts.

The canonical regeneration command is
`pnpm regenerate:effect4-controlled-red`. Its public script acquires the
repository broad lock, and its body asserts that lock before running
[`regenerate-effect4-controlled-red.mjs`](../../../scripts/regenerate-effect4-controlled-red.mjs).
The committed output is
[`controlled-red-inventory.json`](./controlled-red-inventory.json). The script
discovers each `packages/*` manifest with a `typecheck` script, runs those
owners serially with `--pretty false`, and classifies every TypeScript code
into the disjoint families below. It deduplicates on source path, line, column,
code, and complete diagnostic message. Re-running the command regenerates the
output used by this ledger; no totals below are an independent baseline.

The inventory ran each workspace `typecheck` script once in this order:

```text
@dnd/app
@dnd/battle-runtime
@dnd/character-battle-runtime
@dnd/character-creation-runtime
@dnd/character-sheet-runtime
@dnd/mcp
@dnd/shared
@dnd/shared-algebras
@dnd/surface
@dnd/tactical-adjudicator-prototype
@dnd/tactical-space
@dnd/tactical-space-cli-prototype
@dnd/tactical-space-prototype
```

The four prototype/tactical owners, `@dnd/shared`, `@dnd/shared-algebras`,
`@dnd/surface`, and `@dnd/character-creation-runtime` passed. The five
remaining Effect-consuming owners failed. The
raw counts below are
the committed output's per-command counts; workspace-linked source is repeated
when a dependent package typechecks it.
The deduplicated count is the durable closure baseline from the same output.

| Package command owner             | Raw diagnostics |
| --------------------------------- | --------------: |
| `@dnd/app`                        |           4,426 |
| `@dnd/battle-runtime`             |           7,723 |
| `@dnd/character-battle-runtime`   |           5,169 |
| `@dnd/character-creation-runtime` |               0 |
| `@dnd/character-sheet-runtime`    |           1,365 |
| `@dnd/mcp`                        |           5,373 |
| `@dnd/shared`                     |               0 |
| `@dnd/shared-algebras`            |               0 |
| `@dnd/surface`                    |               0 |
| Four prototype/tactical owners    |               0 |
| **Raw total**                     |      **24,056** |

The raw total contains repeated linked-source diagnostics. After deduplication
there are **11,169** diagnostics. The retained
`scripts/effect3-baseline.ts` oracle remains included because it is imported by
MCP; the output is authoritative for the complete source-keyed total.

### Family totals

Families are disjoint by TypeScript code. “API members” includes removed or
renamed v3 members such as `Schema.int`, `Schema.optionalWith`,
`Schema.decodeUnknownEither`, and `Brand.refined`; “schema/type signatures”
captures declaration/generic/call-shape changes; the final family is the
downstream strict-inference and control-flow cascade. Counts are raw repeated
output followed by deduplicated output.

| Diagnostic family                  | Codes                                                                                  |        Raw | Deduplicated |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ---------: | -----------: |
| Removed/renamed module entrypoints | TS2305, TS2307                                                                         |        731 |          357 |
| Removed/renamed Effect API members | TS2551, TS2694, TS2724                                                                 |      1,797 |          692 |
| Changed schema/type signatures     | TS2314, TS2344, TS2394, TS2554, TS2556, TS2558, TS2560, TS2740, TS2741, TS2749, TS2769 |      2,060 |          671 |
| Downstream type/inference cascade  | All remaining codes below                                                              |     19,468 |        9,449 |
| **Total**                          | **All diagnostics**                                                                    | **24,056** |   **11,169** |

The five workspace owners still affected by the family inventory are
`@dnd/app`, `@dnd/battle-runtime`, `@dnd/character-battle-runtime`,
`@dnd/character-sheet-runtime`, and `@dnd/mcp`.

### TypeScript code counts

This is the complete code-level inventory from the owner sweep. Raw counts
include dependent-source repetition; deduplicated counts are the closure
baseline.

| Code    |   Raw | Deduplicated |
| ------- | ----: | -----------: |
| TS1360  |     2 |            2 |
| TS18046 | 5,122 |        3,346 |
| TS18047 |   341 |          113 |
| TS18048 |    36 |            9 |
| TS2305  |   543 |          271 |
| TS2307  |   188 |           86 |
| TS2314  |    44 |           17 |
| TS2322  | 2,584 |        1,214 |
| TS2339  | 7,436 |        2,718 |
| TS2344  |     5 |            2 |
| TS2345  | 1,580 |          717 |
| TS2352  |     1 |            1 |
| TS2353  |   331 |           94 |
| TS2367  |     5 |            2 |
| TS2375  |     2 |            2 |
| TS2379  |     8 |            2 |
| TS2488  |     6 |            3 |
| TS2551  | 1,734 |          665 |
| TS2554  | 1,331 |          385 |
| TS2556  |    40 |           13 |
| TS2560  |    12 |            4 |
| TS2571  |   358 |          349 |
| TS2638  |     7 |            7 |
| TS2694  |    46 |           22 |
| TS2698  |   322 |          268 |
| TS2700  |     1 |            1 |
| TS2724  |    17 |            5 |
| TS2739  |    16 |            4 |
| TS2740  |   537 |          161 |
| TS2741  |     3 |            3 |
| TS2749  |     7 |            5 |
| TS2769  |    81 |           81 |
| TS7006  | 1,181 |          542 |
| TS7031  |    86 |           44 |
| TS7053  |    43 |           11 |

## Focused reproductions and owners

These commands reproduce a representative diagnostic in each still-red family.
They intentionally remain red until the owning downstream migration lands.

| Family                         | Focused reproduction                                                                                                                                                                                             | Current owner and closure work                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Removed module entrypoints     | `pnpm --filter @dnd/app run build`                                                                                                                                                                               | #375+ must replace remaining `effect/Either` entrypoints at their owning package boundaries.                                                  |
| Removed/renamed API members    | `pnpm --filter @dnd/app typecheck`; `rg -n -e 'Schema\.int' -e 'Schema\.greaterThanOrEqualTo' -e 'Schema\.optionalWith' -e 'Schema\.decodeUnknownEither' -e 'Brand\.refined' -e 'Brand\.error' packages scripts` | #375+ owns the remaining v4 Schema/Brand/Result API migration with no compatibility facade or casts.                                          |
| Changed schema/type signatures | `pnpm --filter @dnd/app typecheck`                                                                                                                                                                               | Each downstream owner must adopt exact installed v4 signatures and preserve the #368 oracle.                                                  |
| Inference/control-flow cascade | `pnpm --filter @dnd/battle-runtime typecheck`; `pnpm --filter @dnd/character-sheet-runtime typecheck`                                                                                                            | #375+ must resolve v4 narrowing and downstream types at their canonical source owners; do not suppress diagnostics.                           |
| Test collection/runtime        | `pnpm --filter @dnd/app test`                                                                                                                                                                                    | `@dnd/shared`, `@dnd/shared-algebras`, and `@dnd/surface` are green; #375+ must restore collection and behavior parity for downstream owners. |

## Issue #372 closure evidence

The shared owner now has zero diagnostics. Its canonical brands use Effect 4
`Brand.make`, its schemas use Effect 4 checks and `Schema.Literals`, and its
typed failure protocols use `Result.Result<Success, Failure>` with
`succeed`/`fail` and success/failure narrowing. The literal constructors derive
their accepted values from typed `as const` arrays and no migration cast,
compatibility alias, duplicate primitive, or diagnostic waiver was added.

`pnpm --filter @dnd/shared typecheck --pretty false` passes. The focused
`pnpm --filter @dnd/shared test` run passes 2 files and 10 tests, including
property coverage for numeric constructors and focused success/failure examples
for collection and elapsed-time parsing. The locked inventory regeneration
records `@dnd/shared` at zero. The latest refresh additionally records
`@dnd/surface` at zero after #373 and `@dnd/shared-algebras` at zero after #374;
remaining diagnostics are owned by #375 through #385.

The first #372 standards/spec/domain/architecture review found two evidence
defects: Result tests checked tags without asserting success/failure payload
accessors, and one remaining-inference ledger row still named `#372+`. The tests
now assert the success value, default `Error` message, custom generic failure
payload, and elapsed-time discriminated failures; the row now names `#373+`.
The repeat independent review found no remaining Effect 4, behavior, domain,
architecture/connascence, cast/facade, duplicate-state, or rule/model-source
issue, so the #372 reviewer loop converged.

The retained baseline oracle is separately reproducible with
`pnpm verify:effect3-baseline`; its one typecheck diagnostic is included in the
inventory because it is imported by the MCP compilation graph, not silently
waived.

## Issue #374 closure evidence

The shared-algebras migration is complete. The locked inventory records
`@dnd/shared-algebras` at `exitCode 0` with `rawDiagnostics 0`; its package
typecheck is green, the focused package test evidence is 14 files and 88 tests,
and the focused MBT evidence is 9/9. The four touched QNT owners also have
bounded witnesses with no invariant violation:

| Owner                                  | Locked witness                                                                                                                                                                                                                                                              | Result                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `action-economy-algebra-inductive.qnt` | `. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-mbt-lock.sh pnpm --dir packages/shared-algebras exec quint verify proofs/action-economy-algebra-inductive.qnt --inductive-invariant invariant --invariant invariant --max-steps 1 --verbosity 1` | pass; no violation found (17,384 ms)                             |
| `conditions-algebra-inductive.qnt`     | `. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-mbt-lock.sh pnpm --dir packages/shared-algebras exec quint verify proofs/conditions-algebra-inductive.qnt --inductive-invariant invariant --invariant invariant --max-steps 1 --verbosity 1`     | pass; no violation found (25,258 ms)                             |
| `death-saves-algebra-inductive.qnt`    | `. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-mbt-lock.sh pnpm --dir packages/shared-algebras exec quint verify proofs/death-saves-algebra-inductive.qnt --inductive-invariant invariant --invariant invariant --max-steps 1 --verbosity 1`    | pass; no violation found (8,977 ms)                              |
| `initiative-algebra-invariant.qnt`     | `pnpm --filter @dnd/shared-algebras proof:initiative`                                                                                                                                                                                                                       | pass; no violation found (1,614 ms; 2,000 samples, max 40 steps) |

The package-wide `proof:inductive` harness was intentionally stopped with
SIGINT after the requested shared-algebras modules and while it was entering
unrelated rule-core modules. Its exit 130 is not package-wide proof evidence;
the bounded witnesses above are the #374 proof evidence. No modeled rules,
semantic-core owner mapping, retained oracle, or baseline changed.

## Reviewer-loop record

Round 1 reviewed the initial candidate `8603610d1` against the installed API
declarations and migration guidance, D&D/SRD language, architecture and
connascence, repository standards, and issue #371. It found two gaps: the
public MCP container used a floating Node 22 image without strict-peer
installation, and the cohort verifier checked required lockfile versions in
`packages` but not `snapshots`. The remediation pins
`operations/public-mcp/Dockerfile` to `node:22.19.0-bookworm-slim`, Corepack
pnpm `10.29.3`, and strict peers, and checks both lockfile sections with a
Quint Connect snapshot-drift self-test. Focused declaration, install, cohort,
and syntax checks provided convergence evidence for those findings. The
existing v3-shaped source imports remained the explicit #372+ downstream
boundary; no compatibility facade, cast, or diagnostic waiver was added.

Round 2 reviewed the amended candidate `c5ec2f0c1` across the same axes. It
found that the ledger totals still had no committed executable regeneration
command/output or executable deduplication/family classification, and that the
cohort verifier could pass a project with stale Quint Connect lock entries but
no workspace manifest consumer. It also found that the prior ledger text
claimed review convergence without a fresh post-fix review. This remediation
adds the locked regeneration command and committed output, requires a manifest
consumer with a missing-consumer self-test, and replaces that premature claim
with this record. The two historical rounds are recorded, but final
post-fix convergence remains pending until the fresh complete review below.

The fresh post-fix spec review found one scope error: the manifest-consumer
requirement also rejected the standalone cohort probe, which intentionally has
no Quint Connect dependency. The verifier now applies published-consumer
requirements to pnpm workspaces while retaining version checks for the
standalone probe. The root cohort check, missing-consumer self-test, and probe
verification all pass with that correction.

Historical #371 evidence (not a #374 review): a final independent read-only
standards/spec/domain/architecture and connascence review of the completed
staged diff found no remaining issues. It confirmed the broad-lock and
exact-pnpm guards, deterministic serial inventory, complete multiline
diagnostic keys, committed totals, workspace-scoped consumer enforcement,
missing-consumer coverage, and absence of TypeScript, Quint, or model-source
changes. The #371 reviewer loop therefore converged after the scope correction.

## Issue #374 reviewer-loop record

The outer Sol implementation-delta review at source head `91a0dad99` found no
implementation P0, P1, or P2 findings; the earlier P2 was this controlled-red
ledger evidence issue. An earlier final Sol code re-review at source head
`3e5281b7a` found no P0, P1, or P2 after the decoder and ITF BigInt fixes. The
review fixes included using the canonical runtime action-order constant and
applying Prettier formatting. Focused Prettier, ESLint, and
`@dnd/shared-algebras` typecheck checks pass.

The Luna Spec re-review found no actionable findings, and the Luna Standards
re-review found no actionable findings. The MBT rerun was interrupted while
waiting on an unrelated broad lock and produced no new result; the earlier
focused 9/9 MBT pass remains the recorded evidence above. The #374
reviewer-loop record therefore converged.

## Issue #375 closure evidence

The Character Creation runtime migration is complete at commit `0c03c6e83`.
Its owner is now green in the regenerated inventory with `exitCode 0` and
`rawDiagnostics 0`; this is package-scoped evidence and does not claim the
workspace or the retained Effect 3 behavioral oracle is green. The migration
uses native Effect 4 `Result` and `Schema` contracts without compatibility
aliases, adapters, casts, or production behavior changes. The non-MBT test
assertions were updated from Effect 3 `left`/`right` payloads to Effect 4
`failure`/`success` payloads while preserving the existing behavioral,
accumulation, and ordering assertions.

| Command                                                                            | Result                                            |
| ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| `pnpm --filter @dnd/character-creation-runtime typecheck --pretty false`           | pass; zero diagnostics                            |
| `pnpm --filter @dnd/character-creation-runtime test`                               | pass; 28 files, 474 passed, 2 skipped (476 total) |
| `pnpm --filter @dnd/character-creation-runtime test:qnt-slice`                     | pass; 1 passed, 196 skipped                       |
| `pnpm --filter @dnd/character-creation-runtime test:qnt-proofs`                    | pass; 3 passed                                    |
| `pnpm --filter @dnd/character-creation-runtime test:mbt:weapon-mastery-level-gain` | pass; 3 passed                                    |
| Focused Prettier and ESLint checks                                                 | pass                                              |

The focused test migration initially exposed 97 stale Effect 3 shape
assertions; after correction, the focused set passed 289/289 and the full
package suite passed as recorded above. The QNT slice, proof, and MBT results
are package-owned evidence. No workspace-wide green claim is implied; the
five remaining failing owners and the historical `scripts/effect3-baseline.ts`
oracle remain controlled-red.

The independent Standards and Spec reviews found no actionable findings. The
#375 reviewer loop therefore converged.

## Issue #376 evidence snapshot

Source HEAD: `ff94d74a1973dc58f7bab4b5504c981d67b2e83a`. The public controlled-red
regeneration was run directly with `pnpm regenerate:effect4-controlled-red`.
The generated inventory is [`controlled-red-inventory.json`](./controlled-red-inventory.json),
SHA-256 `95ab10a086c4607ec1eba2d1727933cfdb5c10b552cda12c8fce07b8f2be2000`.

The Character Sheet owner is green: typecheck exit 0 with zero diagnostics.
The four remaining failing owners are `@dnd/app` (4,335 raw diagnostics),
`@dnd/battle-runtime` (7,723), `@dnd/character-battle-runtime` (5,140), and
`@dnd/mcp` (5,387). Inventory totals are exactly 22,585 raw and 10,108
deduplicated diagnostics. The diagnostic code/family/raw/deduplicated records
are authoritative in the generated inventory; the codes are TS1360, TS18046,
TS18047, TS18048, TS2305, TS2307, TS2314, TS2322, TS2339, TS2344, TS2345,
TS2352, TS2353, TS2367, TS2488, TS2551, TS2554, TS2556, TS2560, TS2571,
TS2638, TS2694, TS2698, TS2700, TS2724, TS2739, TS2740, TS2741, TS2749,
TS2769, TS7006, TS7031, and TS7053.

| Evidence                                                 | Result                        |
| -------------------------------------------------------- | ----------------------------- |
| `pnpm --filter @dnd/character-sheet-runtime typecheck`   | pass; zero diagnostics        |
| `pnpm --filter @dnd/character-sheet-runtime audit:split` | pass; 225/225 exports         |
| `pnpm --filter @dnd/character-sheet-runtime test`        | pass; 47 files, 479/479 tests |
| `test:mbt:weapon-mastery-class-level-reselection`        | pass; 3/3                     |
| `test:mbt:spell-access-free-cast`                        | pass; 1/1                     |
| Certified Effect 3 parser at `76d9abaf0`                 | pass; 9/9 fixed-point cases   |
| Candidate fixed-point replay                             | pass; 9/9 cases               |
| Focused ESLint and Prettier                              | pass                          |

The global Effect 3 oracle is unchanged. Full workspace verification and the
baseline verifier remain deferred because Battle is controlled-red. The #376
review loop converged across standards, specification, domain/architecture,
connascence, and code-review passes; this snapshot makes no workspace or Battle
green claim.

## Issue #377 foundation evidence snapshot

Source HEAD: `f5e54695fc2d522229c20b1eda90094cb937791b`. This entry records the
#377 foundation lane after the Battle foundation and pure representation-codec
tranches; it does not claim package-wide or workspace-wide green status.

The isolated executable lane uses foundation-owned suites that do not import
later-owner druid wild-shape, attack/damage, turn/movement, direct-spell, or
persistent-effect owners. The broader package test lane remains controlled-red
because package-index and test-support closures still reach the later-owner
`druid-wild-shape.ts`, which imports removed `effect/Either`.

| Evidence                                                                                                                                                                           | Result                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check:effect4-cohort:self-test`                                                                                                                                              | pass                                                                                                                                                |
| `pnpm check:effect4-cohort`                                                                                                                                                        | pass                                                                                                                                                |
| `pnpm exec vitest run packages/battle-runtime/src/battle-reducer/domain-helpers.test.ts packages/battle-runtime/src/character-execution-profile-projection.test.ts --reporter=dot` | pass; 2 suites, 12/12 tests                                                                                                                         |
| `pnpm --filter @dnd/battle-runtime typecheck`                                                                                                                                      | controlled red; exit 1, 364 diagnostics (604 output lines)                                                                                          |
| Changed #377 foundation source attribution                                                                                                                                         | zero diagnostics in the changed foundation files; remaining diagnostics belong to later-owner callers/capabilities and stale Effect 3 test closures |

The focused lane is acceptance evidence for deterministic foundation behavior,
schema/domain helper behavior, and executable test collection. It intentionally
does not waive the package-wide controlled-red inventory or closure conditions
above.

## Closure conditions

Close this controlled-red interval only when all of the following are true:

1. `pnpm check:effect4-cohort:self-test` and `pnpm check:effect4-cohort` pass
   with the exact values in this ledger, and the lockfile still contains one
   `effect` version (`4.0.0-rc.112`) with no removed or unsupported Effect
   packages.
2. The four currently affected workspace owners and `scripts/effect3-baseline.ts` have
   zero deduplicated diagnostics. The code-count table is regenerated rather
   than manually decremented.
3. Direct `pnpm build`, `pnpm typecheck`, and `pnpm test` pass under the public
   repository lock wrappers. Focused declaration, lint, format, and install
   checks remain green.
4. `pnpm verify:effect3-baseline` and the focused baseline tests pass, with any
   changed observable output separately reviewed and explicitly justified.
5. Two complete review rounds converge across installed API-source guidance,
   D&D/SRD domain language, architecture/connascence, repository standards,
   and code/spec review. No casts, compatibility facade, diagnostic waiver, or
   D&D rule behavior change is accepted as closure.

## Resource and excluded-probe record

There were no exit 137/SIGKILL events, memory-pressure incidents, or orphaned
verification children. The initial direct public build, typecheck, and test
runs, install, focused checks, and owner sweep acquired the shared lock
normally. After the final amend, a refresh build was started directly but
waited about 2 minutes 39 seconds for an active sibling quality run in
`dnd-raw-swarm-48h-campaign` (observed wrapper PID 1195505). This task
terminated only its own waiting process group (top PID 1211661) before the
build began; the log is therefore a lock-contention incident, not a build
result or a resource failure. The sibling run was active, retained, and not
confirmed orphaned. At inspection, cgroup memory events were all zero
(`low=0`, `high=0`, `max=0`, `oom=0`, `oom_kill=0`). The controlled-red
inventory regeneration also acquired the broad lock and completed its owner
sweep. A later hash-confirmation invocation was terminated with exit 143 while
still waiting for the lock; it did not enter the generator and is not
verification evidence. The public results remain the classification because
this remediation changes verification and evidence artifacts, not the source
or dependency graph.

One exploratory command, `pnpm typecheck -- --continue`, forwarded
`--continue` to each package's `tsc` and produced TS5023 (`Unknown compiler
option '--continue'`). It is excluded from every count because it did not run a
continuation mode and is not a migration diagnostic. The correct inventory is
the explicit owner sweep documented above.
