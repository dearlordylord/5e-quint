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

## Canonical Character Sheet issue-schema revision (2026-09-01)

At integration source `b88a923f6`, Character Sheet replaces three provisional
Wild Shape issue exports with one package-owned `CharacterSheetIssueSchema`.
MCP consumes that canonical schema instead of reconstructing its discriminants
and fixed-message invariant. The declaration path set remains exactly 571
files. The schema contract increases the graph by 621 bytes to 10,277,269
bytes, leaving 208,491 bytes below the unchanged 10 MiB byte cap. The sorted
POSIX path-ledger SHA-256 remains
`4787fdc0e574cd519f4d3c20dcdd08031fa8ac0777acd0935474199866b20ed6`;
the recertified sorted content-ledger SHA-256 is
`526516c516d516386d180db6f003c61616112de1ddc1e31db42dcc0d0e1b1dc7`.

The 1,000-file coarse safety ceiling is unchanged. Production emission still
fails closed on this exact count, byte measure, path ledger, and content
ledger.

## Round-1 Surface and Battle recertification (2026-09-01)

At the Round-1 integration revision after `966b2fe62`, the declaration path set
remains exactly 571 files. The source fixes strengthen authored Stat Block
quantities and references, make the affected Surface generic arguments
explicit, and replace two runtime schema-owner classes with closed tuples. The
recertified graph contains 10,299,610 bytes, leaving 186,150 bytes below the
unchanged 10 MiB byte cap. Its sorted POSIX path-ledger SHA-256 remains
`4787fdc0e574cd519f4d3c20dcdd08031fa8ac0777acd0935474199866b20ed6`;
its sorted content-ledger SHA-256 is
`159c1666a4f2d99b4ee37e54f56034f0722ad6b9432875e3647cd3d8a61d1927`.

Independent TypeScript 5.9.3 emissions of clean `966b2fe62` and the Round-1
source produced no path additions or removals. Seven declarations changed:

- `packages/battle-runtime/src/battle-reducer/battle-codecs.d.ts` (-960 bytes)
- `packages/character-sheet-runtime/src/spell-profile-shape.d.ts` (+16 bytes)
- `packages/surface/src/surface/schema-base.d.ts` (+104 bytes)
- `packages/surface/src/surface/schema-nonspell.d.ts` (+16 bytes)
- `packages/surface/src/surface/schema-spell.d.ts` (+22,651 bytes)
- `packages/surface/src/surface/stat-block-types.d.ts` (+472 bytes)
- `packages/surface/src/surface/surface-vocabulary.d.ts` (+42 bytes)

The net increase is 22,341 bytes. The large `schema-spell.d.ts` delta is the
TypeScript serializer's repeated structural projection of the new
`PositiveInteger`, `Integer`, and branded-reference schemas, not a new owner or
runtime/data dependency. The Battle declaration becomes smaller because the
closed tuple emits its member codecs directly instead of emitting two owner
classes. The 1,000-file coarse safety ceiling remains unchanged; production
emission fails closed on the new exact measure and content ledger.

## Round-1 standards recertification (2026-09-01)

The Round-1 standards candidate retains exactly 571
declaration paths and the unchanged sorted POSIX path-ledger SHA-256
`4787fdc0e574cd519f4d3c20dcdd08031fa8ac0777acd0935474199866b20ed6`. The
production emitter measured 10,300,717 bytes, leaving 185,043 bytes below the
unchanged 10 MiB byte cap. Its sorted content-ledger SHA-256 is
`b2e1e35ccda77cd149c468428bcc017196ad6e37a1d2b9d876c2205da24e69d3`.

Compared with the reviewed 571-file graph at 10,299,610 bytes and content
ledger `159c1666a4f2d99b4ee37e54f56034f0722ad6b9432875e3647cd3d8a61d1927`,
exactly two declarations changed and no paths were added or removed:

- `packages/surface/src/surface/schema-spell.d.ts` (+1,080 bytes,
  4,425,218 → 4,426,298)
- `packages/surface/src/surface/stat-block-types.d.ts` (+27 bytes,
  24,762 → 24,789)

