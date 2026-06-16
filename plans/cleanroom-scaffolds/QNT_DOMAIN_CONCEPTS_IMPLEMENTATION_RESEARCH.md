# Research: QNT Domain Concepts Implementation Paths

Status: unreviewed task-local research. This document is not approved harness
guidance, not target-run instruction, not cleanroom bootstrap input, and not a
source of truth for implementation decisions outside the current harness-shaping
task. It may be used only as working context while this task is active; promote
or replace specific findings elsewhere only after an explicit review decision.

This is source-side research for
`QNT_DOMAIN_CONCEPTS_HARNESS_PLAN.md`. It is not active cleanroom target-run
instruction yet. Its job is to show, for each planned concept, where the source
repo already has QNT/runtime/app evidence, what kind of QNT shape should carry
the concept next, and how the cleanroom scaffold can later turn that into task
pressure.

The main app connection in this repo currently means two things:

- `@dnd/mcp`, which is the tool-facing composition path over character creation,
  sheet, battle, and handoff packages.
- `@dnd/app`, especially the battle visualizer/demo path, where battle snapshots
  and demo fills are surfaced.

The cleanroom harness should not require a React UI rewrite to prove these
concepts. A meaningful app-facing connection can be an MCP tool workflow,
session-store fact, battle snapshot projection, or visualizer/demo projection,
as long as the production module that owns the domain fact remains the runtime
owner.

## Cross-Cutting Findings

- The QNT corpus is a forest of focused slices, not one whole-battle model.
  Concepts should land as the smallest fitting artifact: leaf vocabulary,
  focused rule-core semantics, package-local bridge/spec, MBT witness, source
  inventory metadata, or static reviewer gate.
- The cleanroom scaffold already has useful gates for engine depth,
  adapter quarantine, state-owner derivability, authored-identity dispatch, and
  report honesty. It does not yet make all nine concepts explicit.
- The biggest missing cleanroom affordance is concept metadata in the source
  branch inventory and richer state-owner categories for source facts, witness
  facts, runtime projections, occurrence state, and encounter relationships.
- QNT should not be used as a source-code scanner. Authored-identity dispatch,
  adapter leakage, and redundant target state remain static/reviewer/decider
  concerns. QNT should model the typed facts that production code must use
  instead.

## Summary Matrix

| Concept | Source status | QNT route | MCP/app route | Cleanroom gap |
| --- | --- | --- | --- | --- |
| Hole, Fill, And Witness Ownership | Partly modeled | Keep semantic-frontier vocabulary in leaf QNT; keep table facts in inventory/classification | `fill_battle_hole`, battle result payloads, app demo fills | Add concept tags and table-fact owner checks |
| Source Fact, Table Witness, Runtime Projection | Partly modeled | Source-fact lifecycles in focused QNT; witnesses in MBT projections | MCP fills; snapshots/visualizer show source/projection facts | Split state-owner categories |
| Support-Profile Admission | Mostly modeled | Rule-core profile QNT plus selected-identity MBT | Catalog selection + discovery/admission tools | Require target support-gate evidence per task |
| Result Taxonomy | Strong, but not universal | Use `WitnessProtocol`; migrate remaining protocol strings where useful | MCP returns resolved/needsHoles/invalid; creation returns accepted/rejected/ready/incomplete/invalid | Require replay evidence result classification |
| Procedure Lifecycle And Replay Protocol | Strong in battle | Ordering/reaction/replay QNT plus lifecycle-stage metadata | MCP transient fills and pending sessions | Add lifecycle stage tags to source inventory |
| Runtime Occurrence State | Partly modeled | Focus lifecycle/cleanup QNT on occurrence state, not names | Battle snapshots and MCP battle state | Add occurrence-state manifest expectations |
| Draft/Build/Sheet/Battle/Handoff | Strong | Existing character creation/sheet/battle QNT and MBTs | Full MCP workflow across draft, sheet, battle, closeout | Make layer owner tags first-class in tasks |
| Authored Identity/Provenance/Projection | Strong outside QNT | QNT models typed profile facts; static gate blocks identity dispatch | MCP stores selected ids but calls package owners | Keep static gate; add target equivalent |
| Encounter Relationships And Side | Implemented, narrow | Keep side equality QNT unless source widens model | `start_battle` requires side; reducers project allies/enemies | Add setup relationship owner to manifests |

