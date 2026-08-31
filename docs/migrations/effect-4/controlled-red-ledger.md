# Effect 4 controlled-red ledger

Date: 2026-08-26
Issue: [#371](https://github.com/dearlordylord/5e-quint/issues/371)
Cutover starting point: `fba977c5ed3abf554631ce43c006b5a0ad4c5557`
Environment: Node `v24.18.0`, pnpm `10.29.3`, Linux

Status: current merge-tree certification pending. The parent checkpoints below
recorded separate zero-diagnostic inventories for 14-owner and 13-owner
snapshots. Those historical observations remain evidence for their named
revisions only; neither substitutes for the post-merge public typecheck, test,
quality milestone, refreshed certificates, or issue receipt. No historical
controlled-red snapshot is a current waiver or exception.

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

The historical regeneration command was
`pnpm regenerate:effect4-controlled-red`. During the controlled-red interval,
its public script acquired the repository broad lock and its body asserted that
lock before running the now-retired
`scripts/regenerate-effect4-controlled-red.mjs` generator.
The committed output is
[`controlled-red-inventory.json`](./controlled-red-inventory.json). The script
discovers each `packages/*` manifest with a `typecheck` script, runs those
owners serially with `--pretty false`, and classifies every TypeScript code
into the disjoint families below. It deduplicates on source path, line, column,
code, and complete diagnostic message. Before closure, the command regenerated the
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

Source HEAD: `9bc5e7b35fdef897d862a2d04805fb2e2550ad2f`. This entry records the
#377 foundation lane after the Battle foundation, pure representation-codec,
immediate MCP Result caller, isolated equality, and codec evidence tranches; it does not claim package-wide or
workspace-wide green status.

The isolated executable lane uses foundation-owned suites that do not import
later-owner druid wild-shape, attack/damage, turn/movement, direct-spell, or
persistent-effect owners. The broader package test lane remains controlled-red
because package-index and test-support closures still reach the later-owner
`druid-wild-shape.ts`, which imports removed `effect/Either`.

| Evidence                                                                                                                                                                                                                                                                                                                          | Result                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check:effect4-cohort:self-test`                                                                                                                                                                                                                                                                                             | pass                                                                                                                                                                                           |
| `pnpm check:effect4-cohort`                                                                                                                                                                                                                                                                                                       | pass                                                                                                                                                                                           |
| `pnpm exec vitest run packages/battle-runtime/src/battle-reducer/domain-helpers.test.ts packages/battle-runtime/src/character-execution-profile-projection.test.ts packages/battle-runtime/src/battle-fill-equality-focused.test.ts packages/battle-runtime/src/character-weapon-execution-schema-focused.test.ts --reporter=dot` | pass; 4 suites, 16/16 tests                                                                                                                                                                    |
| `pnpm exec vitest run packages/battle-runtime/src/gh377-battle-codecs-result.test.ts --reporter=dot`                                                                                                                                                                                                                              | pass; 1 suite, 2/2 tests; direct BattleHoleSchema/BattleFillSchema Result codec acceptance                                                                                                     |
| `pnpm exec vitest run packages/battle-runtime/src/character-weapon-execution-schema-focused.test.ts --reporter=dot`                                                                                                                                                                                                               | pass; 1 suite, 2/2 tests; isolated native Effect 4 codec acceptance                                                                                                                            |
| `pnpm exec vitest run packages/mcp/src/schema-codec-result.test.ts --reporter=dot`                                                                                                                                                                                                                                                | pass; 1 suite, 3/3 tests; `schemaJsonContent` transformation acceptance                                                                                                                        |
| `pnpm exec vitest run packages/mcp/src/dice-random-test-support.test.ts --reporter=dot`                                                                                                                                                                                                                                           | pass; 1 suite, 3/3 tests; deterministic native Effect 4 Random test support                                                                                                                    |
| `pnpm exec vitest run packages/mcp/src/character-creation-fill-tool-input.test.ts --reporter=dot`                                                                                                                                                                                                                                 | pass; 1 suite, 1/1 test; isolated MCP decoder acceptance                                                                                                                                       |
| `pnpm exec vitest run packages/mcp/src/session-snapshot-output-focused.test.ts --reporter=dot`                                                                                                                                                                                                                                    | pass; 1 suite, 8/8 tests; isolated session snapshot and Battle union codec acceptance                                                                                                          |
| `pnpm exec tsx -e 'import { BattleHoleSchema, BattleFillSchema } from "@dnd/battle-runtime/protocol-codecs"; if (!BattleHoleSchema) throw new Error("missing BattleHoleSchema"); if (!BattleFillSchema) throw new Error("missing BattleFillSchema"); console.log("protocol-codecs package boundary passed")'`                     | pass; direct package-boundary load of BattleHoleSchema and BattleFillSchema                                                                                                                    |
| `pnpm exec vitest run packages/mcp/src/session-snapshot-output.test.ts --reporter=dot`                                                                                                                                                                                                                                            | controlled red; broad integration collection remains blocked before tests by excluded `druid-wild-shape.ts` → removed `effect/Either`; isolated session evidence is green above                |
| `pnpm --filter @dnd/battle-runtime typecheck > /tmp/gh377-final-battle.txt 2>&1`; `grep -c 'error TS' /tmp/gh377-final-battle.txt`                                                                                                                                                                                                | controlled red; exit 1, 364 diagnostics (604 output lines)                                                                                                                                     |
| `pnpm --filter @dnd/mcp typecheck --pretty false > /tmp/gh377-final-mcp.txt 2>&1`; `grep -c 'error TS' /tmp/gh377-final-mcp.txt`                                                                                                                                                                                                  | controlled red; exit 1, 1,198 diagnostics (1,768 output lines); repaired lifecycle/roster/initiative callers are no longer reported, while later-owner schema/input migration remains red      |
| `. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-mbt-lock.sh pnpm --dir packages/battle-runtime exec quint test battle-runtime-reaction-continuation-tests.qnt --verbosity 1`                                                                                                                           | pass; `battleRuntimeReactionContinuationTests`                                                                                                                                                 |
| `. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-mbt-lock.sh pnpm --dir packages/battle-runtime exec quint test battle-runtime-replay-equivalence-tests.qnt --match test_replay_equivalent --verbosity 1`                                                                                               | pass; 1/1 executable replay-equivalence test                                                                                                                                                   |
| `. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-mbt-lock.sh pnpm --dir packages/battle-runtime exec quint test battle-runtime-replay-equivalence-tests.qnt --match test_replay_changed_order --verbosity 1`                                                                                            | pass; 1/1 executable changed-order replay test                                                                                                                                                 |
| `battle-runtime-replay-equivalence.qnt` type/collection check                                                                                                                                                                                                                                                                     | pure replay projection module only; not presented as executable evidence                                                                                                                       |
| `. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-mbt-lock.sh pnpm --dir packages/battle-runtime exec quint test battle-runtime-public-trace-contract.qnt --verbosity 1`                                                                                                                                 | pass; `battleRuntimePublicTraceContract`                                                                                                                                                       |
| `pnpm exec vitest run packages/battle-runtime/src/battle-codecs-boundary.test.ts packages/battle-runtime/src/gh227-admission-codec-projections.test.ts --reporter=dot`                                                                                                                                                            | controlled red; broad barrel suites remain blocked before tests by excluded `druid-wild-shape.ts` → removed `effect/Either`; direct codec acceptance is green above                            |
| `git diff --name-only 2b2ed3657..9bc5e7b35 -- '*.ts' '*.tsx'` plus path-matched `grep -c 'error TS'` attribution against the Battle/MCP outputs                                                                                                                                                                                   | 213 changed TypeScript source/test paths inspected; zero changed paths and zero package-output diagnostic occurrences, including schema-codec, session snapshot, and Random support/test paths |
| Changed #377 foundation source attribution                                                                                                                                                                                                                                                                                        | zero diagnostics in all changed foundation files; remaining diagnostics belong to later-owner callers/capabilities and stale Effect 3 test closures                                            |

The focused lane is acceptance evidence for deterministic foundation behavior,
schema/domain helper behavior, and executable test collection. It intentionally
does not waive the package-wide controlled-red inventory or closure conditions
above.

The previously certified foundation/equality/direct-codec/decoder rows remain
green at 19/19 tests; the schema-codec and deterministic-Random rows above are
additional isolated evidence.

The focused equality suite directly covers ordered prefix accumulation and
rejection of reordered, changed, and truncated fills. The isolated native
Effect 4 codec suites pass 4/4 tests across schema-leaf and direct
BattleHoleSchema/BattleFillSchema acceptance. The locked QNT suites cover
reaction continuation, replay equivalence, and public trace protocol. Broad
barrel suites remain blocked by the excluded `druid-wild-shape.ts` Effect 3
import; no test-only import workaround or duplicate production algorithm was
added.

## Issue #378 attack and damage evidence snapshot

Source HEAD: `3ddfa3769618d0bae6e9b19abcd45cccc87251cc`. This entry records the ordinary attack, damage,
hit-point, creature, object, and stat-block Effect 4 consumer migration plus
the cross-combatant `startBattle` admission accumulation fix. The latest
checkpoint also retains duplicate identity and presentation-source issues
while preserving stable input order and avoiding duplicate state insertion.
The generated inventory is
`docs/migrations/effect-4/controlled-red-inventory.json`, SHA-256
`2712ba38ae33ba1fa9e5071d2135b5ca675bc7829cbf05f746f79d6f5994a988`.

| Evidence                                                                                                                                                                        | Result                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm regenerate:effect4-controlled-red`                                                                                                                                        | pass under the required broad lock; 1,133 raw / 1,007 deduplicated diagnostics                                                                                                           |
| Regenerated owner attribution                                                                                                                                                   | controlled red: `@dnd/app` 177, `@dnd/battle-runtime` 20, `@dnd/character-battle-runtime` 1, `@dnd/mcp` 935; all other owners 0                                                          |
| `pnpm --filter @dnd/battle-runtime typecheck --pretty false`                                                                                                                    | controlled red; exit 1 with 20 parsed TypeScript diagnostics (27 output lines), all in untouched later-owner execution-profile or mirror-image/see-invisibility/moonbeam/ray MBT helpers |
| Changed TypeScript path attribution against `4a062776e..3ddfa3769`                                                                                                              | 104 changed `.ts`/`.tsx` paths; zero package diagnostics on changed paths; app, character-battle, and MCP diagnostics are downstream closure, not changed #378 paths                     |
| Focused native runtime suite (API lifecycle, attack rolls/routes, damage/HP, creature admission/origin/state, ordinary object attack/tail, attack pipeline, opportunity/light)  | pass; 12 files, 105 tests                                                                                                                                                                |
| `pnpm --filter @dnd/battle-runtime test:mbt:ordinary-object-attack`                                                                                                             | pass; 1/1                                                                                                                                                                                |
| `pnpm --filter @dnd/battle-runtime test:mbt:weapon-attack-ordering`                                                                                                             | pass; 1/1                                                                                                                                                                                |
| `pnpm --filter @dnd/battle-runtime test:mbt:rule-core-hit-point-damage`                                                                                                         | pass; 1/1                                                                                                                                                                                |
| `pnpm --filter @dnd/battle-runtime test:mbt:rule-core-stat-block-controls`                                                                                                      | pass; 1/1                                                                                                                                                                                |
| `pnpm --filter @dnd/battle-runtime test:mbt:relationship-discovery`                                                                                                             | pass; 1/1                                                                                                                                                                                |
| `pnpm --filter @dnd/battle-runtime test:mbt:interrupt-stack-resume`                                                                                                             | pass; 1 file, 2 tests                                                                                                                                                                    |
| Focused relationship/continuation tests (`battle-runtime-damage-relationship-decisions`, replay continuation, interrupt lifecycle/continuation boundaries, attack rolls/damage) | pass; 4 files, 44 tests                                                                                                                                                                  |
| `pnpm --filter @dnd/battle-runtime exec vitest run src/battle-runtime-metamagic-resource.test.ts`                                                                               | pass; 1 file, 101 tests                                                                                                                                                                  |
| `pnpm --filter @dnd/battle-runtime test:mbt:quickened-spell-governor`                                                                                                           | pass; 1 file, 10 tests                                                                                                                                                                   |
| Focused admission/relationship suite (`api-lifecycle`, attack execution references, creature admission boundaries, stat-block admission, damage relationship decisions)         | pass; 5 files, 52 tests                                                                                                                                                                  |
| Focused Prettier and `git diff --check`                                                                                                                                         | pass                                                                                                                                                                                     |

`startBattle` now accumulates independent roster admission and presentation
leaves in stable stage/input order while preserving one-leaf versus
flat-aggregate output. The focused API lifecycle tests prove duplicate IDs are
retained alongside admission failures and that admission plus presentation
issues are both retained. `collectSelectedAttackFills` and
`DamageRelationshipDecisionsByHole.parse` remain intentional stage gates: each
rejects the whole malformed replay set, exposes a single invalid-message
contract, and cannot be made executable by processing later fills. Their
fail-fast behavior is therefore not a loss of independent admission issues.

The local SRD 5.2.1 attack, Cover, object, hit-point, damage, critical,
resistance/immunity, healing, zero-hit-point, and temporary-hit-point passages
were inspected before implementation. No QNT or rule behavior was changed;
the ordinary-object parity MBT and the three mapped attack/damage/stat-block
MBT lanes remain green. The four remaining Battle typecheck helper files are
owned by later #379/#380/#381 capability lanes and are retained as controlled
red rather than claimed as #378 semantics.

## Issue #380 spell execution-schema evidence snapshot

Source HEAD: `151b93137a537075eaa4eba324643f404b62d9ec`. This merged checkpoint
contains the completed #379 integration required by the dependent spell MBT
projection, while the #380 source changes narrow the spell execution-schema
helper to the native Effect 4 property-only
`Schema.ConstraintCodec<unknown, unknown, never, never>` constraint. It keeps
decoded and encoded views distinct, and records optional save-gated area facts
in both present and omitted forms. A package-owned compile-only probe and
explicit `typecheck:spell-procedure-execution-schema` gate reject `Schema.Any`
and contextful codecs while preserving transformed inference. The shared codec
contract lives in a neutral module so declaration and registry type imports
remain acyclic; the registry intentionally widens only heterogeneous `Encoded`
wire shapes to `unknown` while retaining the decoded/no-context contract.
The generated inventory is
`docs/migrations/effect-4/controlled-red-inventory.json`, SHA-256
`d05ae671a2671cbd1f9a2d51d13c484de37830ba164eb2419534b8c0915465f3`.

| Evidence                                                                                                                                                                                                                                                                                                                                                   | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm regenerate:effect4-controlled-red`                                                                                                                                                                                                                                                                                                                   | pass under the required broad lock; 1,129 raw / 1,006 deduplicated diagnostics; regenerated owners: `@dnd/app` 176, `@dnd/battle-runtime` 19, `@dnd/mcp` 934, `@dnd/character-battle-runtime` 0, and all other owners 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pnpm --filter @dnd/battle-runtime run typecheck --pretty false`                                                                                                                                                                                                                                                                                           | controlled red; exit 1 with exactly 19 parsed diagnostics: five #381 diagnostics in `mirror-image-hit-interception.mbt.test.ts`, seven in `moonbeam-movable-zone.mbt.test.ts`, five in `ray-of-enfeeblement-lifecycle.mbt.test.ts`, and two in `see-invisibility-observer-sight.mbt.test.ts`; the one prior #380 `execution-profile.ts::Schema.AnyNoContext` diagnostic is fixed                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Changed #380 TypeScript path attribution                                                                                                                                                                                                                                                                                                                   | zero diagnostics in the seven changed `.ts`/`.tsx` paths (independently recounted against `463d601fc`); residual ledger attribution is precisely 1 fixed #380 diagnostic and 19 retained #381 diagnostics                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Focused native spell runtime suite (21 source files)                                                                                                                                                                                                                                                                                                       | pass; 241 tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `pnpm --filter @dnd/battle-runtime exec vitest run src/spell-procedure-execution-schema.test.ts src/battle-runtime-spell-riders-invocation-and-codecs.test.ts --reporter=dot`                                                                                                                                                                              | pass; 2 files, 19 tests, including runtime `NumberFromString` encode/decode, registry-level `saveGatedDamage` decode/encode, and optional present/omitted round trips                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pnpm --filter @dnd/battle-runtime run typecheck:spell-procedure-execution-schema`                                                                                                                                                                                                                                                                         | pass; explicit compile-only probe gate checks transformed `NumberFromString` decoded/encoded assignments, rejects `Schema.Any`, and rejects a codec retaining a decoding service                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Registry-derived #380 QNT owner audit                                                                                                                                                                                                                                                                                                                      | pass; the 12 selected/mapped obligations (`BATTLE.SPELL.INVOCATION_RESOURCE_PROCEDURE`, `BATTLE.SPELL.DAMAGE_SAVE_OR_ATTACK_PROCEDURE`, `BATTLE.SPELL.READIED_RESPONSE_PROCEDURE`, `BATTLE.SPELL.HIT_POINT_RESTORATION`, `BATTLE.SPELL.REACTION_CASTING_TIME`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS`, `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`, `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING`, `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS`) resolve through `obligations.jsonl` and `qnt-owner-roles.jsonl` to 64 unique owners: 51 `semantic-core`, 9 `bridge`, and 4 `proof-only`; no selected owner is unregistered. One lock-held sequential command typechecked the complete 51-path semantic-core set, 51/51 exit 0. |
| Prior focused QNT test-file checks (`battle-runtime-spell-invocation-resource-tests.qnt`, `battle-runtime-spell-save-and-rider-facts-tests.qnt`, `battle-runtime-spell-attack-procedure-tests.qnt`)                                                                                                                                                        | pass; retained as proof/test evidence only. The save-and-rider-facts and attack-procedure files are `proof-only` in `qnt-owner-roles.jsonl`; the invocation-resource file has no owner-role entry and is therefore unregistered. None is asserted as semantic-core authority.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| MBT projection fixture QNT typechecks (`rule-core-spell-damage.mbt.qnt`, `rule-core-spell-restoration.mbt.qnt`, `rule-core-spell-defensive-effect.mbt.qnt`, `rule-core-spell-readied-response.mbt.qnt`, `battle-runtime-spell-attack-ordering.qnt`, `battle-runtime-spell-sequencing-integration.mbt.qnt`, `battle-runtime-reaction-casting-time.mbt.qnt`) | pass under the required MBT lock; these projection fixtures cover invocation-resource, direct damage, save/attack branches, restoration, defensive effect, readied response, attack ordering, sequencing, and reaction casting-time contracts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Full mapped MBT lane `pnpm --filter @dnd/battle-runtime run test:mbt:rule-core-spells` (`rule-core-spell-damage`, `rule-core-spell-restoration`, `rule-core-spell-defensive-effect`, `rule-core-spell-readied-response`)                                                                                                                                   | pass under the required public MBT lock; 1 file / 5 tests (the selected-identity replay plus all four mapped procedure families); the merged #379 projection now reads canonical `currentTurnResources.currentHasBonusAction`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Additional spell MBT lanes (`spell-attack-ordering`, `spell-sequencing-integration`, `weapon-hosted-attack-and-riders`, `reaction-casting-time`, `after-hit-damage-riders`, `chained-attack-sequence`)                                                                                                                                                     | pass; 1/1, 3/3, 9/9, 3/3, 2/2, and 3/3 respectively                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `pnpm check:authored-id-dispatch`; `pnpm check:battle-runtime-import-ownership`; `pnpm check:battle-runtime-test-support-boundary`; `pnpm check:qnt-inventory`; `pnpm check:cleanroom-provenance`; `pnpm circular`                                                                                                                                         | pass; authored-identity scan 4,719 literals / 708 checked source paths, import ownership 20 entry points / 302 reachable modules, test-support boundary clean, circular dependencies 0, QNT inventory 769/769 reachable with 262 MBT drivers, cleanroom audit 623 records / 39 warnings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Focused Prettier, ESLint, and `git diff --check`                                                                                                                                                                                                                                                                                                           | pass on all changed source/test paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

The owner audit and typecheck used this dynamic registry selection (the
selected obligation IDs above are the only hand-authored input), then ran the
resulting unique semantic-core paths sequentially under one MBT lock:

```sh
export OWNER_LIST="$(node - <<'NODE'
const fs = require("fs");
const obligations = fs.readFileSync("plans/rules-kernel-coverage/obligations.jsonl", "utf8").trim().split("\\n").map(JSON.parse);
const roles = fs.readFileSync("plans/rules-kernel-coverage/qnt-owner-roles.jsonl", "utf8").trim().split("\\n").map(JSON.parse);
const ids = ["BATTLE.SPELL.INVOCATION_RESOURCE_PROCEDURE", "BATTLE.SPELL.DAMAGE_SAVE_OR_ATTACK_PROCEDURE", "BATTLE.SPELL.READIED_RESPONSE_PROCEDURE", "BATTLE.SPELL.HIT_POINT_RESTORATION", "BATTLE.SPELL.REACTION_CASTING_TIME", "BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS", "BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS", "BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE", "BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE", "BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES", "BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING", "BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS"];
const roleByOwner = new Map(roles.map(({ ownerPath, role }) => [ownerPath, role]));
const owners = [...new Set(ids.flatMap(id => obligations.find(o => o.id === id)?.qntOwners ?? []))].filter(owner => roleByOwner.get(owner) === "semantic-core");
process.stdout.write(owners.join(String.fromCharCode(10)));
NODE
)"
. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-mbt-lock.sh bash -c '
set -euo pipefail; count=0
while IFS= read -r owner; do [ -n "$owner" ] || continue; count=$((count+1)); echo "QNT typecheck $count/51 $owner"; pnpm exec quint typecheck "$owner"; done <<< "$OWNER_LIST"
test "$count" -eq 51
'
```

This completed with 51/51 paths and exit 0; the exact resolved path set is the
51 `semantic-core` owners selected by the command above. The 9 bridge owners
and 4 proof-only owners were classified from the same registry but were not
misrepresented as semantic-core authority or included in this lane.

The changed #380 sources and tests contain no PHB+ identity: production profiles have no
PHB/PHB+ or authored-name dispatch literals, while tests use existing SRD
`thunderwave`/`grease` records and synthetic `battle:test:*` identifiers. The
local SRD 5.2.1 spell, attack, save, damage, healing, and slot passages were
rechecked before this schema-only migration. No #379 lifecycle or #381
persistent-effect files were changed.

## Historical closure conditions, satisfied by #386

Issue #386 closed this controlled-red interval after all of the following
became true:

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

## Issue #379 non-spell Battle lifecycle evidence snapshot

Runtime source baseline: `463d601fcf05a444b6278f6d0a4cf634a53062e3` (the
reviewed #378 integration head). The generic MBT projection evidence was then
corrected at `35c0787a5cde1ff0b43a0ad04f3d7c0d2b7389bb`; the later commits on
this branch only refine this ledger and its manifest. This snapshot records the
ownership audit for turns, movement, conditions, resources, commands,
interrupts, and reactions after the #378 Result migration. No #379 lifecycle
reducer, codec, schema, or Quint source change was necessary: #378 already
migrated the two non-spell Effect-3 consumers reachable in this capability set
(`battle-reducer/action-resource-kinds.ts` and
`battle-reducer/interrupt-execution.ts`).

The rules-kernel registry names `scripts/raw-swarm/sdk-player/scenario-session.ts`
as a runtime owner because it projects the composed direct-SDK movement and
table-decision boundary. Its Effect 3 `Either` call chain is nevertheless owned
by #385, whose scope is the repository scripts and Raw Swarm/SDK-player
migration. It is therefore not a #379 source/pure migration path. The related
`scenario-setup-runtime.test.ts` is downstream/deferred consumer evidence, not a
required #379 parity witness: both script paths are listed in the manifest's
`deferredScriptPaths` and are excluded from the #379 Effect API audit. The
actual #379 parity witnesses are the focused Battle Runtime fixtures selected
by each obligation below, including the movement, reactions, command-option,
ordering, death-save, interrupt-stack, and turn-boundary fixtures, plus the
direct Battle Runtime contract tests recorded in the evidence rows. #385 must
migrate that complete script call chain and its fixture together; this is an
ownership boundary, not a compatibility waiver.

| Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-broad-workspace-lock.sh pnpm --filter @dnd/battle-runtime run typecheck -- --pretty false` (re-run at the runtime source baseline)                                                                                                                                                                                                                                                                                                                             | controlled red; exit 1 with exactly 20 diagnostics: 1 in #380-owned `battle-reducer/spell-procedure-profiles/execution-profile.ts`, and 19 in #381-owned `mirror-image-hit-interception.mbt.test.ts`, `moonbeam-movable-zone.mbt.test.ts`, `ray-of-enfeeblement-lifecycle.mbt.test.ts`, and `see-invisibility-observer-sight.mbt.test.ts`; zero diagnostics are in #379-owned lifecycle paths                                                                                                                                                                                                                                                          |
| Registry-selected path-manifest audit: committed [`gh379-registry-path-manifest.json`](./gh379-registry-path-manifest.json), generated from `plans/rules-kernel-coverage/obligations.jsonl` for the eight non-spell #379 obligations, then exact audits over the manifest's non-deferred paths                                                                                                                                                                                                                                            | pass; 47 source/pure paths and 30 parity/fixture paths were enumerated; 75 unique paths occur across those two categories (two paths are shared by both); the manifest separately records 2 deferred Raw Swarm script paths (one of them is retained as a parity witness); the non-deferred 74-path audit found no forbidden root `Either` import/member, `Schema.optionalWith`, `Schema.decodeUnknownEither`, `Schema.standardSchemaV1`, `Schema.BigIntFromSelf`, `Schema.transform`, or `Schema.Schema.AnyNoContext` matches; `action-resource-kinds.ts` is explicitly included, while the #385 script paths are not silently treated as #379 source |
| Focused non-spell runtime suite (`battle-runtime-death-saves-and-turns`, `battle-runtime-movement-grapple-hide`, `battle-runtime-interrupt-lifecycle-continuation-boundaries`, `battle-runtime-opportunity-attack-interrupt-boundaries`, `battle-runtime-round-end-and-runtime-commands`, `battle-runtime-triggered-reaction-interrupt-boundaries`, `battle-resource-schema`, `character-battle-resource-execution`, `battle-reducer/turn-boundary-lifecycle`, `battle-reducer/interrupt-lifecycle`, `battle-runtime-stunning-strike`)    | pass; 11 files, 130 tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Effect fiber/scope/scheduling audit over #379-owned paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | pass; no `Fiber`, `Schedule`, `Layer`, `Stream`, `Queue`, `Deferred`, or `Ref` runtime APIs/imports; lifecycle reducers remain synchronous immutable transitions, so no synchronization or ownership test is required                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Mapped public QNT/MBT matrix: `pnpm --filter @dnd/battle-runtime run test:mbt:rule-core-movement`, `pnpm --filter @dnd/battle-runtime run test:mbt:rule-core-reactions`, `pnpm --filter @dnd/battle-runtime run test:mbt:command-option-next-turn`, `pnpm --filter @dnd/battle-runtime run test:mbt:interrupt-stack-resume`, and `pnpm --filter @dnd/battle-runtime run test:mbt:turn-boundary-effect-lifecycle`                                                                                                                          | pass; each is a public package script that acquires the required MBT lock: movement 1 file/1 test; reactions 1/1; command option-next-turn 1/1; interrupt stack resume 1/2; turn-boundary effect lifecycle 1/8 (5 files, 13 tests total)                                                                                                                                                                                                                                                                                                                                                                                                               |
| Manifest/role-derived semantic-core QNT owner sweep                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | pass; source head `0ddd222d53807228c4e0edcec7eb3507ebe7850d`; exactly 33 unique owners resolved from the eight manifest obligation IDs through `obligations.jsonl` and `qnt-owner-roles.jsonl`; all 33 direct `pnpm exec quint typecheck <owner>` invocations completed sequentially with exit 0 and no diagnostics under one required MBT lock invocation                                                                                                                                                                                                                                                                                             |
| Additional Battle parity witnesses under the required MBT lock: `. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-mbt-lock.sh pnpm --dir packages/battle-runtime exec vitest run src/command-ordering.mbt.test.ts src/death-saving-throw.mbt.test.ts src/direct-condition-lifecycle.mbt.test.ts --reporter=dot`                                                                                                                                                                                                  | pass; 3 files, 8 tests (Command hole-frontier ordering, Character Battle Death Saving Throw, and condition lifecycle)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Shared reducer parity under the required public MBT lock: `pnpm --filter @dnd/shared-algebras run test:mbt`                                                                                                                                                                                                                                                                                                                                                                                                                               | pass; 1 file, 9 tests covering action economy/resource spend and reset, conditions, death saves, initiative, and typed malformed-state failures; repeated apply/spend/reset traces provide exact-once coverage                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Explicit condition/resource/exact-once runtime bundle under the required MBT lock: `. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-mbt-lock.sh pnpm --dir packages/battle-runtime exec vitest run --pool forks --maxWorkers=1 --reporter=dot src/battle-runtime-death-saves-and-turns.test.ts src/battle-resource-schema.test.ts src/character-battle-resource-execution.test.ts src/battle-runtime-triggered-reaction-interrupt-boundaries.test.ts src/battle-runtime-round-end-and-runtime-commands.test.ts` | pass; 5 files, 31 tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Generic action/resource projection correction in `src/rule-core-spells.mbt.test.ts`: use canonical `state.currentTurnResources.currentHasBonusAction` rather than act-discoverability-gated `snapshot.turn.bonusActionAvailable`                                                                                                                                                                                                                                                                                                          | pass; QNT expects raw turn-resource availability (`true`); no spell procedure semantics changed, and common-state comparison intentionally strips readied-only fields for non-readied families                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Reproduced #380 mapped lanes after the correction: `pnpm --filter @dnd/battle-runtime run test:mbt:rule-core-spell-damage`, `pnpm --filter @dnd/battle-runtime run test:mbt:rule-core-spell-restoration`, and `pnpm --filter @dnd/battle-runtime run test:mbt:rule-core-spells` (covering defensive-effect and readied-response)                                                                                                                                                                                                          | pass; each is a public package script that acquires the required MBT lock: damage 1 active/1 passed (4 skipped), restoration 1 active/1 passed (4 skipped), full suite 1 file/5 tests passed                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

The local SRD 5.2.1 passages inspected for this audit were `Playing-the-Game`
Combat/Your Turn/Movement and Position/Reactions/Opportunity Attacks and
`Rules-Glossary` Action, Condition, Opportunity Attacks, Reaction, Ready,
Short Rest, and Long Rest. They support the existing reducer contracts for
initiative order and turn boundaries, movement budget and Difficult Terrain,
reaction timing and continuation, Ready decline/release, condition effects,
and rest/resource boundaries. The registry distinguishes semantic-core QNT
owners from MBT parity fixtures. The following manifest-backed accounting
resolves every selected obligation through `qnt-owner-roles.jsonl` (33 unique
semantic-core owners; repeated owners are intentionally shown under each
obligation that selects them):

- **BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND** — `packages/shared-algebras/proofs/rule-core/movement-spatial-grapple.qnt`
- **BATTLE.MOVEMENT.ORDINARY_CREATURE_SPACE_TABLE_ROUTE** — `packages/shared-algebras/proofs/rule-core/ordinary-creature-space-route.qnt`
- **BATTLE.REACTION.OFFER_DECLINE_RESUME** — `packages/battle-runtime/battle-runtime-reaction-window.qnt`, `packages/battle-runtime/battle-runtime-shield-reaction-decision.qnt`, `packages/battle-runtime/battle-runtime-direct-shield-reaction-resolution.qnt`, `packages/battle-runtime/battle-runtime-light-shield-reaction-resolution.qnt`, `packages/battle-runtime/battle-runtime-save-gated-shield-reaction-resolution.qnt`, `packages/battle-runtime/battle-runtime-weapon-shield-reaction-resolution.qnt`, `packages/battle-runtime/battle-runtime-triggered-reaction-resolution.qnt`, `packages/battle-runtime/battle-runtime-attack-damage-concentration-reaction.qnt`, `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt`, `packages/battle-runtime/battle-runtime-opportunity-attack.qnt`
- **BATTLE.COMMAND.OPTION_AND_NEXT_TURN** — `packages/battle-runtime/battle-runtime-command-next-turn.qnt`, `packages/battle-runtime/battle-runtime-command-control-next-turn.qnt`, `packages/battle-runtime/battle-runtime-command-movement-next-turn.qnt`
- **BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE** — `packages/battle-runtime/battle-runtime-hit-points.qnt`, `packages/battle-runtime/battle-runtime-turn-advancement-death-save.qnt`
- **BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING** — `packages/battle-runtime/battle-runtime-weapon-attack-ordering.qnt`, `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.qnt`, `packages/battle-runtime/battle-runtime-save-gated-spell-replay.qnt`, `packages/battle-runtime/battle-runtime-spell-attack-ordering.qnt`, `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.qnt`, `packages/battle-runtime/battle-runtime-command-ordering.qnt`, `packages/battle-runtime/battle-runtime-stat-block-action-ordering.qnt`
- **BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY** — `packages/battle-runtime/battle-runtime-reaction-window.qnt`, `packages/battle-runtime/battle-runtime-attack-damage-concentration-reaction.qnt`, `packages/battle-runtime/battle-runtime-triggered-reaction-resolution.qnt`, `packages/battle-runtime/battle-runtime-opportunity-attack.qnt`, `packages/battle-runtime/battle-runtime-hellish-rebuke-reaction.qnt`, `packages/battle-runtime/battle-runtime-counterspell-reaction-decision.qnt`, `packages/battle-runtime/battle-runtime-spell-cast-reaction-resolution.qnt`, `packages/battle-runtime/battle-runtime-weapon-counterspell-resolution.qnt`, `packages/battle-runtime/battle-runtime-save-gated-counterspell-resolution.qnt`, `packages/battle-runtime/battle-runtime-replay-equivalence.qnt`
- **BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING** — `packages/battle-runtime/battle-runtime-turn-advancement.qnt`, `packages/battle-runtime/battle-runtime-weapon-hit-turn-effects.qnt`, `packages/battle-runtime/battle-runtime-fighter-ongoing-feature-lifecycle.qnt`

The owning public proof lane is
`pnpm --filter @dnd/battle-runtime run test:qnt-proofs`; its passing result
below is the semantic-core evidence for every discovered run-block owner in
the Battle Runtime package. The shared rule-core owners are run through the
same repository QNT proof lane recorded below. This mapping is exhaustive, not
a representative subset.
The separate bridge `battle-runtime-movement-bridge.qnt` only projects those
movement facts into the Battle Runtime and is bridge/parity evidence, not a
semantic authority. `battle-runtime-interrupt-stack-resume.mbt.qnt`,
`battle-runtime-command-ordering.mbt.qnt`, `battle-runtime-death-saving-throw.mbt.qnt`,
`rule-core-movement.mbt.qnt`, `rule-core-reactions.mbt.qnt`, and
`battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt` are MBT parity fixtures,
not semantic authorities. Shared `action-economy-algebra-inductive.qnt`,
`conditions-algebra-inductive.qnt`, and `death-saves-algebra-inductive.qnt`
remain the #374 pure-algebra proof owners; their passing inductive proof
commands are recorded in the #374 closure section above.

The exact owner sweep command was one lock-held sequential process. The first
expression derives and validates the owner list from the committed manifest,
obligation registry, and role registry; the locked body then typechecks each
resolved path in order:

```bash
owner_list=$(node -e 'const fs=require("node:fs"); const manifest=JSON.parse(fs.readFileSync("docs/migrations/effect-4/gh379-registry-path-manifest.json","utf8")); const selected=new Set(manifest.obligationIds); const obligations=fs.readFileSync("plans/rules-kernel-coverage/obligations.jsonl","utf8").trim().split(/\r?\n/).map(JSON.parse); const roles=new Map(fs.readFileSync("plans/rules-kernel-coverage/qnt-owner-roles.jsonl","utf8").trim().split(/\r?\n/).map(JSON.parse).map(row=>[row.ownerPath,row.role])); const owners=[]; for (const obligation of obligations) { if (!selected.has(obligation.id)) continue; for (const owner of obligation.qntOwners ?? []) if (roles.get(owner)==="semantic-core" && !owners.includes(owner)) owners.push(owner); } if (owners.length!==33) process.exit(2); process.stdout.write(owners.join("\n"));')
export GH379_QNT_OWNERS="$owner_list"
. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-mbt-lock.sh bash -c '
  set -euo pipefail
  mapfile -t owners <<< "$GH379_QNT_OWNERS"
  test "${#owners[@]}" -eq 33
  for owner in "${owners[@]}"; do pnpm exec quint typecheck "$owner"; done
'
```

The command exited `0` after `33/33` owners; no partial or queued result is
counted as evidence. The elapsed-time reporter waited through normal lock
contention before acquisition and emitted progress during the sequential run.

The reproducible audits use the committed
[`gh379-registry-path-manifest.json`](./gh379-registry-path-manifest.json).
They expand the 74 unique non-deferred paths only; the two deferred script
paths are intentionally excluded because #385 owns their Effect 4 migration.
The root-`Either` audit checks removed module imports, root named or
namespace imports, and the removed `Either.*` members without banning native
Effect 4 `Result` APIs. The exact executable commands are:

```bash
set -eu
mapfile -t audit_paths < <(node -e 'const x=require("./docs/migrations/effect-4/gh379-registry-path-manifest.json"); const deferred=new Set(x.deferredScriptPaths); process.stdout.write([...new Set([...x.sourceOrPurePaths,...x.parityOrFixturePaths].filter((path)=>!deferred.has(path)))].join("\n"))')
set +e
rg -n -U -uu --pcre2 \
    -e '(?:from|import\s*\(|require\s*\()\s*(?:"effect/Either"|\x27effect/Either\x27)' \
    -e '(?:import|export)\s+(?:type\s+)?\{[^}]*\bEither\b[^}]*\}\s*from\s*(?:"effect"|\x27effect\x27)' \
    -e '(?:import|export)\s+(?:type\s+)?\*\s+as\s+Either\s+from\s*(?:"effect"|\x27effect\x27)' \
    -e '\bEither\.[A-Za-z_][A-Za-z0-9_]*' \
    -e 'Schema\.optionalWith' \
    -e 'Schema\.decodeUnknownEither' \
    -e 'Schema\.standardSchemaV1' \
    -e 'Schema\.BigIntFromSelf' \
    -e 'Schema\.transform' \
    -e 'Schema\.Schema\.AnyNoContext' \
    -- "${audit_paths[@]}"
audit_status=$?
set -eu
case "$audit_status" in
  1) ;;
  0) echo "forbidden Effect 3 API matches found" >&2; exit 1 ;;
  *) exit "$audit_status" ;;
