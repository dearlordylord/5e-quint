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
+----------------------------------+    +--------------------------+
| @dnd/character-creation-runtime  |    | @dnd/battle-runtime      |
| - drafts, holes, fills           |    | - battle state           |
| - final CharacterBuild           |    | - battle subjects        |
| - package-local QNT slice        |    | - holes/fills/replay     |
+----------------------------------+    | - package-local QNT spec |
        |                               +--------------------------+
        v                                          ^
+----------------------------------+               |
| @dnd/character-sheet-runtime     |               |
| - sheet session, advancement     |               |
+----------------------------------+               |
        |                                          |
        v                                          |
+----------------------------------+               |
| @dnd/character-battle-runtime    |  --- character battle init projection
| - character -> battle-init       | /
+----------------------------------+

@dnd/shared and @dnd/shared-algebras (incl. rule-core slices) sit below all
runtime packages.

@dnd/mcp composes the runtimes for tool-facing workflows.
@dnd/app is the React entrypoint over the runtimes.
```

## QNT Verification Shape

The QNT corpus is a forest of small composite slices that import shared atomic
rule modules. There is no whole-battle QNT — `creature × turn × effect × hole
× fill` explodes the MBT state space. `docs/adr/0001-forest-of-qnt-slices.md`
records the decision and rationale.

Three layers:

- **Reusable rule-core slices** in `packages/shared-algebras/proofs/rule-core/`.
  Stateless contracts and small stateful procedure machines for spell
  invocation, slot expenditure, damage projection, save gates, hit-point
  lifecycle, reactions/concentration, movement, stat-block controls, and
  unit-feature procedures. These are the composable semantic pieces.
- **Package-local QNT** per promoted runtime — focused battle-runtime slices
  plus per-domain bridge modules (`battle-runtime-movement-bridge.qnt`,
  `*-concentration-bridge.qnt`, `*-interrupt-bridge.qnt`,
  `*-stat-block-bridge.qnt`, `*-feature-bridge.qnt`, `*-spell-bridge.qnt`).
  Bridges connect package state to rule-core facts.
  `packages/battle-runtime/battle-runtime.qnt` remains a full-shell fixture and
  compatibility aggregation, not a whole-battle MBT generation input. QNT and
  TypeScript do not call each other at runtime;
  they connect through verification harnesses (see
  `plans/BATTLE_RUNTIME_QNT_TS_CONNECTIVITY.md`).
- **Focused MBT/parity/replay witnesses** as separate `*.mbt.qnt` and
  `*.mbt.test.ts` drivers per obligation, profile, or selected identity. No
  single integrated battle MBT is the verification gate; the broad
  `battle-runtime.mbt.qnt` is one bounded-fixture witness among many.

Coverage and accounting live in two registries:

- `plans/rules-kernel-coverage/` — semantic obligation manifest with QNT
  owners, runtime owners, parity witnesses, generator-readiness rows
  (`generator-readiness.jsonl`), QNT-owner roles (`qnt-owner-roles.jsonl`),
  and kernel-IR boundaries (`kernel-ir-boundaries.jsonl`). Denominator is
  TS-current reducer behavior after Surface admission, not raw code coverage.
- `plans/unit-profile-coverage/` — authored Unit/profile support breadth,
  with the join view to rules-kernel coverage in
  `plans/rules-kernel-coverage/profile-obligations.jsonl`. The end-to-end
  gate is `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`.

Generator readiness is a separate axis from parity. A QNT owner that is shaped
as semantic core (suitable input for a future QNT-to-Rust generator) is
recorded distinctly from a QNT owner that is proof-only.

The previous root QNT monoliths were archived restore source material under
`plans/LARGE_FILE_DOMAIN_SPLIT_PLAN.md` policy and have been removed from the
worktree. They remain recoverable from git history, but they are not the active
verification corpus and not a gate for any runtime behavior. The old QA
assertion-generation lane that prompted against the root creature spec is also
retired; see `scripts/qa/QA_README.md`.

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

Concrete contracts for `BATTLE_HELP_ATTACK` and `BATTLE_MOVE` are implemented
in `@dnd/battle-runtime` and `@dnd/mcp`; the TypeScript and the
corresponding package-local QNT/tests are canonical for their shapes.

Not every table-owned rule fact is a runtime input. Keep these cases separate:

- **Table-supplied runtime witnesses** are facts the table/caller/session gives
  to an owning runtime through a typed input, hole, or fill. The runtime consumes
  the witness and applies the modeled mechanical consequence, but it does not
  derive the table observation. Examples include area membership, sight, cover,
  range, falling, landing, legal destination, movement-cost, and object
  disposition facts.
- **Runtime-detached table adjudication** is table work the application does not
  model or consume for the current product goal. It should not create runtime
  holes, durable state, support profiles, or battle/character outcomes merely to
  mark coverage. Examples include Alarm's ward narration, Identify's information
  disclosure, language conversation, broad detection result narration, and
  illusion/social adjudication that does not feed a modeled procedure.

## Companion Control Frontier

Companion, familiar, steed, summon, and other controlled-creature rules follow
the same ownership boundary as spatial facts and player choices. The runtime may
model the mechanical protocol that RAW gives it: creature admission, source-owner
links, one-at-a-time replacement, command cost, turn ordering, legal action
discovery, resources, HP/damage, dismissal, and the mechanical consequences of a
table-selected action.

The runtime must not choose a companion's tactics. It must not select whether the
owner commands the companion, which legal action the companion takes, which target
it chooses, which route it follows, where it moves, or how it interprets an
open-ended command. Those are Table Decisions expressed through the same explicit
channels used elsewhere: selected public acts, holes/fills, and table-supplied
witnesses such as target, route, range, line of sight, placement, and
area-membership facts.

When RAW says a controlled creature "obeys commands", "acts independently", or
takes a default behavior, model only the rule protocol that has a mechanical
consequence. A default such as Dodge can be a modeled action if RAW fixes it; an
open-ended instruction such as choosing useful tactics remains outside runtime
ownership unless a future product explicitly adds a separate caller-owned policy
layer outside the rules reducer.

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
   owning package's formal model first: a shared rule-core slice in
   `packages/shared-algebras/proofs/rule-core/` when the behavior is reusable
   outside one reducer, otherwise package-local Quint with a bridge to whichever
   rule-core slices it composes.
4. Mirror the formal boundary in TypeScript with the narrowest runtime type that
   can represent only valid states. Do not keep a weaker TS type and repair it
   downstream with adapters, duplicate registries, or parallel state.
5. Add parity proof at the owning boundary. Reducer packages use package-local
   QNT tests, focused reducer tests, and focused MBT drivers per obligation or
   profile. Integrated MBT (e.g., `battle-runtime.mbt.qnt`) is one bounded
   witness, not a coverage gate by itself.
6. Thread the stronger fact through callers directly. If MCP or another
   composition layer needs a stronger lower-layer fact, change the lower layer
   and its proof owner; do not compensate with private MCP state.

The shorthand is "formal model first, parity next, TypeScript as the executable
mirror", but the exact proof tool is package-owned. Focused MBT is the default
parity witness for reducer procedures, sequencing, holes, reactions, resources,
active effects, and interleavings; it is not required per authored Unit, Spell,
weapon, feature, or Stat Block.

## Package Ownership

| Package | Owns | Does not own |
| --- | --- | --- |
| `@dnd/surface` | Provenance-bearing authored Unit and Stat Block records, structural readers, SRD collections, and decode/catalog boundaries. | Runtime state, reducer legality, character draft sessions, battle sessions, or projected executable IR. |
| `@dnd/shared-algebras` | Reusable reducer algebras such as action economy, Initiative, Armor Class, attack rolls, conditions, Death Saving Throw counters, runtime dice, and runtime hole identity. | Unit support gates, act subjects, authored-content catalogs, MCP sessions, or complete character/battle reducers. |
| `@dnd/character-creation-runtime` | Character Draft mutation, creation holes/fills, support gates, finalization, and `CharacterBuild` projection from Surface Unit facts. | Battle initialization, battle state, current HP, in-play resource expenditure, or authored content provenance. |
| `@dnd/battle-runtime` | Battle initialization from caller-built creature inputs, durable battle state, act discovery, replay fills, action resources, damage/HP mutation, supported feature/spell/attack resolution, table-supplied spatial facts consumed or stored by those procedures, and snapshots. | Character draft legality, catalog installation, MCP transient fill storage, post-battle character-session persistence, or geometry inference such as grids, coordinates, LOS, pathfinding, cover calculation, and adjacency caches. |
| `@dnd/mcp` | Tool schemas, session storage, installed Surface catalogs, Character Build to battle-init projection, selected Stat Block identity, transient battle fills, table/caller-provided spatial facts for tool calls, and cross-runtime workflow tests. | Reducer semantics, authored content rules, package-local QNT authority, duplicated executable content, or private geometry state that substitutes for table-supplied spatial facts. |

The composition rule is direct use of owned package APIs, not an adapter layer.
If a future task needs a lower layer to expose a stronger fact, change that
layer and its proof owner. Do not add parallel MCP state or a private MCP
registry to compensate for a missing runtime or Surface shape.

## MCP Composition

`@dnd/mcp` is the tool-facing composition package.

The MCP runtime path composes:

- `srdUnitCollection` through `buildUnitCatalog`;
- `srdStatBlockCollection` through `buildStatBlockCatalog`;
- character drafts and finalized Character Builds;
- selected Stat Block identity;
- durable `BattleState`;
- transient battle fills kept outside `BattleState`.

MCP package details live in `packages/mcp/README.md`.

## Quint And Parity

Quint specs are correctness references for runtime behavior. The QNT corpus is
a forest of small slices (see **QNT Verification Shape** above and
`docs/adr/0001-forest-of-qnt-slices.md`). For Unit/StatBlock-backed battle
behavior, `@dnd/battle-runtime` is the active runtime semantic authority, and
QNT authority is distributed across shared rule-core slices, package-local
focused slices, and focused witnesses:

- Reusable mechanics live in
  `packages/shared-algebras/proofs/rule-core/` — spell invocation, slot
  expenditure, damage projection, hit-point lifecycle, reactions/concentration,
  movement, stat-block controls, unit-feature procedures. Package-local QNT
  bridges into these slices instead of restating their semantics.
- `packages/battle-runtime/battle-runtime.qnt` is a full-shell fixture and
  compatibility aggregation module for `@dnd/battle-runtime`; new QNT ownership
  should prefer focused slices and witnesses.
- `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
  constrains character-creation reducer behavior.
