# Architecture

This project formalizes D&D 5e SRD 5.2.1 rules and builds runtime surfaces for
authored content, character creation, battle, and MCP tool composition. Every
modeled rule traces to local SRD text; when formalization requires a choice the
SRD does not prescribe, that choice belongs in `ASSUMPTIONS.md`.

## Content Scope And Licensing

**Content boundary: SRD 5.2.1 only.** The shipped public content path is SRD
5.2.1. PHB-only or private licensed content can use the same architecture later,
but it must enter through separately owned content collections with explicit
provenance and distribution policy.

Licenses:

- Project code: [Apache License 2.0](LICENSE)
- SRD 5.2.1 content: [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/), (c) Wizards of the Coast LLC
- SRD markdown source: [DND.SRD.Wiki](https://github.com/OldManUmby/DND.SRD.Wiki) by OldManUmby, CC-BY-4.0
- Full attribution: [NOTICE](NOTICE)

## Package Map

```text
Local SRD corpus + ASSUMPTIONS.md + UBIQUITOUS_LANGUAGE.md
        |
        v
@dnd/surface
  - authored Surface records with provenance
  - UnitRecord collections
  - StatBlockRecord collections
  - Dhall -> JSON -> trace authoring flow
        |
        | typed authored records/readers
        v
+-------------------------------+      +--------------------------+
| @dnd/character-creation-runtime |      | @dnd/battle-runtime      |
| - drafts, holes, fills          |      | - battle state           |
| - final CharacterBuild          |      | - battle subjects        |
| - package-local QNT slice       |      | - holes/fills/replay     |
+-------------------------------+      | - package-local QNT spec |
        |                              +--------------------------+
        | CharacterBuild + selected Unit refs       ^
        +-------------------------------------------+
                         MCP composition
                         (@dnd/mcp)
```

The repository also contains a legacy/broad Core lane in `@dnd/core`. Core owns
the existing XState-based creature and battle engines, broad `battle.qnt`/MBT
coverage, and Core-specific feature helpers. Core details live in
`packages/core/ARCHITECTURE.md`.

## Authored Content

`@dnd/surface` owns authored content records and provenance. Surface records are
not reducer state, runtime state, or projected executable IR.

Surface has separate authored record families:

- `UnitRecord` for selectable/ownable content such as classes, backgrounds,
  species records, features, feats, spells, weapons, armor, shields, masteries,
  and similar records.
- `StatBlockRecord` for monster/NPC records in the SRD sense. Despite the name,
  a Stat Block is not only numeric stats: it is the authored rules record for a
  monster, including traits, actions, resources, senses, languages, and other
  entries the SRD places in a monster stat block.

Detailed Surface authoring, catalog, Dhall/JSON, and trace rules live in
`packages/surface/README.md`.

## Runtime Boundaries

Runtime packages consume authored Surface records through typed boundaries and
derive their own execution state. They must not introduce a second executable
content language between Surface and runtime.

`@dnd/character-creation-runtime` owns character-creation reducer state:
drafts, holes, batch fills, finalization, and the finalized `CharacterBuild`.
Character-creation terms live in
`packages/character-creation-runtime/VOCABULARY.md`.

`@dnd/battle-runtime` owns the battle reducer state:
`BattleState`, `BattleCreatureState`, battle subjects, replay-from-root holes
and fills, snapshots, and the package-local battle QNT spec. It consumes
battle-owned creature initialization inputs; it does not import character
creation runtime state.
Battle runtime details live in `packages/battle-runtime/README.md`.
Its reducer data-flow map lives in
`packages/battle-runtime/ARCHITECTURE_GRAPH.md`.

Battle reducer extensibility follows the SRD procedure-family boundary. A new
authored Unit, Spell Record, feature, monster action, or Stat Block slug is
data-only when it fits an existing support profile and procedure. If the Surface
record shape is legal but not yet admitted, widen the owning reader or support
gate so unsupported shapes fail at one boundary. Add reducer logic or runtime
state only for a reusable SRD procedure family: a new timing/resource protocol,
target/save/damage flow, interrupt window, persistent effect, movement
procedure, or other durable state transition that authored records can select.
Do not restore projected executable vocabulary or encode one reducer branch per
authored name.

The shared domain abstraction is **Creature**. In `@dnd/battle-runtime`, the
durable implementation type is `BattleCreatureState`, identified by
`CombatantId`. `BattleCreatureInit` is a one-time initialization input and is
not the creature.

Units can supply combat capabilities for character-derived creatures: MCP
composition reads selected Unit refs, resolves the needed armor, weapon,
feature, resource, or effect facts, and passes battle-owned initialization data
to the battle runtime. Battle state may retain origin data such as selected Unit
refs or resolved Surface records when later act discovery or replay needs those
facts. Origin data is not provenance: provenance belongs to authored Surface
records. Units are capability records, not participant identity. A
Stat Block-derived battle creature comes from the Stat Block record and does not
own Units merely because Stat Blocks may reuse shared Surface sub-shapes.

## MCP Composition

`@dnd/mcp` is the tool-facing composition package.

The promoted MCP runtime path composes:

- `srdUnitCollection` through `buildUnitCatalog`;
- `srdStatBlockCollection` through `buildStatBlockCatalog`;
- character drafts and finalized Character Builds;
- selected Stat Block identity;
- durable `BattleState`;
- transient battle fills kept outside `BattleState`.

The Core-backed MCP path still exists separately and uses Core-specific
`DndContext`, available-actions, and action-token machinery. Treat that as the
legacy/Core lane unless the package ownership model is intentionally changed.
MCP package details live in `packages/mcp/README.md`.

## Quint And Parity

Quint specs are correctness references for runtime behavior. For promoted
Unit/StatBlock-backed battle behavior, `@dnd/battle-runtime` is the active
semantic authority and `packages/battle-runtime/battle-runtime.qnt` is its
canonical package-local spec:

- Root `battle.qnt` remains legacy/Core broad proof and restore source material.
  It is not the active authority for new promoted runtime behavior.
- `packages/battle-runtime/battle-runtime.qnt` is the canonical package-local
  spec for the implemented `@dnd/battle-runtime` subset.
- `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
  constrains character-creation reducer behavior.

Docs and tests must name this package-local battle spec when checking promoted
battle behavior. Old Core battle MBT may still be used as legacy proof material
for future restoration work, but not as a promoted-runtime gate.

Runtime correctness mechanisms depend on the package shape:

- Core state-machine lanes use MBT trace replay against broad Quint specs.
- Reducer packages use package-local QNT specs plus deterministic parity tests.
- Shared algebras use focused unit tests and, where present, package-local QNT or
  MBT coverage.

## Dependency Direction

The promoted runtime path uses this dependency direction:

```text
@dnd/shared
@dnd/shared-algebras
@dnd/surface
        |
        v
@dnd/character-creation-runtime   @dnd/battle-runtime
        \                         /
         \                       /
          v                     v
                 @dnd/mcp
```

`@dnd/character-creation-runtime`, `@dnd/battle-runtime`, and the promoted
MCP runtime path must not depend on `@dnd/core`. Core-specific feature
helpers and projected vocabulary belong to the Core lane until they are deleted,
rewritten, or explicitly ledgered for restoration.

## Reference Authority

| Document                                            | Scope                                                 | Authority                                  |
| --------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------ |
| `.references/srd-5.2.1/`                            | Rules text                                            | Ground truth for modeled SRD rules         |
| `UBIQUITOUS_LANGUAGE.md`                            | Canonical D&D domain terminology                      | Naming authority for domain terms          |
| `ASSUMPTIONS.md`                                    | Explicit modeling choices where SRD is underspecified | Sole record of intentional RAW assumptions |
| `packages/character-creation-runtime/VOCABULARY.md` | Character-creation runtime terms                      | Character-creation package vocabulary      |
| `packages/core/ARCHITECTURE.md`                     | Core-specific runtime and Quint/TS guidance           | Core lane architecture                     |
| Package READMEs                                     | Package-owned APIs and local invariants               | Local package contracts                    |

## Choosing The Right Owner

| Question                                        | Owner                                           |
| ----------------------------------------------- | ----------------------------------------------- |
| What does the SRD say?                          | `.references/srd-5.2.1/`                        |
| What term should code use?                      | `UBIQUITOUS_LANGUAGE.md` or package vocabulary  |
| What authored content exists?                   | `@dnd/surface`                                  |
| Is a Unit or Stat Block decoded correctly?      | Surface tests and trace review                  |
| Is character creation state valid?              | `@dnd/character-creation-runtime`               |
| Is battle reducer behavior correct?             | `@dnd/battle-runtime` plus its QNT/parity tests |
| Does broad legacy Core combat match battle.qnt? | `@dnd/core` MBT                                 |
| How are runtimes exposed to tools?              | `@dnd/mcp` composition                          |

## Core Quint/TS Frontier

Core-specific guidance for deciding what belongs in Core Quint versus Core
TypeScript lives in `packages/core/ARCHITECTURE.md`. The top-level rule is
package-owned: promote mechanics into the relevant package's formal model when
state-transition correctness depends on them; keep pure content and projection
details in the owning package.