## 1. Hole, Fill, And Witness Ownership

### Existing Source Evidence

- `packages/battle-runtime/battle-runtime-witness-protocol.qnt` is a leaf QNT
  module with `WitnessResult`, `WitnessInvalidReason`, and
  `WitnessProtocol[h]`.
- `packages/battle-runtime/battle-runtime-hole-kinds.qnt`,
  `battle-runtime-fill-kinds.qnt`, and `battle-runtime-subject-kinds.qnt` are
  leaf vocabulary modules for semantic-frontier holes, fills, and subjects.
- `plans/rules-kernel-coverage/battle-hole-frontier.jsonl` classifies each
  hole/fill family as `semantic-frontier` or `table-owned-fact`.
- `plans/rules-kernel-coverage/kernel-ir-boundaries.jsonl` records `fill` and
  `result` as explicit reducer interface seams.
- `@dnd/mcp` stores transient battle fills outside `BattleState` and clears them
  after `@dnd/battle-runtime` resolves the act.

### QNT Implementation Or Discovery Route

Do not put every table-owned fact into the `BattleHoleFamilyKind` and
`BattleFillKind` variants. Those QNT leaves intentionally model promoted
semantic-frontier vocabulary only. Table-owned rows should stay in the JSON
frontier registry unless a specific focused witness needs a local projection
value.

The next useful QNT-facing improvement is a small generated or checked
classification join:

- semantic-frontier rows in `battle-hole-frontier.jsonl` must have matching leaf
  QNT vocabulary variants;
- table-owned rows must either be absent from the semantic-frontier leaf modules
  or appear only in dedicated table-fact witness drivers;
- ordering QNT modules should import only the leaf vocabulary and never a large
  behavioral module.

If a QNT module is added, make it a leaf ownership vocabulary such as
`battle-runtime-frontier-ownership.qnt`; it should define concepts like
`SemanticFrontier` and `TableOwnedFact` without importing reducer behavior.

### MCP/App Connection

`fill_battle_hole` is already the MCP-facing connection. It collects transient
fills and calls battle-runtime. The app/demo connection is the battle demo code
that supplies target, damage, reaction, and spatial fills.

The useful app-facing improvement is derived display only: when a tool response
or visualizer shows a hole, it can derive whether the requested fact is a
semantic-frontier fill or a table-owned witness from the hole kind. Do not store
that classification on `BattleState`.

### Cleanroom Harness Consequence

Add source branch inventory tags such as:

- `domainConcepts: ["hole-fill-witness-ownership"]`
- `frontierClassification: "semantic-frontier" | "table-owned-fact"`
- `fillChangesReducerLegality: true | false`

The `STATE_OWNER_MANIFEST` should be widened or supplemented so a target can
name table witness facts without pretending they are durable battle state.

## 2. Source Fact, Table Witness, And Runtime Projection

### Existing Source Evidence

- `docs/adr/0004-light-obscurement-sight-source-facts-and-witnesses.md`
  records the durable source fact versus table witness split.
- `packages/battle-runtime/battle-runtime-light.qnt` owns light-emitter and
  related spell light lifecycle semantics.