esac
set +e
rg -n -U -uu --pcre2 \
    -e 'from\s*(?:"effect/(?:Fiber|Scope|Schedule|Layer|Stream|Queue|Deferred|Ref)"|\x27effect/(?:Fiber|Scope|Schedule|Layer|Stream|Queue|Deferred|Ref)\x27)' \
    -e 'import\s*\{[^}]*\b(?:Fiber|Scope|Schedule|Layer|Stream|Queue|Deferred|Ref)\b[^}]*\}\s*from\s*(?:"effect"|\x27effect\x27)' \
    -e 'import\s+\*\s+as\s+(?:Fiber|Scope|Schedule|Layer|Stream|Queue|Deferred|Ref)\s+from\s*(?:"effect"|\x27effect\x27)' \
    -e '\b(?:Fiber|Scope|Schedule|Layer|Stream|Queue|Deferred|Ref)\.(?:make|run|fork|forkScoped|scoped|provide|merge|from|emit|offer|take|get|set|update|unsafeRun|close|interrupt|schedule|spaced|forever)\b' \
    -- "${audit_paths[@]}"
audit_status=$?
set -eu
case "$audit_status" in
  1) ;;
  0) echo "Effect fiber/scope/scheduling API matches found" >&2; exit 1 ;;
  *) exit "$audit_status" ;;
