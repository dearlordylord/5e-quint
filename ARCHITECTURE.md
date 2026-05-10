# Architecture

This project formalizes D&D 5e SRD 5.2.1 rules and builds runtime surfaces for
authored content, character creation, battle, and MCP tool composition. Every
modeled rule traces to local SRD text; when formalization requires a choice the
SRD does not prescribe, that choice belongs in `ASSUMPTIONS.md`.

## Content Scope And Licensing

**Content boundary: SRD 5.2.1 only.** The shipped public content path is SRD
5.2.1. Non-SRD official or private licensed content can use the same
architecture later, but it must enter through separately owned content
collections with explicit provenance and distribution policy.

Published non-SRD mechanics fixtures, when present, are synthetic records with
original public identity. They are not official-content records and must not
carry non-SRD source citations, page references, copied prose, canonical names,
lore, examples, artwork references, or presentation. Their purpose is to
exercise reusable engine shapes through structured mechanics facts such as
timing, action economy, resources, dice, numeric values, durations, target
shape, and execution relationships.

If a public record cites an official source, that source must be redistributable
under the license declared on the record. Otherwise the record must use
synthetic identity and mechanics-only structured fields.

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
the existing creature and battle runtime path, broad `battle.qnt`/MBT
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

Authored-content identity is not a production-code dispatch mechanism outside
Surface catalogs, fixture builders, tests, and composition-time user selections.
Runtime packages must not hard-code concrete Unit ids, Spell ids, Stat Block
ids, class-feature names, monster names, or other authored slugs to choose
semantics. SRD content is allowed in this repository for licensing reasons, but
that does not make SRD names a runtime abstraction. The architecture still
requires production code to converse with authored content through Surface
records, support-profile readers, and typed procedure facts.

Tests may name concrete SRD authored records when they are verifying catalog,
reader, support-gate, or end-user workflow behavior. Non-SRD or private licensed
examples must not copy source names, source references, prose, or identity
taxonomy into publishable repository paths; tests should use renamed synthetic
records that are visibly fake and exercise the Surface shape rather than the
protected expression.

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
record shape is legal but not yet admitted, widen the owning reader or
support-profile parser so unsupported shapes fail at one boundary. Add reducer
logic or runtime state only for a reusable SRD procedure family: a new
timing/resource protocol, target/save/damage flow, interrupt window, persistent
effect, movement procedure, or other durable state transition that authored
records can select. Do not restore projected executable vocabulary, encode one
reducer branch per authored name, or let authored ids stand in for support
profiles.

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

## Spatial Modeling Frontier

Spatial modeling is table-owned. Runtimes and MCP may consume explicit spatial
facts submitted by the table/caller/session, and a runtime may store one of
those submitted facts when a reducer procedure needs it for later replay, but no
package computes geometry inference. Do not add a grid engine, pathfinding layer,
persistent map model, coordinate system, line-of-sight engine, cover-geometry
engine, or adjacency/reach cache to Core, promoted runtime packages, or MCP as a
workaround for a rule needing spatial context.

The SRD defines mechanical consequences for spatial relations, but it often does
not prescribe how the table determines those relations. The runtime therefore
models the mechanical consequence and consumes table-supplied spatial facts at
the boundary where the procedure needs them:

- Visibility, line of sight, cover level, and hidden-position prerequisites are
  table-supplied facts carried through caller/session inputs.
- Path, destination, difficult terrain, terrain geometry, and movement route
  facts are table-supplied facts carried through caller/session inputs.
- Reach as an authored creature or weapon statistic is runtime-readable content;
  "within reach now", "within 5 feet now", "adjacent now", and "left reach on
  this movement step" are spatial relations and remain table-supplied
  facts.
- Opportunity Attack provocation classification and threatened-creature sets are
  table-supplied spatial facts; battle owns downstream rule filters
  such as reaction availability, incapacitation, Disengage suppression, and the
  attack/reaction procedure once a threat fact is supplied.
- Help attack proximity is a table-supplied fact; battle owns the
  resulting help link, expiry, and consumption by the later qualifying attack.

If a package stores an explicit spatial fact, the type must name that fact rather
than imply ownership of geometry. For example, a caller-supplied attack range
band, reach-exit fact, clear-path/cover fact, grapple-out-of-range fact, or
affected-target set can support rule legality without giving the runtime a
distance model. Do not derive new geometry from stored spatial facts; if a
reducer needs another spatial relation, ask the table/caller/session for that
relation explicitly and name it at the boundary.

Detailed historical decisions live in
`plans/MOVEMENT_GEOMETRY_OWNERSHIP.md` and
`plans/MCPA3_SPATIAL_ACTION_CONTRACTS.md`. Those documents remain binding unless
this section is intentionally changed with the corresponding package docs and
tests.

## Designing Ownership

Design starts from the rule and its state-transition consequence, not from the
current TypeScript surface. Before adding a field, parser output, reducer branch,
or tool payload, decide which fact is canonical and which package is responsible
for proving it.

Use this workflow:

1. Read the relevant local SRD passage and `UBIQUITOUS_LANGUAGE.md`. If RAW
   leaves a modeling choice open, record or reference the choice in
   `ASSUMPTIONS.md` before encoding behavior.
2. Classify the fact:
   authored content belongs to Surface; character draft/finalization facts
   belong to character creation; durable battle execution facts belong to
   battle runtime; transient table adjudication and spatial relations come from
   the table through caller/session/tool composition.