- The deleted root `.qnt` files are historical restore material recoverable
  from git history, not the active authority for any runtime.

Runtime correctness mechanisms:

- Reducer packages use package-local QNT specs plus deterministic reducer
  tests, plus focused `*.mbt.qnt` / `*.mbt.test.ts` parity drivers per
  obligation or profile.
- Shared rule-core slices use stateless contracts plus stateful inductive
  proof machines (`*-inductive.qnt`), and where reused at scale, integration
  MBT through a package-local bridge.

Quint proof must keep the oracle direction explicit. Do not generate Quint
expected state literals from TypeScript runtime results. Promoted parity is
Quint-owned through hand-authored package-local QNT tests and MBT traces; TS
tests may use RAW-backed expected values, but must not render TS state into
Quint assertions and treat that as proof.

Proof layers for the promoted path are package-owned:

| Boundary | Proof owner | Default proof shape | Escalate when |
| --- | --- | --- | --- |
| Authored Surface records and catalogs | `@dnd/surface` | Decode/reader tests, trace review, provenance/cross-collection constraints, and table-driven catalog contract tests. | A new record family or structural reader changes runtime-visible meaning. |
| Reusable rule mechanic | `@dnd/shared-algebras` `proofs/rule-core/` slice | Stateless contract module plus stateful inductive proof machine (`*-inductive.qnt`); integration MBT through a package-local bridge where the mechanic is composed at scale. | A new reusable procedure family is introduced or an existing slice's state transitions change. |
| Character creation reducer | `@dnd/character-creation-runtime` | Focused reducer tests, package-local QNT, and package-local randomized MBT where present. | Draft mutation, hole/fill semantics, support gates, or final `CharacterBuild` projection changes. |
| Battle reducer deterministic semantics | `@dnd/battle-runtime` | Focused reducer tests plus hand-authored `battle-runtime.qnt` self-tests and rule-core bridge modules. | Implemented battle behavior, action resources, HP lifecycle, act discovery, replay, or snapshots change. |
| Selected composed battle-runtime flows | `@dnd/battle-runtime` | Focused `*.mbt.qnt` / `*.mbt.test.ts` drivers per obligation, profile, or selected identity, plus the broad `battle-runtime.mbt.qnt` as one bounded-fixture integration witness. | Trace generation adds value across discovery, replay holes, action resources, damage, and snapshots. |
| MCP runtime composition | `@dnd/mcp` | Deterministic MCP server/protocol tests and end-user acceptance scenarios over real tool calls and in-memory sessions. | Tool schema, session ownership, cross-runtime projection, battle fill storage, handoff, or workflow recovery changes. |

