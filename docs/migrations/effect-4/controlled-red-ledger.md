# Effect 4 controlled-red ledger

Date: 2026-08-26
Issue: [#371](https://github.com/dearlordylord/5e-quint/issues/371)
Cutover starting point: `fba977c5ed3abf554631ce43c006b5a0ad4c5557`
Environment: Node `v24.18.0`, pnpm `10.29.3`, Linux

Status: the dependency cutover is complete and the cohort gate is green. The
repository is intentionally controlled-red until the downstream Effect 4 API
migration closes the diagnostics below. This ledger records the first
post-cutover evidence; it is not a waiver and does not claim product or rule
behavior is green.

## Scope and ownership

This issue owns the workspace dependency cutover, lockfile regeneration, the
cohort verifier and root quality gate, the selected Node/tool policy, and this
ledger. The source and test API migration is downstream work owned by #372 and
later issues. No D&D rule behavior, Quint model behavior, authored identity, or
Effect 3 behavioral-oracle output was changed here.

The baseline oracle remains the authority for migration parity:
[`baseline-certification.md`](./baseline-certification.md) and
[`effect3-behavioral-oracle.json`](./effect3-behavioral-oracle.json).

The remaining `effect/Either` imports and v3-shaped schemas are intentionally
not changed by this cutover. They are the downstream source/test migration
owned by #372 and later issues; this ledger makes their red state explicit so
the dependency gate can be activated without a compatibility facade, cast, or
waiver.

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
| `pnpm regenerate:effect4-controlled-red`                                                                                                              | pass   | Regenerated [`controlled-red-inventory.json`](./controlled-red-inventory.json): 40,105 raw and 16,933 source-keyed deduplicated diagnostics; output SHA-256 `b8b4cb2bc9a138c710ab9bc7fd033fa596ff59d82bb42dba14ceec7befa69497`.                                                                |
| Installed declaration probe                                                                                                                           | pass   | `effect`, `effect/Result`, `effect/Schema`, `@effect/vitest`, and `@effect/platform-node` loaded from the installed tree; `effect/Either` was absent as required by the v4 declaration surface; `Schema.decodeUnknownResult` was present; D&D resolved `@firfi/quint-connect@2.0.2-effect4.2`. |
| `node --check scripts/check-effect4-cohort.mjs`                                                                                                       | pass   | Verifier parses as valid Node module.                                                                                                                                                                                                                                                          |
| `node --check scripts/regenerate-effect4-controlled-red.mjs`                                                                                          | pass   | Inventory generator parses as valid Node module.                                                                                                                                                                                                                                               |
| `pnpm exec eslint scripts/check-effect4-cohort.mjs scripts/regenerate-effect4-controlled-red.mjs --max-warnings=0 --report-unused-disable-directives` | pass   | No diagnostics.                                                                                                                                                                                                                                                                                |
| Focused Prettier check over changed JSON/YAML/MJS/Markdown/workspace manifests                                                                        | pass   | All selected files use Prettier code style.                                                                                                                                                                                                                                                    |

## Public gate classification

The public commands were run directly. Each public workspace command acquired
and released the repository broad lock through its own documented wrapper.

| Command          | Result       | Controlled-red classification                                                                                                                                                                                                                                    |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`     | fail, exit 1 | `@dnd/app` transformed 662 modules, then Rollup could not resolve `effect/Either` imported by `packages/battle-runtime/src/stat-block-execution.ts`. This is the module-entrypoint family.                                                                       |
| `pnpm typecheck` | fail, exit 1 | Turbo stopped at `@dnd/shared`. The first public owner emitted 84 diagnostics: TS18046 2, TS2305 3, TS2307 1, TS2339 10, TS2345 20, TS2551 41, TS2554 5, and TS7006 2. This is expected v3-to-v4 API and inference fallout, not a dependency-resolution failure. |
| `pnpm test`      | fail, exit 1 | `@dnd/tactical-space` passed 1 file/53 tests. `@dnd/shared` then stopped the lane with two failed suites and zero collected tests: `Schema.int is not a function` and missing `effect/Either`.                                                                   |

The build and test failures are intentionally recorded at their first public
stop point. The owner sweep below was run separately under the repository broad
lock to inventory the remaining diagnostics without changing source behavior.

## Exhaustive typecheck inventory

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

The four prototype/tactical owners passed. The nine Effect-consuming owners
failed. The raw counts below are the committed output's per-command counts;
workspace-linked source is repeated when a dependent package typechecks it.
The deduplicated count is the durable closure baseline from the same output.

| Package command owner             | Raw diagnostics |
| --------------------------------- | --------------: |
| `@dnd/app`                        |           6,447 |
| `@dnd/battle-runtime`             |          10,721 |
| `@dnd/character-battle-runtime`   |           7,375 |
| `@dnd/character-creation-runtime` |           1,980 |
| `@dnd/character-sheet-runtime`    |           3,125 |
| `@dnd/mcp`                        |           7,450 |
| `@dnd/shared`                     |              84 |
| `@dnd/shared-algebras`            |             919 |
| `@dnd/surface`                    |           2,004 |
| Four prototype/tactical owners    |               0 |
| **Raw total**                     |      **40,105** |

The raw total contains repeated linked-source diagnostics. After deduplication
there are **16,933** diagnostics. The retained
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
| Removed/renamed module entrypoints | TS2305, TS2307                                                                         |        953 |          434 |
| Removed/renamed Effect API members | TS2551, TS2694, TS2724                                                                 |      3,312 |          936 |
| Changed schema/type signatures     | TS2314, TS2344, TS2394, TS2554, TS2556, TS2558, TS2560, TS2740, TS2741, TS2749, TS2769 |      5,786 |        1,221 |
| Downstream type/inference cascade  | All remaining codes below                                                              |     30,054 |       14,342 |
| **Total**                          | **All diagnostics**                                                                    | **40,105** |   **16,933** |

The nine workspace owners affected by the family inventory are
`@dnd/app`, `@dnd/battle-runtime`, `@dnd/character-battle-runtime`,
`@dnd/character-creation-runtime`, `@dnd/character-sheet-runtime`,
`@dnd/mcp`, `@dnd/shared`, `@dnd/shared-algebras`, and `@dnd/surface`.

### TypeScript code counts

This is the complete code-level inventory from the owner sweep. Raw counts
include dependent-source repetition; deduplicated counts are the closure
baseline.

| Code    |   Raw | Deduplicated |
| ------- | ----: | -----------: |
| TS1360  |    57 |           15 |
| TS18046 | 6,796 |        4,291 |
| TS18047 |   408 |          137 |
| TS18048 |    47 |           25 |
| TS2305  |   752 |          343 |
| TS2307  |   201 |           91 |
| TS2314  |   327 |           55 |
| TS2322  | 5,719 |        3,324 |
| TS2339  | 9,352 |        3,173 |
| TS2344  |    31 |            8 |
| TS2345  | 2,774 |        1,243 |
| TS2352  |     4 |            4 |
| TS2353  |   358 |          107 |
| TS2366  |     1 |            1 |
| TS2367  |   140 |           55 |
| TS2375  |    17 |            8 |
| TS2379  |    11 |            5 |
| TS2394  |     1 |            1 |
| TS2488  |     6 |            3 |
| TS2536  |    24 |            3 |
| TS2551  | 3,215 |          903 |
| TS2554  | 3,898 |          723 |
| TS2556  |    72 |           19 |
| TS2558  |    24 |            3 |
| TS2560  |    49 |           14 |
| TS2571  |   371 |          362 |
| TS2638  |     8 |            8 |
| TS2677  |     8 |            2 |
| TS2678  |     1 |            1 |
| TS2694  |    72 |           27 |
| TS2698  |   360 |          291 |
| TS2700  |     2 |            2 |
| TS2724  |    25 |            6 |
| TS2739  |    30 |           21 |
| TS2740  | 1,222 |          263 |
| TS2741  |    39 |           20 |
| TS2749  |     7 |            5 |
| TS2769  |   116 |          110 |
| TS7006  | 3,139 |        1,131 |
| TS7031  |   150 |           56 |
| TS7053  |   271 |           74 |

## Focused reproductions and owners

These commands reproduce the first representative diagnostic in each family.
They intentionally remain red until the owning downstream migration lands.

| Family                         | Focused reproduction                                                                                                                                                                                                | Current owner and closure work                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Removed module entrypoints     | `pnpm --filter @dnd/shared typecheck`; `pnpm --filter @dnd/app run build`                                                                                                                                           | #372+ must replace `effect/Either` and other removed entrypoints with the installed v4 declarations, then re-run dependent owners. |
| Removed/renamed API members    | `pnpm --filter @dnd/shared typecheck`; `rg -n -e 'Schema\.int' -e 'Schema\.greaterThanOrEqualTo' -e 'Schema\.optionalWith' -e 'Schema\.decodeUnknownEither' -e 'Brand\.refined' -e 'Brand\.error' packages scripts` | #372+ owns the v4 Schema/Brand/Result API migration with no compatibility facade or casts.                                         |
| Changed schema/type signatures | `pnpm --filter @dnd/shared typecheck`; `pnpm --filter @dnd/surface typecheck`                                                                                                                                       | The owning package must adopt exact installed v4 signatures and preserve the #368 oracle.                                          |
| Inference/control-flow cascade | `pnpm --filter @dnd/battle-runtime typecheck`; `pnpm --filter @dnd/character-sheet-runtime typecheck`                                                                                                               | #372+ must resolve v4 narrowing and downstream types at their canonical source owners; do not suppress diagnostics.                |
| Test collection/runtime        | `pnpm --filter @dnd/shared test`                                                                                                                                                                                    | #372+ must migrate test imports and schemas; then restore collection and behavior parity.                                          |

The retained baseline oracle is separately reproducible with
`pnpm verify:effect3-baseline`; its one typecheck diagnostic is included in the
inventory because it is imported by the MCP compilation graph, not silently
waived.

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

A final independent read-only standards/spec/domain/architecture and
connascence review of the completed staged diff found no remaining issues. It
confirmed the broad-lock and exact-pnpm guards, deterministic serial inventory,
complete multiline diagnostic keys, committed totals, workspace-scoped
consumer enforcement, missing-consumer coverage, and absence of TypeScript,
Quint, or model-source changes. The reviewer loop therefore converged after the
scope correction.

## Closure conditions

Close this controlled-red interval only when all of the following are true:

1. `pnpm check:effect4-cohort:self-test` and `pnpm check:effect4-cohort` pass
   with the exact values in this ledger, and the lockfile still contains one
   `effect` version (`4.0.0-rc.112`) with no removed or unsupported Effect
   packages.
2. The nine affected workspace owners and `scripts/effect3-baseline.ts` have
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