- `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
  witnesses spatial/light selected-identity behavior without making the reducer
  a geometry engine.
- `packages/battle-runtime/src/battle-reducer.ts` has typed source/projection
  facts such as `BattleLightEmitter`, `BattleObscurementZone`,
  `BattleLightEmitterProjectionFact`, and `BattleTargetSpatialFact`.
- Spell profiles such as
  `battle-reducer/spell-procedure-profiles/fog-cloud-obscurement.ts` explicitly
  say runtime owns spell slot spend, radius, duration, obscured area projection,
  and cleanup while the table owns area membership, line of sight, wind
  derivation, and map geometry.

### QNT Implementation Or Discovery Route

Use focused QNT based on fact owner:

- Durable source facts with lifecycle and RAW consequences belong in
  package-local semantic QNT, such as `battle-runtime-light.qnt`.
- Table witnesses belong in MBT drivers and replay projection state, not as
  durable reducer state.
- Runtime projections can appear in witness state when they are the executable
  output being compared, but the source fact that produced them should remain
  the canonical production state.

The next source-side improvement is not a map model. It is a concept owner
vocabulary or inventory tag for `durable-source-fact`, `table-witness-fact`, and
`runtime-projection`, with representative QNT owners attached to each.

### MCP/App Connection

MCP already carries table witnesses through battle fills, especially
`targetSpatialFacts`. The app battle demo supplies spatial facts for visualized
procedures. Battle snapshots and visualizer state can show source facts such as
light emitters, zones, concentration, or active effects.

The app must not cache a durable visibility matrix, distance matrix, geometry
map, or pathfinding result as battle truth. If a display wants this, it should
be a view projection over source facts and table-provided witness data.

### Cleanroom Harness Consequence

Extend state-owner artifacts so targets can distinguish:

- source fact introduced or retained by the engine;
- witness fact consumed at an action frontier;
- runtime projection returned to tools or visualizer;
- derived display data that must not be replay authority.

The current scaffold owner set has `battle-state`,
`executable-boundary-projection`, and `harness-witness-protocol`; that is close
but too coarse for this concept.

## 3. Support-Profile Admission

### Existing Source Evidence

- `packages/shared-algebras/proofs/rule-core/spell-definition-profiles.qnt` and
  `spell-procedure-profiles.qnt` define profile-level spell facts.
- `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles-inductive.qnt`
  owns broad unit-feature profile proof coverage.
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/profile.ts`
  defines `SpellProcedureProfile` as the typed production interface for
  admission, discovery, dispatch, codec, and classification.
- `packages/battle-runtime/src/unit-feature-support.ts` defines battle unit
  support profile identifiers and source-fact shapes.
- `packages/character-creation-runtime/src/support-gates.ts` defines
  `CharacterCreationSupportProfile`.
- `packages/character-sheet-runtime/src/sheet-types.ts` still has explicit
  `AUTHORED-IDENTITY DEBT` support-gate exceptions; those are tolerated debt,
  not a pattern.

### QNT Implementation Or Discovery Route

Support-profile admission should be discovered from existing profile QNT and
selected-identity MBT, not from authored names. The rule-core QNT proves the
mechanics profile. The selected-identity witness proves that an authored Surface
record is admitted through parsed shape and typed facts into that profile.

When adding support:

- add or reuse a profile fact in rule-core QNT;
- add package-local runtime integration or selected-identity MBT only where the
  Surface record admission path matters;
- do not add a QNT branch whose semantic distinction is just a spell, feature,
  class, or monster id.

### MCP/App Connection

MCP catalog tools expose selectable ids, but executable behavior must come from
runtime package admission. Creation tools use real discovered holes and
finalization gates. Battle tools discover acts from battle-runtime. The app can
select and display authored records, but execution should flow through the same
support-profile readers and typed procedure facts.

### Cleanroom Harness Consequence

For cleanroom tasks, selected-identity obligations should require an admission
story:

- which support profile admitted the behavior;
- which typed facts crossed into the engine;
- which authored ids were selection/catalog facts only;
- what reviewer evidence proves the target did not dispatch on authored
  identity.

This can be recorded in `ENGINE_DEPTH_MANIFEST` and reviewer/decider artifacts
before adding any new template file.

## 4. Result Taxonomy

### Existing Source Evidence

- `battle-runtime-witness-protocol.qnt` defines `WInit`, `WNeedsHoles`,
  `WResolved`, and `WInvalid(reason)`.
- `BattleResolutionResult` in `packages/battle-runtime/src/battle-reducer.ts`
  has `resolved`, `needsHoles`, and `invalid` variants.
- `CreationBatchFillResult` has `accepted` and `rejected`, while
  `CreationFinalizationResult` has `ready`, `incomplete`, and `invalid`.
- `packages/mcp/src/battle-tools.ts` preserves battle results in structured tool
  payloads instead of throwing ordinary domain outcomes.
- ADR-0001 notes that remaining `qScenarioResult`-style strings are separate
  projection facts and not fully migrated to typed protocol variants.

### QNT Implementation Or Discovery Route

Use `WitnessProtocol` for protocol outcomes whenever a driver is asserting
resolved, needs-holes, or invalid behavior. Do not introduce generic string
results for new protocol outcomes.