No layer requires MBT per authored Unit, Spell, weapon, feature, or Stat Block.
Ordinary catalog width belongs in Surface reader/contract tests and package
support-gate tests unless it changes a reusable reducer procedure family or a
selected high-risk composition flow.

## Rules Kernel Coverage And Generator Readiness

Rules-kernel coverage is the obligation ledger for reducer-owned semantics.
Its denominator is TS-current reducer behavior after Surface admission, not raw
code coverage, catalog breadth, parser failure coverage, or unsupported authored
records. The active artifacts live in `plans/rules-kernel-coverage/`.
Authored-content breadth remains in `plans/unit-profile-coverage/`; the join
between the two lanes is `plans/rules-kernel-coverage/profile-obligations.jsonl`.
Do not duplicate profile-to-obligation mappings in Unit claims, profile rows, or
obligation rows.

A Surface-backed semantic obligation is covered only when the full chain exists:

```text
Surface record
        |
        v
support profile
        |
        v
semantic obligation id
        |
        v
QNT owner
        |
        v
production TypeScript runtime owner
        |
        v
executable parity witness
```

Direct reducer-entrypoint obligations use the shorter chain:

```text
reducer entry point
        |
        v
semantic obligation id
        |
        v
QNT owner
        |
        v
production TypeScript runtime owner
        |
        v
executable parity witness
```