esac
```

Both audits completed with zero matches. The deferred-path audit is
separate and intentionally reports the still-unmigrated `Either` import/member
uses in `scenario-session.ts` and `scenario-setup-runtime.test.ts`; those
matches are evidence for #385, not evidence against the #379 Battle source
closure.

Reviewer-loop convergence at this evidence revision: RAW anchors were rechecked against the
local SRD corpus, ubiquitous-language terms remain the existing Battle terms,
architecture/connascence review found no duplicated state or caller-ordering
contract, PHB+ policy review found no protected identity or prose, and
standards/spec/code review found only the #385 ownership/deferred-path and
bridge-authority distinctions corrected in this snapshot.

The only code change in this branch is the generic MBT projection correction in
`src/rule-core-spells.mbt.test.ts`, which was needed to reproduce the dependent
#380 spell lanes; no #379 reducer, codec, schema, QNT, or spell-procedure source
changed. The projection reads canonical raw turn-resource availability,
preserving exact-once resource semantics while leaving public
act-discoverability projection unchanged. The remaining diagnostics are
intentionally retained for #380/#381 follow-up and must not be attributed to
this lifecycle owner.

One exploratory command, `pnpm typecheck -- --continue`, forwarded
`--continue` to each package's `tsc` and produced TS5023 (`Unknown compiler
option '--continue'`). It is excluded from every count because it did not run a
continuation mode and is not a migration diagnostic. The correct inventory is
the explicit owner sweep documented above.

## Issue #381 persistent spells and active effects evidence snapshot

This section records the authoritative clean integration verification at source
HEAD `e0cb1d701`. The local branch matched its remote, and the generated #381
manifest selected 58 obligations. The historical diagnostic inventory below
is preserved as migration history; it is not the current #381 verification
result.

The adapter diff follows the local Effect v3-to-v4 migration guidance and the
checked-in RC migration reference: removed `Schema.standardSchemaV1`,
`Schema.BigIntFromSelf`, and `Schema.transform` construction is replaced by
the repository's canonical `mbtPickSchemas` boundary helpers. No cast,
compatibility facade, or invented migration API was added.

### Scope and canonical ownership

The committed [`gh381-registry-path-manifest.json`](./gh381-registry-path-manifest.json)
derives the exact selection from `obligations.jsonl`: every
`BATTLE.SPELL` row whose kind is `active-effect-lifecycle` or
`reaction-continuation`, plus the explicit granted-action, Antimagic action
interdiction, Reaction, interrupt-stack, concentration-teardown, and
turn-boundary rows in the manifest. It contains 58 obligation IDs and records
the direct five-obligation adapter mapping:

| #381 concern                          | Manifest evidence                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concentration and continuation        | 42 IDs, including area hazards, save-gated effects, Ray of Enfeeblement, Reaction continuation, and concentration teardown                          |
| Ongoing/persistent and active effects | 49 active-effect lifecycle IDs                                                                                                                      |
| Spatial hazards                       | 11 IDs, including Sleet Storm, Insect Plague, Cloudkill, Web, Gust of Wind, Spike Growth, Grease, Fog Cloud, Darkness, Flaming Sphere, and Moonbeam |
| Granted actions                       | Dragon's Breath initial/granted action and Haste positive-effect IDs (3)                                                                            |
| Spell reactions/interruption          | Reaction offer/decline, Feather Fall, forced movement, reaction casting, interrupt replay, and concentration teardown (6)                           |
| Suppression                           | Antimagic ongoing suppression and Magic Action interdiction (2)                                                                                     |
| Expiration/cleanup                    | 53 active-effect, continuation, turn-boundary, and concentration teardown IDs                                                                       |
| Directly migrated adapter obligations | Mirror Image, Moonbeam, Ray of Enfeeblement D20, Ray of Enfeeblement damage penalty, and See Invisibility (5)                                       |

The manifest also records related but unselected profile/state-transition rows
(`READIED_RESPONSE_PROCEDURE`, `SPIRITUAL_WEAPON_ATTACK_PROXY`, the additional
Antimagic interdiction/transit rows, and Glyph release rows). They are not
silently claimed by this lifecycle-family selection: Readied Response was
audited in the #380 spell-execution lane, while the other rows remain explicit
follow-up boundaries if the #381 migration diagnostic scope expands.

Battle state is the canonical owner of active spell effects, concentration,
effect expiration, suppression projections, granted-action availability, and
interrupt continuations. Spell definitions and spell access remain authored
and selection boundaries; invocation facts are parsed before reducer
execution. Reducers consume typed procedure facts and current state. They do
not derive execution behavior from spell names, ids, slugs, or provenance, and
the manifest does not add a second state store.

Duration is a discriminated state, not an optional alias for an empty value.
`BattleActiveEffectExpiration` has explicit `duration`, `concentration`, and
`untilDispelled` branches. A `duration` branch requires `durationTicks`. A
`concentration` branch may omit `durationTicks`: omission means the effect is
bounded by concentration break only, while presence supplies a ticking upper
duration in addition to concentration break. Effect variants that require a
bounded concentration duration narrow that field back to required. The
`untilDispelled` branch has no duration field. This present/omitted distinction
is preserved by `Schema.optionalKey` in `active-effect/expiration-codecs.ts`;
it must not be rewritten as `undefined`, an empty collection, or a default
duration.

### RAW, ubiquitous language, and identity boundary

The local SRD 5.2.1 corpus was searched with bounded `rg -uu` commands and
then inspected directly. The relevant authorities are:

- `Rules-Glossary.md#Concentration` for one-concentration ownership, another
  concentration effect, damage saves, and Incapacitated/death teardown;