For existing drivers:

- migrate `qLastResult: str` only when the string is actually a protocol result;
- leave scenario names as local scenario variants when they describe the branch
  that was witnessed;
- keep display/projection labels separate from result taxonomy.

### MCP/App Connection

MCP already returns structured battle results and creation results. The app
should consume these result tags rather than catching exceptions or parsing
messages. A visualizer can display result details from snapshots and payloads,
but `BattleState` remains the combat truth.

### Cleanroom Harness Consequence

Target replay evidence should classify every observed branch as:

- `resolved`;
- `needsHoles`, with the current hole families;
- `invalid`, with a typed reason;
- blocked due to missing source corpus or target implementation.

The validation report should derive coverage from this evidence, not from
diagnostic tests or prose.

## 5. Procedure Lifecycle And Replay Protocol

### Existing Source Evidence

- `battle-runtime-command-ordering.qnt` models command frontier stages and fill
  ordering.
- `battle-runtime-reaction-window.qnt` and
  `battle-runtime-reaction-resolution.qnt` model reaction windows, decisions,
  stack mutation, and continuation resume.
- `battle-runtime-replay-equivalence.qnt` is a leaf replay-from-root projection
  module.
- `battle-runtime-interrupt-stack-resume.mbt.qnt` witnesses nested interrupt
  resume, active-effect mutation on resume, and replay-from-root equivalence.
- MCP `pendingBattleFills` stores transient fill sessions and preserves
  interrupt decision behavior without making fills durable battle state.

### QNT Implementation Or Discovery Route

Procedure lifecycle should be represented by stage-specific QNT, not only final
state projection. The right QNT shapes are:

- ordering modules over hole/fill leaf vocabulary for fill-frontier order;
- reaction/window/continuation modules for interrupt and resume;
- replay equivalence leaves for replay-from-root properties;
- focused MBT drivers that exercise discovery, fill, rejection, interrupt,
  resume, cleanup, and settlement as separate actions where those stages matter.

### MCP/App Connection

MCP is already the primary app-facing replay route: it stores pending fills,
replays the selected subject through battle-runtime, and clears fills on
resolution. The battle demo visualizes multi-step procedures and can continue
to be used as a smoke path for lifecycle behavior.

### Cleanroom Harness Consequence

Add `lifecycleStages` metadata to source branch inventory rows. A task should
say which stages it covers: discovery, fill, invalid fill, interrupt, resume,
replay-from-root, cleanup, settlement, or closeout.

The cleanroom Work Loop already tells agents to continue to the next branch set.
Lifecycle metadata would help reviewers reject one-off final-state code that
skips the reusable engine procedure.

## 6. Runtime Occurrence State

### Existing Source Evidence

- `packages/battle-runtime/src/active-effect/types.ts` defines active effect
  expiration, source combatant, source spell/unit, selected runtime facts, and
  mutable occurrence payloads.
- `packages/battle-runtime/src/active-effect/lifecycle.ts` owns pure lifecycle
  helpers for applying conditions, replacing exclusive shape-shift owners, and
  deriving condition state from active effects.
- `BattleCreatureState` stores `activeEffects` and
  `activeOngoingFeatureOccurrences`.
- `battle-runtime-direct-condition-lifecycle.qnt` models spell-owned condition
  projection, early end, concentration cleanup, and duration cleanup.
- `battle-runtime-roll-modifier-active-effects.mbt.qnt` and
  `battle-runtime-scalar-buff.mbt.qnt` witness active modifier/buff outcomes.

### QNT Implementation Or Discovery Route

Runtime occurrence state should be shaped through lifecycle evidence, not broad
metadata. Good QNT evidence names:

- how an occurrence is created;
- which source key or source fact owns it;
- what mutable execution fact it stores;
- when it expires or is cleaned up;
- what authored/static facts are deliberately not copied.

Do not require every target to use the source repo's exact occurrence type
names unless the QNT obligation already uses that vocabulary. The QNT concern
is ownership and lifecycle, not a TypeScript type spelling.

### MCP/App Connection

MCP exposes battle state and snapshots. The app visualizer can show active
effects, concentration, HP, conditions, and turn state as projections. It should
not turn authored spell/feature records into duplicated active effect state.