3. If correctness depends on state transitions, put the semantic rule in the
   owning package's formal model first: package-local Quint for promoted reducer
   packages, broad `battle.qnt`/`creature.qnt` for legacy Core, or a shared
   algebra spec when the behavior is reusable outside one reducer.
4. Mirror the formal boundary in TypeScript with the narrowest runtime type that
   can represent only valid states. Do not keep a weaker TS type and repair it
   downstream with adapters, duplicate registries, or parallel state.
5. Add parity proof at the owning boundary. Core state-machine behavior uses
   Quint trace replay through MBT. Promoted reducer packages use package-local
   QNT tests, focused reducer tests, and integrated MBT only for selected flows
   where trace generation adds cross-step coverage.
6. Thread the stronger fact through callers directly. If MCP or another
   composition layer needs a stronger lower-layer fact, change the lower layer
   and its proof owner; do not compensate with private MCP state.

The shorthand is "formal model first, parity next, TypeScript as the executable
mirror", but the exact proof tool is package-owned. MBT is mandatory for Core
state-machine parity and selected high-risk promoted flows; it is not required
per authored Unit, Spell, weapon, feature, or Stat Block.

## Package Ownership

| Package | Owns | Does not own |
| --- | --- | --- |
| `@dnd/surface` | Provenance-bearing authored Unit and Stat Block records, structural readers, SRD collections, and decode/catalog boundaries. | Runtime state, reducer legality, character draft sessions, battle sessions, or projected executable IR. |
| `@dnd/shared-algebras` | Reusable reducer algebras such as action economy, Initiative, Armor Class, attack rolls, conditions, Death Saving Throw counters, runtime dice, and runtime hole identity. | Unit support gates, act subjects, authored-content catalogs, MCP sessions, or complete character/battle reducers. |
| `@dnd/character-creation-runtime` | Character Draft mutation, creation holes/fills, support gates, finalization, and `CharacterBuild` projection from Surface Unit facts. | Battle initialization, battle state, current HP, in-play resource expenditure, or authored content provenance. |
| `@dnd/battle-runtime` | Battle initialization from caller-built creature inputs, durable battle state, act discovery, replay fills, action resources, damage/HP mutation, supported feature/spell/attack resolution, table-supplied spatial facts consumed or stored by those procedures, and snapshots. | Character draft legality, catalog installation, MCP transient fill storage, post-battle character-session persistence, old Core authority, or geometry inference such as grids, coordinates, LOS, pathfinding, cover calculation, and adjacency caches. |
| `@dnd/mcp` | Tool schemas, session storage, installed Surface catalogs, Character Build to battle-init projection, selected Stat Block identity, transient battle fills, table/caller-provided spatial facts for tool calls, and cross-runtime workflow tests. | Reducer semantics, authored content rules, package-local QNT authority, duplicated executable content, or private geometry state that substitutes for table-supplied spatial facts. |

The composition rule is direct use of owned package APIs, not an adapter layer.
If a future task needs a lower layer to expose a stronger fact, change that
layer and its proof owner. Do not add parallel MCP state or a private MCP
registry to compensate for a missing runtime or Surface shape.

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
- Reducer packages use package-local QNT specs plus deterministic reducer tests.
- Shared algebras use focused unit tests and, where present, package-local QNT or
  MBT coverage.

Quint proof must keep the oracle direction explicit. Do not generate Quint
expected state literals from TypeScript runtime results. Promoted parity is
Quint-owned through hand-authored package-local QNT tests and MBT traces; TS
tests may use RAW-backed expected values, but must not render TS state into
Quint assertions and treat that as proof.

Proof layers for the promoted path are package-owned:

| Boundary | Proof owner | Default proof shape | Escalate when |
| --- | --- | --- | --- |
| Authored Surface records and catalogs | `@dnd/surface` | Decode/reader tests, trace review, provenance/cross-collection constraints, and table-driven catalog contract tests. | A new record family or structural reader changes runtime-visible meaning. |
| Small reusable reducer algebra | `@dnd/shared-algebras` | Focused deterministic tests plus modular Quint MBT replay against the shared TypeScript algebra. | The algebra's state transition semantics change or a new reusable algebra is introduced. |
| Character creation reducer | `@dnd/character-creation-runtime` | Focused reducer tests, package-local QNT, and package-local randomized MBT where present. | Draft mutation, hole/fill semantics, support gates, or final `CharacterBuild` projection changes. |
| Battle reducer deterministic semantics | `@dnd/battle-runtime` | Focused reducer tests plus hand-authored `battle-runtime.qnt` self-tests. | Implemented battle behavior, action resources, HP lifecycle, act discovery, replay, or snapshots change. |
| Selected composed battle-runtime flows | `@dnd/battle-runtime` | Narrow integrated promoted MBT through public `discoverBattleActs`, `resolveBattleSubject`, and `snapshotBattle`. | Trace generation adds value across discovery, replay holes, action resources, damage, and snapshots. |
| MCP runtime composition | `@dnd/mcp` | Deterministic MCP server/protocol tests and end-user acceptance scenarios over real tool calls and in-memory sessions. | Tool schema, session ownership, cross-runtime projection, battle fill storage, handoff, or workflow recovery changes. |

No layer requires MBT per authored Unit, Spell, weapon, feature, or Stat Block.
Ordinary catalog width belongs in Surface reader/contract tests and package
support-gate tests unless it changes a reusable reducer procedure family or a
selected high-risk composition flow.

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
