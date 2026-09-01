# Effect 4 declaration-bundle convergence

This focused certificate owns the declaration distribution repair and strict
recertification at implementation source
`fc251944e6ca824e027c710da8c85043451865df`. It is not a terminal Effect 4
receipt and does not claim the workspace quality milestone.

## Reproduced measures

The certified comparison commit `993cb0b11` reproduces exactly 530 files and
4,667,450 bytes. Its sorted POSIX path-ledger SHA-256 is
`fd48241ce438eb0f780a8fc8bfaf0035af6f4d0c686f2590dbe965420794083e`.

Before repair, source `648b3c6b3` emits 557 files and 6,388,773 bytes. Its
path-ledger SHA-256 is
`f4ade799177d4022bf0ffe92d33c990acf46acfa147ce1804078c936994dfc57`.
Relative to the comparison commit, that is 28 additions, one removal, and
1,721,323 added bytes.

The intermediate repaired graph emitted 551 files and 4,776,741 bytes. The
strictly recertified graph emits 570 files and 10,276,508 bytes. It leaves
209,252 bytes below the unchanged 10 MiB byte cap. Its sorted POSIX
path-ledger SHA-256 is
`ffb4af1d4d447085b8a1072fae7332e9ac0a48d402cb2879fdaffaaaa174ecac`.
Its sorted content ledger uses one
`relative-path<TAB>file-sha256<NEWLINE>` entry per declaration and has SHA-256
`dcd52abbdee08a4492e85b5efd54a2f39345703cc46ef26ff8c4d7c55dd1a58a`.
The emitter enforces the exact count, byte measure, path ledger, and content
ledger. Independent shell and Node implementations reproduced all four values
from the hermetic Raw Swarm serializer, currently implementation-pinned to
TypeScript 5.9.3, with exit zero and no diagnostics. That implementation pin is
not a supported external compiler version or compatibility matrix.

The recertification explicitly checks that
`packages/character-creation-runtime/src/phase1-manifest.d.ts` exports both
`PHASE1_WEAPON_FLAIL_UNIT_ID` and `PHASE1_WEAPON_SPEAR_UNIT_ID` for
scenario-character authoring's Phase 1 weapon-manifest declaration path. The
required-owner inventory and all seven forbidden Surface runtime/data owners
remain fail-closed.

The graph includes the canonical 105-byte input declaration
`packages/shared/src/non-empty-array.d.ts`. TypeScript consumes but does not
copy `.d.ts` inputs during declaration emission, so the distribution copies
that exact file byte-for-byte and requires it in the manifest. Compiler path
entries ending in `.js` or `.ts` resolve to the corresponding emitted `.d.ts`
file and configuration generation rejects a missing target.

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

## Integration recertification revision (2026-09-01)

At integration source `86954931f`, the reviewed graph adds the neutral
`packages/battle-runtime/src/stat-block-projection-failure.d.ts` contract. The
recertified graph contains exactly 571 files and 10,276,648 bytes, leaving
209,112 bytes below the unchanged 10 MiB byte cap. Its sorted POSIX path-ledger
SHA-256 is
`4787fdc0e574cd519f4d3c20dcdd08031fa8ac0777acd0935474199866b20ed6`;
its sorted content-ledger SHA-256 is
`a1867ba8307378e888a4ac88a0ac0a61f85843aaabac72b82f2aad2a01b3287f`.

The coarse file safety ceiling is now 1,000 rather than the current exact file
count. This avoids making an architectural owner decision merely to remain at
an incidental count while the production manifest remains fail-closed on the
exact 571-file count, byte measure, path ledger, and content ledger. Boundary
tests separately prove acceptance at each coarse limit and rejection one unit
beyond it.

## Consumer compiler boundary

The consumer configuration no longer exposes unrestricted
`@dnd/shared/*`, `@dnd/shared-algebras/*`, or `@dnd/surface/*` mappings. It
derives exact compiler-resolution entries from the module specifiers in the
reviewed declaration manifest. Those entries support internal declaration
references; agent-facing source remains rooted at the player, scenario setup,
scenario character, and documented package entrypoints. An unreferenced
Surface or shared subpath is not resolvable from the consumer configuration.

TypeScript 5.9.3 is the hermetic Raw Swarm implementation for declaration
serialization, submitted-source checking, and authored-source AST parsing. The
distribution copies that implementation and the supervisor invokes
`tooling/typescript/bin/tsc`; neither operation selects a host or repository
compiler after relocation. This internal pin does not promise an external
consumer compiler version or compatibility matrix. Declaration emission and
every owning, generated, and relocated consumer configuration use
`skipLibCheck: false`. Emission requires compiler exit zero and empty standard
output/error; there is no accepted diagnostic baseline. Generated consumer
configurations are byte-identical across relocated roots, use `baseUrl: "."`,
and contain only POSIX relative declaration paths.

Effect compiler resolution is a separate compiler-support boundary outside the
certified D&D declarations. It copies the authentic declaration-only cohort
resolved from the same validated Effect package directory: Effect
4.0.0-rc.112, fast-check 4.9.0, msgpackr 2.1.0, and pure-rand 8.4.2. The cohort
contains 498 files and 10,598,459 bytes. Its sorted POSIX path-ledger SHA-256 is
`01e202db91ee798780a0dd9af282f2281895d34f70c87f203b189c44cf7db6ef`;
its sorted content-ledger SHA-256 is
`b1df9fbfcd1513fcb19cbcd37c100a008a906f97ea622c9941c60eabe94b4560`.
The projection retains each package's original `package.json` and `LICENSE`
plus every required `.d.ts` and `.d.cts` file byte-for-byte. Exact versions,
dependency relationships, inventory, byte count, and ledgers are enforced. No
JavaScript, maps, source runtime, shim, stub, `any`, or internal invented Effect
surface is copied.

Compiler support is not an authored SDK capability. One shared TypeScript-AST
admission operation runs before typechecking and evaluation for player,
character-authoring, and setup-authoring sources. It permits only a static type
import from that role's exact public SDK module and rejects value or side-effect
imports, exports-from, import-equals, import types, dynamic imports, `require`,
triple-slash references, parse errors, relative imports, and wrong-role module
specifiers. Thus the compiler can resolve authentic transitive Effect types
while authored source cannot import Effect as a runtime or SDK capability; a
runtime `import("effect")` also fails because the projection contains no
JavaScript.