The 1,107-byte net increase is the declaration serializer's repeated
projection of the three `PositiveInteger` duration fields (`amount`,
`upcastTiers.atSlot`, and `upcastTiers.amount`) through the affected Surface
spell schema. The authored-source formatter's `Match` import has no emitted
public declaration. The 1,000-file coarse safety ceiling remains unchanged;
production emission continues to fail closed on the exact reviewed measure,
path ledger, and content ledger.

## Final current-tip recertification (2026-09-01)

At immutable implementation source `d83d7e19b`, the admitted declaration graph
retains exactly 571 paths and the unchanged sorted POSIX path-ledger SHA-256
`4787fdc0e574cd519f4d3c20dcdd08031fa8ac0777acd0935474199866b20ed6`.
The TypeScript 5.9.3 production emitter measured 10,298,129 bytes, leaving
187,631 bytes below the unchanged 10 MiB byte cap. Its sorted content-ledger
SHA-256 is
`c7cc1ebeaeafaceaa53c820228fb456f2a1b0fefd68390a34ec12bd16dea7f29`.

Compared with clean `cf55434c1`, no admitted path was added or removed and 42
declarations changed. The package-group byte deltas are:

- `packages/battle-runtime`: 15 declarations, -3,998 bytes
- `packages/character-battle-runtime`: 3 declarations, -72 bytes
- `packages/character-creation-runtime`: 2 declarations, -2,956 bytes
- `packages/character-sheet-runtime`: 15 declarations, -1,997 bytes
- `packages/surface`: 2 declarations, +6,615 bytes
- `scripts/raw-swarm`: 5 declarations, -180 bytes

The 2,588-byte net reduction combines the explicit consumer-protocol import
paths and narrower package indexes with the expanded decoded Stat Block domain
types. The two Surface declarations account for the positive delta:
`schema-spell.d.ts` grows 6,074 bytes and `stat-block-types.d.ts` grows 541
bytes. The Battle, Character Creation, Character Sheet, Character Battle, and
Raw Swarm changes are the corresponding consumer-protocol and issue-shape
projections.

The compiler initially emits five closed forbidden owners because the root
Character Sheet package retains its canonical optional Stat Block catalog
default. The admitted declaration graph does not reach any of them after value
imports are elided. The pinned TypeScript dependency walk proves that fact,
fails on any unresolved internal edge or reachable forbidden owner, and removes
only those five already-forbidden files before manifest measurement:

- `packages/surface/src/surface/generated/srd-stat-block-aggregate.d.ts`
- `packages/surface/src/surface/stat-block-catalog-core.d.ts`
- `packages/surface/src/surface/stat-block-catalog-data.d.ts`
- `packages/surface/src/surface/stat-block-catalog.d.ts`
- `packages/surface/src/surface/stat-block-identity.d.ts`

The 1,000-file coarse safety ceiling remains unchanged. Production emission
continues to fail closed on the required roots, exact admitted measure, path
ledger, content ledger, and forbidden-owner reachability.

A fresh production rerun after the concurrent Surface publication
certificate, verifier, and portable-case updates and the clean-checkout root
workspace-dependency adaptation reproduced the same 571 files, 10,298,129
bytes, and both ledgers exactly. Those downstream evidence and package-resolution
changes therefore do not alter the admitted declaration graph.

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
character-authoring, and setup-authoring sources. It permits a static type
import from that role's exact public SDK module and rejects the enumerated
module-edge syntax: value or side-effect imports, exports-from, import-equals,
import types, dynamic imports, identifier `require` calls, triple-slash
references, parse errors, relative imports, and wrong-role module specifiers.
The declaration projection contains no JavaScript, so a direct runtime
`import("effect")` cannot resolve from that projection. This AST check is a
syntax admission boundary, not a capability boundary. Authored TypeScript is
trusted, cooperative code evaluated with the ambient authority of the Node.js
process. Public-SDK-only behavior is an authoring and evidence convention, not
an isolation or security guarantee; retained evidence cannot prove the absence
of indirect ambient access.