The parity witness must run current production TypeScript reducer code against a
QNT-owned projection. A QNT owner without an executable TS witness is only a
spec claim; a TS test without a QNT owner is only regression coverage. Boundary
or unsupported behavior can be recorded outside the QNT denominator only when
the boundary classification is explicit.

Focused MBT with random traces is the default parity witness for reducer
procedures, sequencing, holes, reactions, resources, active effects, and
interleavings. Deterministic QNT replay is a replay witness, not MBT coverage;
it is reserved for fixed projections or small finite fixtures with explicitly
named cases. Index-gated replay is not a general MBT pattern and must not
replace random MBT where branch interaction is the coverage risk.

Generator readiness is a separate C-axis record. It asks whether the QNT owner
is shaped like semantic core that a future QNT-to-Rust generator could consume.
It does not make the generator part of the current runtime and it does not
replace parity coverage. A generator-readiness row must distinguish semantic
core QNT from proof-only QNT and name the small language subset the future
generator would need.

## Dependency Direction

The runtime path uses this dependency direction:

```text
@dnd/shared
@dnd/shared-algebras (incl. proofs/rule-core)
@dnd/surface
                |
                v
@dnd/character-creation-runtime     @dnd/battle-runtime
                |                          ^
                v                          |
@dnd/character-sheet-runtime               |
                |                          |
                v                          |
@dnd/character-battle-runtime  ------------+
                                           |
                                           v
                                        @dnd/mcp
                                        @dnd/app
```

## Reference Authority

| Document | Scope | Authority |
| --- | --- | --- |
| `.references/srd-5.2.1/` | Rules text | Ground truth for modeled SRD rules |
| `UBIQUITOUS_LANGUAGE.md` | Canonical D&D domain terminology | Naming authority for domain terms |
| `ASSUMPTIONS.md` | Explicit modeling choices where SRD is underspecified | Sole record of intentional RAW assumptions |
| `docs/adr/0001-forest-of-qnt-slices.md` | QNT verification shape | Architectural decision authority for the QNT corpus structure |
| `packages/character-creation-runtime/VOCABULARY.md` | Character-creation runtime terms | Character-creation package vocabulary |
| `plans/rules-kernel-coverage/` | Reducer semantic obligation coverage and generator-readiness ledger | Coverage authority for TS-current reducer semantics |
| `plans/unit-profile-coverage/` | Authored Surface Unit/profile support breadth | Coverage authority for authored-content support and the generated rules-kernel join view |
| `plans/BATTLE_RUNTIME_QNT_TS_CONNECTIVITY.md` | Battle-runtime QNT/TS connectivity map | Reference map for how battle-runtime QNT bridges into rule-core and connects to TypeScript via MBT |
| Package READMEs | Package-owned APIs and local invariants | Local package contracts |

## Choosing The Right Owner

| Question                                        | Owner                                           |
| ----------------------------------------------- | ----------------------------------------------- |
| What does the SRD say?                          | `.references/srd-5.2.1/`                        |
| What term should code use?                      | `UBIQUITOUS_LANGUAGE.md` or package vocabulary  |
| What authored content exists?                   | `@dnd/surface`                                  |
| Is a Unit or Stat Block decoded correctly?      | Surface tests and trace review                  |
| Is character creation state valid?              | `@dnd/character-creation-runtime`               |
| Is battle reducer behavior correct?             | `@dnd/battle-runtime` plus its QNT/parity tests |
| Is a reusable mechanic correct?                 | `packages/shared-algebras/proofs/rule-core/` slice plus its inductive proof or MBT driver |
| How are runtimes exposed to tools?              | `@dnd/mcp` composition                          |