- `Rules-Glossary.md#Area-of-Effect`, `#Reaction`, `#Ready-Action`, and
  `#Incapacitated` for area facts and continuation boundaries;
- `Spells/Gaining-and-Casting.md#Reaction-and-Bonus-Action-Triggers`,
  `#Longer-Casting-Times`, and `#Duration` for spell timing and concentration;
- `Spells/Descriptions-A-D.md#Antimagic-Field`, `#Cloudkill`, `#Dispel-Magic`,
  and `#Dragon's-Breath`;
- `Spells/Descriptions-M-P.md#Mirror-Image` and `#Moonbeam`;
- `Spells/Descriptions-Q-R.md#Ray-of-Enfeeblement`; and
- `Spells/Descriptions-S-Z.md#See-Invisibility`, `#Sleet-Storm`,
  `#Spike-Growth`, and `#Web`.

The terms used here are the existing `UBIQUITOUS_LANGUAGE.md` terms: Spell
Definition, Spell Access, Spell Invocation, Spell Effect, Concentration,
Action Lifecycle, Resolve, Apply, Advance, Offer, and Decline. No PHB+
record, id, name, slug, prose, heading, page reference, or source-to-Mushroom
crosswalk was added. Existing SRD material and synthetic test identities only
remain admissible. A targeted identity-dispatch scan over the manifest's 92
TypeScript source/runtime paths found no `spell.id`, `spell.name`,
`spell.slug`, `spell.provenance`, or `spellDefinition.*` dispatch. The 11
`spellId` occurrences are typed Battle-subject boundary data, not dispatch
conditions.