### Cleanroom Harness Consequence

For tasks that introduce mutable ongoing state, `STATE_OWNER_MANIFEST` should
require occurrence-specific fields:

- source ref/key;
- selected runtime choice or mutable value;
- expiration/cleanup owner;
- authored/static facts intentionally excluded.

The current owner label can remain `battle-state`, but the manifest should add
an occurrence-state detail field or concept tag.

## 7. Character Draft, Build, Sheet, Battle, And Handoff Ownership

### Existing Source Evidence

- ADR-0002 records the core rule: character creation chooses and validates
  authored sheet facts; combat consumes a one-way creature projection.
- `@dnd/character-creation-runtime` owns `CharacterDraft`, `CreationHole`,
  `CreationFill`, atomic batch fill, finalization, and `CharacterBuild`.
- `@dnd/character-sheet-runtime` owns in-play `CharacterSheet` state such as
  current HP, temporary HP, conditions, spent Hit Dice, rest feature uses,
  resource expenditures, spell slots, created slots, Pact Slot expenditure, and
  retained companions.
- `@dnd/character-battle-runtime` owns `characterSheetBattleInit`,
  `battleCreatureInitFromCharacterBuild`, and `settleCharacterSheetFromBattle`.
- Existing QNT/MBT files cover the stack:
  `character-creation-runtime-slice.qnt`,
  `character-creation-runtime.mbt.qnt`,
  character-sheet MBTs such as `character-sheet-hit-point-maximum.mbt.qnt`,
  and character-battle MBTs such as `character-battle-init-projection.mbt.qnt`
  and `character-battle-settlement.mbt.qnt`.
- MCP exposes the full workflow from draft creation through battle closeout and
  `list_characters`.

### QNT Implementation Or Discovery Route

This concept is already strongly modeled. The QNT route is to keep using the
existing layer-specific MBTs rather than introduce a flat character spec:

- creation QNT: draft holes, fills, revision, finalization;
- sheet QNT: in-play resources, rest, HP, slots, conditions;
- battle QNT: creature-facing battle state;
- handoff QNT: projection and settlement with identity/conflict checks.

New cleanroom work should discover which layer owns the state before adding any
field or reducer branch.

### MCP/App Connection

MCP is the strongest app-facing proof. The accepted vertical creates a draft,
fills holes, finalizes a build, starts battle from a character plus stat block,
resolves battle acts through fills, ends battle, and lists the updated
character.

The React app can later use the same package interfaces, but cleanroom harness
readiness does not depend on building that UI.

### Cleanroom Harness Consequence

Add layer-owner tags to source branch inventory and task artifacts:

- `creation-draft`;
- `creation-build`;
- `sheet-state`;
- `battle-init-projection`;
- `battle-state`;
- `character-battle-handoff`.

Reviewer checks should reject any target shape that stores draft choices,
finalized build facts, sheet HP/resources, battle initiative, and selected
combat targets in one flat record.

## 8. Authored Identity, Provenance, And Runtime Projection

### Existing Source Evidence

- `ARCHITECTURE.md` states that runtime packages must use Surface records,
  support-profile readers, and typed procedure facts rather than hard-coded Unit
  ids, Spell ids, Stat Block ids, names, or slugs.
- ADR-0003 separates source record/provenance, canonical normalized stat block,
  and one-way runtime projection.
- `packages/surface/src/surface/stat-block-catalog.ts` makes SRD provenance
  explicit and rejects mixed-provenance SRD collections.
- `scripts/check-authored-id-dispatch-boundary.cjs` is the source static gate;
  `pnpm check:authored-id-dispatch` runs it.
- Cleanroom reviewer/decider templates already contain authored-identity
  dispatch gates.

### QNT Implementation Or Discovery Route

QNT should model typed runtime facts, not inspect source code. The correct QNT
shape is:

- profile facts and procedure facts that do not include authored names;
- selected-identity witnesses only at catalog/selection/test boundaries;
- synthetic identities for non-SRD examples where identity is not the point;
- no QNT branch whose behavior is keyed by a real spell, feature, class,
  monster, source heading, or page reference.

Identity-dispatch prevention remains a static gate and reviewer responsibility.
Do not try to replace it with QNT.

