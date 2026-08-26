# Effect 4 cohort selection

Status: decision for #369, checked 2026-08-25. This note selects the package
cohort for the later D&D cutover in #371; it does not change a D&D manifest.

## Decision

Use the exact `4.0.0-rc.112` release for the core Effect packages:

| Package                 | Selected version | Role in the cutover                                                |
| ----------------------- | ---------------- | ------------------------------------------------------------------ |
| `effect`                | `4.0.0-rc.112`   | Core runtime and `Schema`, `Result`, and platform-independent APIs |
| `@effect/platform-node` | `4.0.0-rc.112`   | Node platform implementation                                       |
| `@effect/vitest`        | `4.0.0-rc.112`   | Effect-aware Vitest integration                                    |

The corresponding official npm artifacts are all published from the Effect
repository tag at source commit
[`2600f62f4532026928454dcea8d1c48557b3f942`](https://github.com/Effect-TS/effect/tree/2600f62f4532026928454dcea8d1c48557b3f942).
The package tarballs and integrity values inspected from the npm registry were:

| Package                        | Tarball integrity                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `effect`                       | `sha512-wXxwuh1Ywnv4cPRM3Wfa0vDwuOHnZ1TsTgHJkG9XgzND6inhBH9n1vBxhg3iIXOia/OrpmvVmd3lrD4vq6bF3A==` |
| `@effect/platform-node`        | `sha512-/BMAcdNGQQskLmI0Zoa95KfTZkr9HV9N4NSxaSrusG6GeW6Ulp9KvZ+Rlaiw8lnOt43CXjFLdfll5/k5rxL4hQ==` |
| `@effect/platform-node-shared` | `sha512-ttjz0xKamFN7vL8pNDYVwddJLjZvqKePc05djlz2VcdaKbLsnYbtMnL1rbOfHgEnIUSHGh7FkjaN4DM1Ov81sQ==` |
| `@effect/vitest`               | `sha512-mEKh/FI64mt8JK1/v9mpOrJYdnp+UFZdRUBMEdZMiKz7klg6NPqVgg/oeAGH6wOOQc2iAPcfc2H9BbAv1KyzMQ==` |

The exact package metadata gives `@effect/platform-node` and its shared
package a Node `>=18.0.0` engine, but `undici@8.10.0`, selected by the rc.112
platform package, requires Node `>=22.19.0`. Therefore the integrated cohort
floor is Node `22.19.0`, not merely the package-declared `>=18` floor. The
repository's Node 22 CI and Quint Connect's Node `>=22` contract must resolve
at or above that patch level. The probe pins TypeScript `5.9.3`, Vitest
`4.1.11`, and `@types/node` `22.19.15`; Effect has no TypeScript peer. The
workspace's existing TypeScript 7 native alias remains outside this cohort
decision.

The platform package declares the required peer range `redis >=5 <7` in the
published package metadata; the probe explicitly installs `redis@6.2.1` so
that this peer is tested without pnpm's automatic peer installation. The
Vitest adapter declares `effect ^4.0.0-rc.112` and `vitest >=4.1.0 <5.0.0`; the
probe explicitly installs `vitest@4.1.11` and exercises the adapter import.

Do not use the moving `latest`, `beta`, or `rc` dist-tags. At the time of this
decision, `rc` resolves to `4.0.0-rc.112` while `latest` still resolves to the
Effect 3 line. Exact manifest entries and a frozen lockfile are required.

## Why rc.112

The official [`MIGRATION.md`](https://github.com/Effect-TS/effect/blob/2600f62f4532026928454dcea8d1c48557b3f942/MIGRATION.md),
[`migration/v3-to-v4.md`](https://github.com/Effect-TS/effect/blob/2600f62f4532026928454dcea8d1c48557b3f942/migration/v3-to-v4.md),
and [`migration/schema.md`](https://github.com/Effect-TS/effect/blob/2600f62f4532026928454dcea8d1c48557b3f942/migration/schema.md)
were read at the exact selected source commit. The current guidance says the
Effect ecosystem uses one shared v4 version, consolidates the former
`@effect/platform`, `@effect/rpc`, and `@effect/cluster` APIs into `effect`,
and keeps platform-specific packages and `@effect/vitest` as separate
packages. It also records unstable surfaces under `effect/unstable/*`.

The rc.112 declarations at that commit are the authority for migration work.
Examples relevant to the later code migration include `effect/Either` becoming
`effect/Result`, and the Schema v4 forms `Schema.Union([...])`,
`Schema.Literals([...])`, and `Schema.decodeUnknownExit`. The local Huly
migration reference at
`../hulymcp/.reference/effect-skills/skills/effect-v3-to-v4/SKILL.md` was also
followed: align every Effect package, search the migration map, inspect the
selected declarations, and do not add a v3 compatibility facade or type casts.

No standalone rc.112 artifacts were published for the currently direct
`@effect/cli`, `@effect/platform`, `@effect/printer`,
`@effect/printer-ansi`, or `@effect/typeclass` package names. This is
consistent with the official consolidation guidance and is an additional
reason not to carry those v3 ranges into the cutover.

The selected upstream `MIGRATION.md` enumerates these unstable import surfaces:
`effect/unstable/ai`, `effect/unstable/cli`, `effect/unstable/cluster`,
`effect/unstable/devtools`, `effect/unstable/eventlog`,
`effect/unstable/http`, `effect/unstable/httpapi`,
`effect/unstable/jsonschema`, `effect/unstable/observability`,
`effect/unstable/persistence`, `effect/unstable/process`,
`effect/unstable/reactivity`, `effect/unstable/rpc`, `effect/unstable/schema`,
`effect/unstable/socket`, `effect/unstable/sql`, `effect/unstable/workflow`,
and `effect/unstable/workers`.
A repository search found no current D&D import under any of those paths. The
current imports that are relevant to the migration are stable core subpaths
`effect/Array`, `effect/Either`, `effect/Option`, `effect/ParseResult`,
`effect/Schema`, and `effect/SchemaAST`, plus the separate
`@effect/platform-node` package. In particular, `effect/Either` is on the v3
to v4 rename path to `effect/Result`; none of the enumerated unstable surfaces
is currently consumed or selected by D&D.

## Current dependency disposition

The current workspace was searched in manifests and source. The disposition
for #371 is:

| Current package                | Current lock presence | Disposition                                   | Evidence / target                                                                       |
| ------------------------------ | --------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| `effect`                       | Direct, `3.21.5`      | Retain and align                              | Directly imported throughout the workspace; exact rc.112                                |
| `@effect/platform-node`        | Direct, `0.106.0`     | Retain and align                              | Used by `packages/mcp` and `scripts/raw-swarm`; exact rc.112                            |
| `@effect/platform-node-shared` | Transitive, `0.59.0`  | Retain as platform-node implementation detail | Resolve exact rc.112 with platform-node                                                 |
| `@effect/vitest`               | Not present           | Add and align                                 | Required for Effect-aware tests; exact rc.112                                           |
| `@effect/platform`             | Direct, `0.96.3`      | Consolidate/remove direct dependency          | No source consumer found; use core v4 exports if needed                                 |
| `@effect/cli`                  | Direct, `0.75.2`      | Consolidate/remove direct dependency          | No source consumer found; use `effect/unstable/cli` only if a later need is established |
| `@effect/printer`              | Direct, `0.49.0`      | Remove unused direct dependency               | No source or configuration consumer found; no standalone rc.112 artifact                |
| `@effect/printer-ansi`         | Direct, `0.49.0`      | Remove unused direct dependency               | No source or configuration consumer found; no standalone rc.112 artifact                |
| `@effect/typeclass`            | Direct, `0.40.0`      | Remove unused direct dependency               | No source or configuration consumer found; no standalone rc.112 artifact                |
| `@effect/cluster`              | Transitive, `0.58.0`  | Remove old transitive package                 | No current source consumer; not a v4 cohort package                                     |
| `@effect/experimental`         | Transitive, `0.60.0`  | Remove old transitive package                 | No current source consumer; not a v4 cohort package                                     |
| `@effect/rpc`                  | Transitive, `0.75.0`  | Consolidate/remove old transitive package     | v4 APIs are in core `effect`; no current source consumer                                |
| `@effect/sql`                  | Transitive, `0.51.0`  | Remove old transitive package                 | No current source consumer; no SQL package is selected                                  |
| `@effect/workflow`             | Transitive, `0.18.0`  | Remove old transitive package                 | No current source consumer; no workflow package is selected                             |

This table covers every `@effect/*` package currently present in the
workspace lockfile, including packages reached only through the old Node
platform graph. No compatibility package or parallel registry is part of this
decision.

## Clean-consumer and parser evidence

[`docs/research/effect4-cohort-probe/`](./effect4-cohort-probe/) is a
disposable consumer fixture. Its manifest installs exact rc.112 packages plus
the published parser line `@firfi/itf-trace-parser@0.2.0-effect4.1`, then
exercises:

- `Effect.succeed` and `NodeRuntime.runMain`;
- `Schema.Struct` and `Schema.decodeUnknownResult`;
- `Result.map`;
- an Effect-aware test imported from `@effect/vitest`;
- the explicit `redis@6.2.1` platform peer and `vitest@4.1.11` adapter peer; and
- the parser's published `effect` entrypoint.

The parser's published metadata is from git commit
[`7af19767872068c1c2fee564806089f9d2e1af9a`](https://github.com/dearlordylord/itf-trace-parser/commit/7af19767872068c1c2fee564806089f9d2e1af9a)
and declares the permissive peer range `effect ^4.0.0-beta.99`. Its packed
Effect implementation uses v4 `Schema.Union([...])`, `Schema.check`,
`Schema.decodeUnknownSync`, and `SchemaGetter`; it does not import the removed
Effect 3 `Either` surface. A strict-peer install of the fixture therefore
resolves that parser against rc.112 without a second Effect runtime. This is
compatibility evidence, not permission to retain the parser's old peer range
in a D&D manifest.

Quint Connect PR [#23](https://github.com/dearlordylord/quint-connect-ts/pull/23)
currently demonstrates the same migration shape on rc.108: exact `effect`
and `@effect/vitest`, Vitest `>=4.1.10`, Node `>=22`, and one Effect lockfile
version. Its published `@firfi/quint-connect@2.0.2-effect4.1` still hard-pins
Effect `4.0.0-beta.99`, so it is not the cutover artifact. #370 must refresh
PR #23's dependency, peer, lockfile, and packed-consumer checks to rc.112 and
then publish the matching Effect 4 line.

## Lockfile invariant

The later cutover must fail closed when any of these conditions is false:

1. Every package manifest reached through `pnpm-workspace.yaml` declares
   `effect`, `@effect/platform-node`, and `@effect/vitest` at the exact
   selected version wherever they occur, including `peerDependencies`; the
   workspace as a whole must declare each selected package.
2. The obsolete direct packages listed above are absent, and no unclassified
   `@effect/*` package is introduced directly.
3. The lockfile contains the exact versions of every direct dependency in the
   canonical clean-consumer manifest, including
   `@firfi/itf-trace-parser@0.2.0-effect4.1`, `redis@6.2.1`,
   `@types/node@22.19.15`, `typescript@5.9.3`, and `vitest@4.1.11`, plus the
   selected Effect ecosystem packages:
   `effect@4.0.0-rc.112`,
   `@effect/platform-node@4.0.0-rc.112`,
   `@effect/platform-node-shared@4.0.0-rc.112`, and
   `@effect/vitest@4.0.0-rc.112`.
4. Installation is performed with `--frozen-lockfile --strict-peer-dependencies`.

The executable check is
[`scripts/check-effect4-cohort.mjs`](../../scripts/check-effect4-cohort.mjs).
It is run by the fixture's `verify-cohort` script and rejects missing or
floating entries in nested workspace manifests and peer sections, obsolete or
unknown direct packages, legacy transitive Effect packages, duplicate or
mismatched Effect or canonical consumer versions, platform package mismatches,
and a missing or mismatched Vitest resolution. Exact consumer versions are
derived from the canonical probe manifest's exact direct entries rather than
duplicated in the verifier. Peer compatibility ranges remain ranges: the
platform peer is `redis >=5 <7`, the Vitest adapter peer is `vitest >=4.1.0
<5.0.0`, and the parser peer is `effect ^4.0.0-beta.99`; the probe selects
exact consumer versions for those peers. The current
pre-cutover v3 workspace intentionally fails this post-cutover gate with an
explicit pre-cutover diagnostic. Workspace discovery and lockfile validation
resolve pnpm through the current Node toolchain's absolute Corepack (or the
absolute `npm_execpath` supplied by the current package-manager process), read
the root `packageManager` declaration, and verify `--version` is exactly
`pnpm@10.29.3` before invoking a child. The child keeps the repository root as
its cwd and targets fixtures with `--dir`, so it never falls back to a bare
PATH/Corepack lookup in a fixture or temporary directory. It uses the pinned
`pnpm@10.29.3` CLI (`pnpm list --recursive --parseable --depth=-1`), so there is
no second glob implementation or custom directory exclusion that could skip
pnpm-included projects. It also rejects enumeration failures, version
mismatches, and paths that escape the project. The structural lock parser recognizes scoped names,
including dots, scans package descriptors across `packages` and `snapshots`,
and performs a fail-closed lexical audit of every Effect-bearing lockfile
scalar: package/snapshot keys and peer-context suffixes, dependency keys and
values, quoted scalars, sequence items such as `transitivePeerDependencies`,
and YAML aliases/anchors. Every scalar first goes through the same YAML
quoting/escape decoder, including JSON-style Unicode escapes and flow
sequences/maps. Known references are checked against the selected exact
versions; only selected bare names in documented dependency/peer contexts are
allowed. Pnpm validates the lockfile syntax before the
fail-closed structural scan, which does not assume a fixed package-key
indentation. `--self-test` proves inline workspace syntax,
`**/packages/*` drift, `packages: ["**"]` dist drift, a dotted scoped lock key,
and a four-space hidden Effect package key accepted by pnpm, a mismatched
peer-context suffix, bare/quoted unknown transitive-peer entries, and a
pnpm-accepted `"\u0040effect/evil"` sequence scalar in both block and flow
forms. It requires
nonempty `importers`, `packages`, and `snapshots` sections and checks
resolved dependency values and Effect peer contexts for the selected version,
including pnpm's peer suffixes. It intentionally does not reject the parser's
published beta99 peer range; the strict peer install is the compatibility test
for that external package. The self-tests also reject missing importer/snapshot
sections, importer `effect@4.0.0-rc.111`, and snapshot `effect@3.21.5`.

## Verification record

From the repository checkout, the clean fixture was installed and checked with:

```sh
pnpm --dir docs/research/effect4-cohort-probe --ignore-workspace install --frozen-lockfile --strict-peer-dependencies
pnpm --dir docs/research/effect4-cohort-probe --ignore-workspace run verify-cohort
pnpm --dir docs/research/effect4-cohort-probe --ignore-workspace run typecheck
pnpm --dir docs/research/effect4-cohort-probe --ignore-workspace run test
pnpm --dir docs/research/effect4-cohort-probe --ignore-workspace run runtime
node scripts/check-effect4-cohort.mjs --self-test
```

The install completed from the committed lockfile with strict peers; the
cohort verifier, TypeScript check, one-test Vitest run, and compiled Node
runtime probe and verifier self-tests all exited successfully. The independent
evidence pass checked the exact npm metadata, source tag, migration documents,
parser tarball, and PR #23 declarations. The independent review pass checked
this note against the fixture lockfile and verifier, ran `git diff --check`,
and searched for floating or obsolete package entries in the new artifacts.
The remediation pass added workspace/peer traversal, nested-manifest drift
self-tests, explicit redis peer installation, complete transitive package
classification, and pnpm-owned workspace discovery with directory-drift
self-tests.

## Primary sources

- [Effect rc.112 source tag](https://github.com/Effect-TS/effect/tree/2600f62f4532026928454dcea8d1c48557b3f942)
- [Effect v3-to-v4 migration](https://github.com/Effect-TS/effect/blob/2600f62f4532026928454dcea8d1c48557b3f942/migration/v3-to-v4.md)
- [Effect Schema migration](https://github.com/Effect-TS/effect/blob/2600f62f4532026928454dcea8d1c48557b3f942/migration/schema.md)
- [`effect@4.0.0-rc.112` npm metadata](https://www.npmjs.com/package/effect/v/4.0.0-rc.112)
- [`@effect/platform-node@4.0.0-rc.112` npm metadata](https://www.npmjs.com/package/@effect/platform-node/v/4.0.0-rc.112)
- [`@effect/vitest@4.0.0-rc.112` npm metadata](https://www.npmjs.com/package/@effect/vitest/v/4.0.0-rc.112)
- [Quint Connect PR #23](https://github.com/dearlordylord/quint-connect-ts/pull/23)
- [`@firfi/itf-trace-parser@0.2.0-effect4.1` npm metadata](https://www.npmjs.com/package/@firfi/itf-trace-parser/v/0.2.0-effect4.1)