### Static manifest and API audits

The original static manifest audit recorded a historical pre-registration
snapshot: 58 selected IDs, 203 source/pure paths, 86 parity/non-authority paths,
44 referenced MBT specs, and 125 resolved QNT paths (111 `semantic-core`, 4
`bridge`, 3 `mbt-fixture`, and 7 `proof-only`), with Insect Plague and
Cloudkill still unregistered. Those counts and gaps are superseded rather than
current evidence. The authoritative current accounting is the checked-in,
deterministically generated
[`gh381-registry-path-manifest.json`](./gh381-registry-path-manifest.json),
whose provenance hashes identify the registry inputs and generator revision
and whose check requires normalized, existing repository files. No bridge,
fixture, or proof-only path is labeled semantic authority.

The exact dependency-free API audit expanded the manifest's
`sourceOrPurePaths` and `parityOrFixturePaths`, excluding its two #385 deferred
script paths, then ran fixed-string searches for `effect/Either`, `Either.`,
`Schema.optionalWith`, `Schema.decodeUnknownEither`,
`Schema.standardSchemaV1`, `Schema.BigIntFromSelf`, `Schema.transform`, and
`Schema.Schema.AnyNoContext`, plus root-`effect` named `Either` imports.
Result: 289 paths, zero matches. The targeted authored-identity and
Fiber/Scope/Layer/Schedule/Stream/PubSub/Queue/Deferred/Ref import/member
audits likewise returned zero matches. `git diff --check` passed. These are
static findings only; they do not substitute for runtime behavior or QNT
execution evidence.