### MCP/App Connection

MCP stores selected content ids as user-selection facts, not runtime semantics.
For example, selected Stat Block state stores only a Stat Block id; the full
record is resolved through the installed catalog. App code may display authored
names and allow selection, but runtime behavior must pass through support
profiles and typed procedure facts.

### Cleanroom Harness Consequence

The harness already checks authored-identity dispatch in reviewer and decider
templates. The next improvement is to make target profiles provide or name their
equivalent static check, and to require task artifacts to identify every allowed
authored-identity use as catalog, selection, fixture, or documented admission
debt.

## 9. Encounter Relationships And Encounter Side

### Existing Source Evidence

- `UBIQUITOUS_LANGUAGE.md` defines Encounter Side as caller-supplied battle setup
  state: same side means allies, different side means enemies.
- `packages/battle-runtime/battle-runtime-combatant-side.qnt` models side
  equality for `damageSourceIsCasterOrAlly` and `actorsAreEnemies`.
- `BattleCreatureState` stores `side: BattleCombatantSide`.
- `combatantsAreEnemies` and `combatantsAreAllies` project relationship facts
  from side equality.
- `packages/mcp/src/start-battle-tool-input.ts` requires caller-supplied side
  for both character-session and stat-block combatants.
- Current runtime uses include Help, Rage extension, Sneak Attack adjacent-ally
  checks, enemy-reduced-to-zero features, caster-or-ally cleanup, and Initiative
  Swap.

### QNT Implementation Or Discovery Route

Keep the source QNT expectation at side equality until a source-side decision
widens the relationship model. Do not model allies/enemies by character versus
stat block origin, creature kind, provenance, or player/monster identity.

If future RAW support needs neutrality, per-pair hostility, charm-specific
relationship changes, or temporary faction overrides, widen this concept first
in domain docs, QNT vocabulary, runtime state, MCP input, and cleanroom tasks.
Do not add rule-specific exceptions.

### MCP/App Connection

`start_battle` already exposes the app-facing setup interface: every initial
combatant has a caller-chosen side id. The battle visualizer can display side
or group labels, but the engine relationship projection must remain the side id
on battle state.

### Cleanroom Harness Consequence

Add encounter relationship expectations to state-owner artifacts:

- `side` is battle setup state;
- ally/enemy are runtime projections from side equality;
- character/stat-block origin is not relationship evidence;
- future widened relationship models require a source-side blocker or task.

## Suggested Next Harness Edits

These are implementation candidates for later scaffold work, in priority order:

1. Add concept tags to `source-branch-inventory.json` generation:
   `hole-fill-witness-ownership`, `source-fact-witness-projection`,
   `support-profile-admission`, `result-taxonomy`, `procedure-lifecycle`,
   `runtime-occurrence-state`, `character-layer-ownership`,
   `authored-identity-provenance-projection`, and `encounter-side`.
2. Extend `STATE_OWNER_MANIFEST` with owner/detail fields for
   durable source fact, table witness fact, runtime projection, occurrence state,
   and encounter relationship setup.
3. Extend reviewer and decider templates with focused subchecks keyed by concept
   tags, so an agent set up for one lane or many lanes still follows the same
   per-task inference.
4. Extend target replay evidence with protocol result classification:
   resolved, needs-holes with hole families, invalid with typed reason, or
   blocked.
5. Add a source-side checker that verifies semantic-frontier rows in
   `battle-hole-frontier.jsonl` stay synchronized with QNT leaf vocabulary while
   table-owned rows do not silently become reducer state.
6. Add cleanroom guidance examples that show allowed selected identity use and
   rejected authored-identity dispatch without adding copyrighted or PHB+
   identity.

## What Not To Do

- Do not build one new mega-QNT module for all nine concepts.
- Do not import behavior-heavy modules into MBT drivers just to expose concept
  vocabulary.
- Do not add table geometry, pathfinding, pairwise visibility, or ally/enemy
  matrices as target expectations.
- Do not require a target React UI before the MCP/tool-facing connection exists.
- Do not make harness text enumerate every missing Rust feature. The harness
  improvement scope is clearer QNT ownership, task instructions, reviewer
  checks, decider gates, and evidence shape.
