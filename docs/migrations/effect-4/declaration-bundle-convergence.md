# Effect 4 declaration-bundle convergence

This focused certificate owns the declaration distribution repair at source
`648b3c6b3`. It is not a terminal Effect 4 receipt and does not claim the
workspace quality milestone.

## Reproduced measures

The certified comparison commit `993cb0b11` reproduces exactly 530 files and
4,667,450 bytes. Its sorted POSIX path-ledger SHA-256 is
`fd48241ce438eb0f780a8fc8bfaf0035af6f4d0c686f2590dbe965420794083e`.

Before repair, source `648b3c6b3` emits 557 files and 6,388,773 bytes. Its
path-ledger SHA-256 is
`f4ade799177d4022bf0ffe92d33c990acf46acfa147ce1804078c936994dfc57`.
Relative to the comparison commit, that is 28 additions, one removal, and
1,721,323 added bytes.

The repaired graph emits 551 files and 4,776,741 bytes. It leaves 5,709,019
bytes below the unchanged 10 MiB byte cap. Its sorted path-ledger SHA-256 is
`dc3ea33493cb0ae40c85e6fb3c61b82e6b69cdb41f2dfd828e6961c687c76912`.
Its sorted content ledger uses one
`relative-path<TAB>file-sha256<NEWLINE>` entry per declaration and has SHA-256
`aed1b2c5d979e1ed3f3766e7de0fe1d1c840410bca32a0aa5f111e6f92dad971`.
The emitter enforces the exact count, byte measure, path ledger, and content
ledger.

## Removed transitive leak

The Character Definition and equipment projection owners imported their issue
type from `catalog-install`. That declaration imported the portable decoder and
the Stat Block runtime/data catalog, restoring the generated Stat Block corpus
that the earlier lightweight catalog contract had removed. The canonical
mechanics-admission protocol now has a lightweight owner, excluding these seven
unintended declarations:

- `packages/surface/src/surface/catalog-install.d.ts`
- `packages/surface/src/surface/generated/srd-stat-block-aggregate.d.ts`
- `packages/surface/src/surface/portable-surface.d.ts`
- `packages/surface/src/surface/stat-block-catalog-core.d.ts`
- `packages/surface/src/surface/stat-block-catalog-data.d.ts`
- `packages/surface/src/surface/stat-block-catalog.d.ts`
- `packages/surface/src/surface/stat-block-identity.d.ts`

The repair adds one declaration at
`packages/surface/src/surface/mechanics-admission.d.ts`. It therefore removes
six files and 1,612,032 bytes from the observed integration graph.

## Reviewed owner delta

Relative to `993cb0b11`, the repaired graph adds these 22 required owner
declarations:

- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/usage-limit-admission.d.ts`
- `packages/battle-runtime/src/procedure-admission/atomic-class-feature.d.ts`
- `packages/battle-runtime/src/procedure-admission/atomic-species-trait-procedure.d.ts`
- `packages/battle-runtime/src/procedure-admission/druid-wild-shape.d.ts`
- `packages/battle-runtime/src/procedure-admission/failed-saving-throw-reroll.d.ts`
- `packages/battle-runtime/src/procedure-admission/monk-focus.d.ts`
- `packages/battle-runtime/src/procedure-admission/resource-feature-admission.d.ts`
- `packages/battle-runtime/src/procedure-admission/weapon-mastery.d.ts`
- `packages/battle-runtime/src/readonly-non-empty-array.d.ts`
- `packages/battle-runtime/src/same-string-set.d.ts`
- `packages/battle-runtime/src/unit-procedure-kind.d.ts`
- `packages/character-creation-runtime/src/character-definition-projection.d.ts`
- `packages/character-creation-runtime/src/character-feature-projection.d.ts`
- `packages/character-sheet-runtime/src/character-feature-projection.d.ts`
- `packages/character-sheet-runtime/src/character-spell-projection.d.ts`
- `packages/character-sheet-runtime/src/equipment-definition-projection.d.ts`
- `packages/character-sheet-runtime/src/spell-profile-shape.d.ts`
- `packages/surface/src/surface/mechanics-admission.d.ts`
- `packages/surface/src/surface/mechanics-graph-path.d.ts`
- `packages/surface/src/surface/stat-block-proficiency-bonus.d.ts`
- `packages/surface/src/surface/surface-relations-internal.d.ts`
- `packages/surface/src/surface/surface-relations.d.ts`

The graph removes the superseded
`packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/once-per-turn-limit-group-admission.d.ts`.
The Battle modules and their helper contracts are reachable through explicit
resource-feature exports. The Character Creation and Character Sheet
projections are explicit package exports. Their public signatures require the
mechanics-path and Surface relation declarations. The resulting net growth is
21 files and 109,291 bytes; no generated declaration, stale artifact, or
runtime catalog remains in the reviewed delta.

## Consumer compiler boundary

The consumer configuration no longer exposes unrestricted
`@dnd/shared/*`, `@dnd/shared-algebras/*`, or `@dnd/surface/*` mappings. It
derives exact compiler-resolution entries from the module specifiers in the
reviewed declaration manifest. Those entries support internal declaration
references; agent-facing source remains rooted at the player, scenario setup,
scenario character, and documented package entrypoints. An unreferenced
Surface or shared subpath is not resolvable from the consumer configuration.

The distribution copies the pinned TypeScript toolchain and the supervisor
invokes `tooling/typescript/bin/tsc`; it does not invoke a host or repository
compiler after relocation. The consumer configuration retains
`skipLibCheck: true` deliberately. A copied-toolchain probe with it disabled
reports 217 declaration diagnostics: most are unresolved external `effect`
declaration references, and the reviewed TS7056 emission baseline also omits
owners whose inferred schemas TypeScript cannot serialize. This distribution
checks submitted leaf source against the emitted SDK declarations; it is not a
second declaration-certification pass. Declaration completeness and drift are
instead governed before relocation by the pinned serialization-diagnostic
multiset, required and forbidden owners, and the exact path/content manifest.