### Authoritative dependency-backed evidence

The clean `e0cb1d701` verification passed the generated manifest self-test and
stale check, the Rules Kernel inventory with 147 obligations, and Unit Profile
accounting with 400 units and 258 profiles. Workspace quality inventory, MBT
driver closure (8/8), MBT script inventory (all 147 Battle tests accounted),
QNT inventory (775/775), and the Battle Runtime package typecheck also passed.

Public MBTs passed sequentially under their required lock: Insect Plague 4/4,
Cloudkill 6/6, Condition Saving Throw selected identity 7/7, and Turn Boundary
Effect Lifecycle 8/8. Direct semantic verification passed 16 QNT typechecks and 21 Quint tests
across the selected modules (3 + 8 + 7 + 2 + 1). Four sampled runs completed
100 samples each: Cloudkill at maxSteps 2 with seed
`0x66e0437b79ede492`, Insect Plague at maxSteps 8 with seed
`0x68ab5020f627e10f`, Protection at maxSteps 8 with seed
`0xe725c7a67c03f1bc`, and the turn-boundary route at maxSteps 4 with seed
`0x92d9e0c1ed39d901`. `pnpm quality:milestone` was explicitly not run.

The semantic-core sweep derives both its paths and expected count from the
generated manifest:

```sh
# Resolve the semantic-core owners and count from the committed manifest, then run
# each direct Quint typecheck sequentially under the required MBT lock.
owner_list=$(node -e 'const fs=require("node:fs"); const m=JSON.parse(fs.readFileSync("docs/migrations/effect-4/gh381-registry-path-manifest.json","utf8")); process.stdout.write(m.qntOwnerAccounting.semanticCorePaths.join("\n"));')
owner_count=$(node -e 'const fs=require("node:fs"); const m=JSON.parse(fs.readFileSync("docs/migrations/effect-4/gh381-registry-path-manifest.json","utf8")); process.stdout.write(String(m.qntOwnerAccounting.counts.semanticCore));')
export GH381_QNT_OWNERS="$owner_list"
export GH381_QNT_OWNER_COUNT="$owner_count"
. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-mbt-lock.sh bash -c '
  set -euo pipefail
  mapfile -t owners <<< "$GH381_QNT_OWNERS"
  test "${#owners[@]}" -eq "$GH381_QNT_OWNER_COUNT"
  for owner in "${owners[@]}"; do pnpm exec quint typecheck "$owner"; done
'
```

The tracked inventory is still the historical #380 snapshot
`SHA-256 d05ae671a2671cbd1f9a2d51d13c484de37830ba164eb2419534b8c0915465f3`:
1,129 raw and 1,006 deduplicated diagnostics (176 app, 19 battle-runtime,
934 MCP, and zero for the other owners), recorded before source HEAD
`4e48b4ca7`. Those numbers are not a #381 result and are intentionally retained
only as the pre-#381 controlled-red diagnostic baseline.

The static RAW/ubiquitous-language, architecture/connascence, API, identity,
and ownership passes converged with the dependency-backed QNT, runtime, and MBT
evidence above. This evidence records the verified integration revision; it
does not claim that `quality:milestone` ran.

## Issue #383 MCP schemas, protocols, and lifecycle evidence snapshot

This section records clean integration verification at source revision
`e31deed2676527c0a54863d5fe362d818f9c8bf1` for the #383 MCP migration. The
canonical Effect 4 schema seam decodes the original transport codec, preserving
encoded-wire behavior such as `NumberFromString`; it does not decode only the
codec's type-side projection. HTTP, stdio, OAuth, saved-session, admin, and
public-server lifecycle paths use the migrated Effect 4 contracts. Expected
transport and lifecycle failures remain typed and observable. The shipped
public-server probe owns each attached client transport exactly once and
exercises graceful SIGTERM completion while an MCP request is active.

The immutable historical certificate remains a separate oracle lane. The
current shipped public entry point is exercised with its full normalized
27-tool definition and representative stdio calls, but its result is not
serialized into the historical oracle. The whole immutable comparison reaches
the intentional controlled delta: the Effect 4 candidate is 51,966,797 bytes
and the Effect 3 oracle is 12,997,527 bytes. This is not recorded as a green
comparison. Eliminating the differences or admitting them through the reviewed
finite delta certificate remains owned by #386.

### RAW, ubiquitous language, and identity boundary

The local SRD 5.2.1 corpus was searched in bounded `rg -uu` commands and the
likely files were then inspected directly. The retained companion behavior is
grounded by `Spells/Descriptions-E-L.md#Find-Familiar`: the familiar uses the
chosen Beast statistics, acts on its own initiative, and disappears at 0 Hit
Points. `Monsters/Overview.md#Hit-Points`, `Rules-Glossary.md#Hit-Points`, and
`Playing-the-Game.md#Hit-Points` provide the directly inspected Hit Point and
damage boundaries. Existing assumptions A46 and A47 continue to identify the
choices left outside those passages. Dice limits in this lane are transport
work budgets, not D&D rules.

The migration adds no rule behavior, authored-identity dispatch, PHB+ content,
or provenance change. The existing ubiquitous-language and runtime ownership
boundaries remain intact: transport schemas admit and project inputs while the
runtime consumes typed facts rather than names, ids, slugs, or provenance.

### Verification and review convergence

- `pnpm --filter @dnd/mcp typecheck --pretty false`: passed.
- Focused schema, stdio, and authorization service tests: 3 files and 13 tests
  passed.
- Operational saved-session smoke tests: 1 file and 3 tests passed.
- Clean broad MCP suite excluding the intentionally red immutable baseline:
  56 files and 412 tests passed in 184.94 seconds.
- Controlled-red diagnostic inventory: 125 raw and 125 deduplicated
  diagnostics; `@dnd/mcp` has zero. The remaining owners are app (60),
  battle-runtime (62), and character-sheet-runtime (3). Inventory SHA-256:
  `ded8ee2d2924af59d5cd9b1504282a04097346c8d101f0dea6e5a1baf3fa7bfe`.
- The baseline live-process probe completed its shipped-server assertions and
  then reached only the explicit 51,966,797-byte versus 12,997,527-byte global
  oracle mismatch described above.

The repeated two-axis review against fixed point `f7343b470` converged with no
remaining findings. The Standards axis passed after checking the repository
rules, local RAW traceability, ubiquitous language, architecture/connascence,
authored identity, provenance, and PHB+ boundaries. The Spec axis passed for
#383 after the encoded-schema, interruption, live-entry-point, in-flight
shutdown, and exact-once cleanup corrections. The global immutable-oracle delta
is explicitly retained for its #386 owner and is not counted as #383 green
evidence. `pnpm quality:milestone` was not run for this issue snapshot.

## Issue #384 application flow evidence snapshot

This section records the application migration at source revision
`3aee07b3c`. The React entry point, Admin Mirror loaders and event actions,
Character Creation and Character Sheet workflows, and Battle presentation and
continuation flows now consume the settled Effect 4 `Result` contracts. The
Admin Mirror decoders use the package-owned schemas through
`Schema.decodeUnknownResult`; the app does not provide an `Either`
compatibility layer or a second decoder.

The migration preserves the existing UI state boundaries. Character Draft
open, invalid, and ready finalization states remain distinct from Character
Sheet construction and projection failures. Empty Character Sheet collections
and initial-loading, confirmed-empty, invalid-configuration, invalid-response,
unavailable, and missing-retained-session Admin Mirror states have separate
user-visible projections. The configured Admin Mirror origin is decoded once
through `Schema.URLFromString`, restricted to a branded HTTP(S) origin, and
carried as `URL` through the HTTP and event-stream boundaries. Battle snapshot
and scene projection failures remain typed and user-visible rather than being
replaced by fallback execution facts.

Admin Mirror stream transport failure and invalid decoded events have separate
typed, always-visible status projections while retained sessions remain
available. A single collection reducer owns GET snapshots and streamed
sessions. Its one canonical session collection is updated by the stream; while
a GET is active, a set of streamed session identities determines which
canonical records supersede the response snapshot without storing their
payloads twice. Stale GET completions are ignored, and only GET completion
marks the collection loaded because the server's initial SSE replay has no
completion marker. Invalid mirror configuration initializes both the
collection and stream projections directly, so the first render cannot present
loading or connecting. Boundary parser failures are tagged records, and
private fetch and response-decoding helpers expose only the failure variant
each can produce.

No D&D rule behavior, authored content, provenance, or authored-identity
execution dispatch changed in this application-only migration. The application
continues to consume runtime-owned Character Build, Character Sheet, battle
checkpoint/frontier, and presentation projections without storing a parallel
execution model.

The independent RAW pass used a bounded hidden-path `rg -uu` search before
directly inspecting the likely SRD 5.2.1 corpus files. The user-visible
Character Creation and Character Sheet terms remain grounded by
`Character-Creation.md#Step-3-Ability-Scores` (Standard Array and Point Cost),
`Character-Creation.md#Step-5-Character-Creation-Details` (Hit Points, Temporary Hit
Points, Death Saving Throws, and Spell Slots), and
`Spells/Gaining-and-Casting.md#Spell-Slots`. The unchanged Battle demo terms
were checked directly against `Playing-the-Game.md#Damage-and-Healing` and the
Counterspell, Fireball, and Shatter entries in the local spell-description
files. No assumption or rules implementation changed.

### Verification

- `pnpm --filter @dnd/app run typecheck --pretty false`: passed; the app owner
  moved from 60 diagnostics to zero.
- `pnpm --filter @dnd/app test --reporter=dot`: passed, 18 files and 88 tests.
- Focused route boot and route selection tests: passed, 2 files and 10 tests.
- `pnpm --filter @dnd/app build`: passed; Vite transformed 1,543 modules and
  emitted the production bundle. The existing large-chunk advisory remained a
  warning, not a build failure.
- `pnpm --filter @dnd/app lint`: passed, including ESLint, Prettier, and the
  package duplication threshold.
- `pnpm regenerate:effect4-controlled-red`: passed. The inventory now records
  65 raw and 65 deduplicated diagnostics, with `@dnd/app` at zero; the remaining
  owners are battle-runtime (62) and character-sheet-runtime (3). Inventory
  SHA-256: `1c55aa460e7c8d0063372e85d49a924ea7365fc2c5d258830dfa4c4aa173cc83`.

The Standards and Spec passes against fixed point `b0aeb8eab` produced the
typed stream-status, GET/SSE synchronization, narrow helper failure, and tagged
parser-issue corrections. The final Standards corrections then removed the
duplicate streamed-session payload owner, derived the initial invalid-origin
projections, and replaced the request wrapper with one branded request
identity constructed through its Effect Schema. The independent review
rechecked the same local RAW anchors directly and found no
D&D-rule behavior change. The final self-review confirmed the URL and
collection ownership boundaries, distinct UI failure states, absence of
compatibility adapters or duplicate decoding, and the authored-identity,
provenance, PHB+, architecture, and connascence boundaries.

`pnpm quality:milestone` was not run for this package-scoped issue snapshot.

## Issue #385 scripts and Raw Swarm evidence snapshot

This section records the Effect-bearing script, Raw Swarm, and battle-slice
server migration at source revision `b587ca28a`. The migration replaces the
Effect 3 `Either` and Schema compatibility surface with the pinned Effect 4
`Result`, `Schema`, `JsonSchema`, `@effect/platform-node`, and runtime teardown
contracts. Boundary inputs are decoded once and carried forward as narrowed
values; unsupported input remains fail-closed, accumulated review reporting is
preserved, and no compatibility adapter or parallel decoder was introduced.

The battle-slice entry point now supplies a native runtime teardown that waits
for queued standard output before delegating to Effect's default teardown. Its
lifecycle test initializes the MCP server, starts a roughly 239 KiB
`tools/list` response, observes a partial response without a newline, and sends
each of `SIGINT` and `SIGTERM` while that response is in flight. Both cases
then prove complete newline-framed JSON, byte-for-byte output ownership, exit
code 130, empty standard error, and cleanup; no timing sleep is used.

After master reconciliation, the public declaration graph has a reviewed
deterministic measure of 530 files and 4,667,450 bytes. The file limit is
exactly 530. The byte limit remains 10 MiB, with a 5,818,310-byte margin. Tests
prove acceptance exactly at both caps and fail-closed rejection at each cap
plus one, and the real public distribution must equal the reviewed measure.
The comparison baseline is commit `38e79b814`: 523 files and 3,962,445 bytes,
with independently reproduced sorted POSIX relative-path ledger SHA-256
`05479f0c8ae9b75bb263ca7dc10cb61ed68fef4da3ba57cd54f4603d41a55cb8`.
The reviewed ten additions and three removals from that pinned graph are listed
with their owning reachability in
[`final-parity-report.md`](./final-parity-report.md#master-reconciliation-declaration-certificate);
the canonical type-only owner is
[`stat-block-catalog-contract.ts`](../../../packages/surface/src/surface/stat-block-catalog-contract.ts),
and the generated SRD Stat Block aggregate is excluded from the declaration
bundle. This focused #385 evidence does not claim completion of the remaining
#386 public gates. Raw Swarm lane hygiene again enforces that `quality:body` does not
invoke the deterministic `:body` command; the public deterministic owner
continues to acquire its documented lock itself.

The scenario campaign's content/capability admission union is the Cartesian
product of both owning schema unions' `members`, so either owner widening is
reflected without a separately maintained identity table. The four
integration-added battle-hole variants (`areaWindStrength`,
`cloudkillMovement`, `startTurnOccurrenceOrder`, and
`temporaryHitPointChoice`) are covered only by the exhaustive typed admission
record and canonical `BattleHoleSchema` decoder. They are generic runtime
projection plumbing: there is no authored name, id, slug, or provenance
dispatch and no new user-visible D&D rule calculation. Accordingly, this
exhaustive migration did not touch a D&D rule and required no new RAW lookup.

### Verification and review convergence

- The controlled SDK-player TypeScript inventory moved from 2,483 diagnostics
  to zero.
- `pnpm check:effect4-cohort:self-test` and `pnpm check:effect4-cohort` passed;
  the repository remains pinned to Effect `4.0.0-rc.112`.
- Focused lifecycle, scenario campaign, complete-path, and consumer
  distribution tests passed: 4 files and 95 tests.
- The post-#384 scenario setup runtime suite passed: 30 tests.
- `pnpm check:raw-swarm-lane-hygiene` passed with 38 deterministic-lane tests,
  2 closed prototype exclusions, and 8 explicit model-backed operations.
- `pnpm check:raw-swarm-deterministic` passed at `b587ca28a`: the trusted lane
  passed 5 files and 257 tests, and the guarded lane passed 33 files and 418
  tests.

The two-axis review against fixed point `2db3b42c5` converged after the
in-flight response lifecycle proof, measured declaration limits and boundary
tests, strict lane separation, and derived admission-product corrections. The
Standards/RAW axis otherwise found the authored-identity, provenance, PHB+,
architecture, connascence, and rule-traceability boundaries clean. The Spec
axis found no remaining issue #385 gap after the corrections above.

An exploratory declaration-emitter probe accidentally selected the host's
unbounded native TypeScript 7 path and reached approximately 20.6 GiB RSS over
five minutes. Cgroup memory events showed no limit or OOM event. After it did
not respond to `SIGTERM`, only the confirmed probe PID `3013979` was stopped
with `SIGKILL`; no partial output was accepted as verification. The pinned
repository emitter subsequently completed in 46 seconds, and all evidence
above comes from the pinned repository commands. `pnpm quality:milestone` was
not run for this issue snapshot.

## Issue #386 current certification and controlled-red closure

Issue #386 removes the migration exception rather than extending it. The final
inventory covers all 14 package owners and records zero raw and zero
deduplicated diagnostics. Its SHA-256 is
`47bcb642a9e7907630022930c73c9d75e9b4926b68e5c4a3814417417f608f72`.
The retired inventory generator and mutation package scripts are absent;
`pnpm typecheck` is the current executable owner and any future diagnostic is
an ordinary blocking failure.

The repository and installed dependency graph select Effect
`4.0.0-rc.112`, `@effect/platform-node@4.0.0-rc.112`,
`@effect/platform-node-shared@4.0.0-rc.112`, and
`@effect/vitest@4.0.0-rc.112`, with no Effect 3 or unsupported Effect package.
The clean-consumer deployment independently verifies the production MCP
package graph, while the application and script lifecycle evidence exercises
their exact shipped entrypoints.

The immutable baseline and the complete finite Effect 4 disposition are owned
by the [final parity report](./final-parity-report.md#immutable-oracle-and-finite-delta).
That report records the candidate artifact, exact identity set, classification
totals, collection authorities, and certificate digest in one place. The
verifier rejects changed baseline or candidate bytes, unreadable artifacts,
duplicate, unclassified, multiply classified, or stale exact identities, and
stale aggregate counts or hashes.
The authored-identity boundary also passes after removing the stale generic
`runtimeCommandSubject` exemption: 4,735 literals, 795 checked source files,
552 exercised exact exemptions, and 1,214 reviewed sites / 1,325 occurrences.

The subsequent master-reconciliation authored-identity audit passes with
7,328 literals from 283 decoded Surface spell records, 818 checked source
files, 762 excluded fixture or artifact files, and the unchanged 9 narrowly
allowlisted boundary files. It exercises 620 exact exemptions and authenticates
1,294 reviewed sites / 1,405 occurrences with SHA-256
`1a6b83fc6597ebcb817af5b723557f9e8e3cc219562c584de14f3e45bc4ecc02`.
The audit adds 68 exact exemption keys covering 79 reviewed collision sites:
55 teleportation keys, 4 Fly Speed keys, 6 illumination keys, 2 damage
Resistance keys, and 1 healing-link key. Seven Haste-named reusable execution
declarations were structurally renamed instead of exempted. Normalized evidence
resolves the prior one-site disagreement: one `storedLightEmitters` occurrence in
`battleSnapshotInvariantsHold` was replaced by two occurrences in extracted
serialized-reference and environmental-source validation owners, while the
`heldLightHurl` semantic relocation into a presentation-procedure set remained
inside the narrow presentation boundary and was not collision-certificate
evidence. This focused static checkpoint does not claim a new final fixed point
or completion of the remaining public gates.
The current integrated source fixed point is `e936c8c1a`, including the
refreshed generated certification artifacts and reviewed Raw Swarm declaration
measure. The final controlled-red inventory still covers all 13 package owners
with zero recorded diagnostics, and its SHA-256 remains
`347dde4c3f6ed0a2c0f674fd0c2dce8edfacbc3135ebc7f7b0ee7c29c008c036`.
The retired inventory generator and mutation scripts remain absent. This
stored inventory does not substitute for the pending broad `pnpm typecheck` at
the integrated fixed point; any observed diagnostic is an ordinary blocker.

The immutable Effect 3 oracle remains 12,997,527 bytes with SHA-256
`dc131ce8b7e588e288d20a25881df1817552b1469b9aea1dc2b55ba3fdc6df7b`.
The current Effect 4 candidate remains 52,152,897 bytes and has SHA-256
`06caf573f4a04809c8f8e4ec75e7ca8166aa70b3e050ffca5e76dcabe36dc2bb`.
The staged v2 certificate records exactly 7,246 reviewed identities, has
identity SHA-256
`f580748a45802d4f0d04f621a5fad558abe85021294654e3b2d41e4390ccdc8d`,
and is 4,656,210 bytes with artifact SHA-256
`63eade8b0bd7bfa304d7bff83bfade023d70cc9cd1f9435d271b9bc208eed502`.
Exactly two `scripts/raw-swarm/OPERATIONS.md` identities were replaced under
the existing Raw Swarm reason; all per-reason counts remain unchanged. The
strict decoder passed, two self-test invocations passed all 15 tests, and the
final pinned current verification at approximately 2026-08-30T22:05Z completed
with exit 0. The candidate byte count and SHA-256 and the 7,246-identity SHA-256
above remained unchanged. The command reported
`Effect 4 finite oracle delta verified (7246 reviewed identities).` The
#381 generated manifest selects 58 obligations and has SHA-256
`998be34b672077873b47937ae532d781d144e5dfdec6329af38eae16c096e01b`;
focused coverage accounting is 147 Rules Kernel obligations and 400 Units / 258
profiles.

The proof-lane closure checks passed, but the first `pnpm proof:qnt` attempt did
not pass. The attempt reported failures for
`metamagic-options-and-quickened-restoration`, `restoration`, `scalar-buff`,
`spatial-movement-spell`, and `spellcasting-and-utility-facts`, then was
manually cancelled with exit 130. No partial proof result is accepted as
closure evidence.

Commit `15ba8ebe2` repairs the shared Feather Fall trigger-witness type and the
Jump landing-fact match exposed by those failures. Under one focused MBT lock,
all five roots then typechecked and their 29 discovered tests passed with exit 0. QNT inventory remained 806/806, proof closure remained within 60 files and
12,500 lines, and MBT driver closure passed. The #381 manifest retained 58
obligations; Rules Kernel coverage retained 147 obligations; Unit Profile
coverage retained 400 Units / 258 profiles. Independent RAW, domain,
architecture, connascence, and Quint review reported no findings.

A later public `pnpm proof:qnt` run passed its inventory and closure gates and
advanced beyond the repaired `metamagic-options-and-quickened-restoration`
owner. Its terminal exit was not observed because the attached command session
was lost. The operator directed that this full lane not be rerun. This records
an accepted execution risk and does not describe the full proof lane as
verified.

The four originally required SR-00 Battle MBT public scripts and the
repair-sensitive chained-attack lane have final observed results at
`595a3ac1c`:

| Public command                                                                            |             Final result |
| ----------------------------------------------------------------------------------------- | -----------------------: |
| `pnpm --filter @dnd/battle-runtime run test:mbt:condition-saving-throw-selected-identity` | 2/2 tests passed; exit 0 |
| `pnpm --filter @dnd/battle-runtime run test:mbt:turn-boundary-effect-lifecycle`           | 8/8 tests passed; exit 0 |
| `pnpm --filter @dnd/battle-runtime run test:mbt:chained-attack-sequence`                  | 3/3 tests passed; exit 0 |
| `pnpm --filter @dnd/battle-runtime run test:mbt:insect-plague-area-hazard`                | 4/4 tests passed; exit 0 |
| `pnpm --filter @dnd/battle-runtime run test:mbt:cloudkill-area-hazard`                    | 6/6 tests passed; exit 0 |

The condition-saving result follows the production Sleep lifecycle-route repair
and the ordered-frontier fixture repair. One unseeded transient `invalid`
failure did not reproduce during its diagnostic rerun, so no speculative
semantic or QNT change was made. The turn-boundary result uses an admitted Sleep
cast with Wizard at initiative 20 casting on Fighter at 15, Fighter current
after Wizard's turn ends, and Goblin at 10 next for the boundary cohort; the
assertion names the canonical
`stagedConditionRepeatSave` field. These observed MBT passes do not change the
full `pnpm proof:qnt` record above: its terminal result remains unobserved, the
operator declined a rerun, and it is not recorded as passed.

Final Standards and independent RAW, domain, QNT/runtime, architecture, and
connascence reviews converged at `595a3ac1c` with no implementation findings.
The final repairs make every positive-damage owner, including redirected
damage, request and resolve the Hideous Laughter damage-triggered repeat save.
Durable attack continuations validate the exact pending repeat-save hole and
remain unchanged on invalid input. Canonical occurrence identities distinguish
ordinary, chained, turn-boundary, and resumed damage, and there are zero
production `noRepeatSave` callers. This behavior matches the existing
identity-free QNT semantic core and obligation mapping; no QNT model change was
required. Focused integration evidence at this fixed point includes an exit-0
Battle Runtime typecheck, an eight-file suite with 68 passing tests, and a final
redirect-focused three-file suite with 31 passing tests.

The current public declaration graph is 523 files and 3,969,709 bytes under the
unchanged 10 MiB cap, leaving 6,516,051 bytes of margin. A milestone attempt
validated that measure and passed the long deployed MCP, container, Raw Swarm
consumer, and SIGINT/SIGTERM cases, but stopped on a duplicated old-margin unit
assertion. Commit `e936c8c1a` derives that assertion from the canonical measure
and its focused test passed 1/1. The operator declined another complete
milestone run, so no terminal clean-consumer or quality pass is claimed.

This final-current paragraph does not rewrite the historical issue snapshots
above. It also does not claim a complete QNT proof pass, broad
typecheck/test/build/quality gates, or live GitHub closure. The current evidence,
101-file QNT scope,
Temporary Hit Point keep/replace disposition, A51 Hypnotic Pattern reachability
model, Standards convergence, and remaining Spec blockers are owned by
[`final-parity-report.md`](./final-parity-report.md). Issues #381 and #386 and
the SR-00 Cleanroom ledger disposition remain pending until those named entries
are replaced by exact observations.
