# Correction Application Migration Plan

Status: draft for implementation planning  
Baseline restore reference: `master` at `39f9ab71`  
Goal: controlled Core breakage in favor of Surface/Unit-driven character creation and battle runtime, with a runnable MCP vertical.

## Decision Summary

Use controlled breakage, not a strangler migration and not a full rewrite.

The first MCP/runtime vertical is:

1. MCP creates a minimal level-1 Fighter through real character-creation holes.
2. Character creation consumes actual decoded Units wherever the authored Unit exists.
3. MCP selects one SRD monster Stat Block and projects it to a battle-ready creature input.
4. MCP starts battle.
5. MCP discovers battle acts.
6. MCP resolves core Attack with damage through battle holes.
7. MCP resolves End Turn.

Anything outside this MCP/runtime vertical may break temporarily, but it must
be listed in the Restore Ledger below. The migration must not silently erase
knowledge.

## Non-Negotiables

- No new executable IR.
- `CPU*`, `PEA*`, and `PPR*` projected execution vocabulary must go away.
- Surface remains the semantic language.
- `UnitRecord` is the authored rules-content shape. Character drafts are not Units.
- Character creation and battle are sibling reducers with different hole semantics.
- Runtime packages consume decoded authored UnitRecords plus explicit runtime projection/wrapper types derived from them, not package-specific content languages.
- Mixed-provenance Unit collections are forbidden.
- Phase-1 QNT specs are required. Markdown-only correctness is not enough.

## Package Topology

Target packages:

| Package                           | Responsibility                                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@dnd/surface`                    | Surface schemas, `UnitRecord` types, decode helpers, structural predicates/readers.                                                                   |
| `@dnd/shared`                     | Surface-free shared scalar/domain types that genuinely need to cross runtime package boundaries.                                                      |
| `@dnd/shared-algebras`            | Reusable non-executable reducer algebras shared by runtime packages, such as damage or hole/fill mechanics when they encode no Unit/effect semantics. |
| `@dnd/character-creation-runtime` | Minimal level-1 Fighter creation reducer: draft holes, batch fills, validation, and finalization to `CharacterSheet`.                                 |
| `@dnd/battle-runtime`             | Minimal battle reducer: battle state, subjects, battle holes, fills, Attack with damage, End Turn, local QNT slice and deterministic parity tests.    |
| future `@dnd/srd-units`           | SRD-only authored Unit collection. Do not create in phase 1 unless imports force it.                                                                  |

Core-free runtime packages must have this dependency direction only:

```text
@dnd/shared <- @dnd/shared-algebras
@dnd/shared <- @dnd/character-creation-runtime
@dnd/shared <- @dnd/battle-runtime
@dnd/shared-algebras <- @dnd/character-creation-runtime
@dnd/shared-algebras <- @dnd/battle-runtime
@dnd/surface <- @dnd/character-creation-runtime
@dnd/surface <- @dnd/battle-runtime
@dnd/character-creation-runtime <- @dnd/mcp
@dnd/battle-runtime <- @dnd/mcp
@dnd/surface <- @dnd/mcp
```

Neither runtime package may depend on `@dnd/core`. The promoted MCP
tools must not import `@dnd/core`; omitted legacy MCP/Core
behavior must stay represented by Restore Ledger rows instead of retained
route code.

Historical naming note: MCP temporarily used a literal `src/green/` directory
as a side-by-side lane next to legacy Core-backed MCP modules. CAM20 promoted
that lane into the normal MCP server route and deleted the old Core-backed MCP
directory. The promoted MCP path, `@dnd/surface`,
`@dnd/character-creation-runtime`, and `@dnd/battle-runtime` are all part of
the Core-free migration path.

## Unit Collections

The app/MCP composition root owns which Unit collections are installed.

Example shape:

```ts
const unitLibrary = buildUnitLibrary({
  collections: [srdUnitCollection],
});
```

Later, a licensed/private authored Unit collection may use the same `UnitRecord` schema, but each collection artifact must carry a single provenance/distribution policy at its boundary. An SRD collection type must only admit SRD-provenance UnitRecords; mixed-provenance or mixed-license collections are invalid by construction. Runtime semantics branch on Surface structure, never on provenance.

Duplicate Unit ids across collections are invalid unless a later explicit namespacing design is accepted.

CAM4 adds the minimum character-creation aggregate `UnitRecord` variants in
`@dnd/surface`: `ClassRecord`, `BackgroundRecord`, and `SpeciesRecord`. These
records carry SRD-authored legality facts for class traits, background
benefits, and species identity. Runtime packages consume them through structural
readers exported from `@dnd/surface/surface/character-creation-readers`, then
apply any supported-subset narrowing in package-private runtime gates rather
than in Surface exports. Background records carry the SRD ability-score
increase rule as authored Surface content. Starting-equipment bundles preserve
authored item references, GP, and selected-tool placeholders separately from
runtime inventory projection. The Orc Species aggregate keeps creature type,
size, speed, and named Orc trait grants together so a selected Orc cannot be
represented as independent mixed-species trait state.

## Character Creation Semantics

Character creation uses durable draft patch/fill semantics.

This is deliberately different from battle:

| Runtime            | Subject           | Fill semantics                                                                         | State ownership                                    |
| ------------------ | ----------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Character creation | Draft/session     | Batch fills patch durable draft state; holes are re-derived after each accepted batch. | The draft is the owned evolving object.            |
| Battle             | Chosen battle act | Replay-from-root over chosen subject plus accumulated runtime fills.                   | The chosen act/fills are not durable battle state. |

Creation holes are derived from:

- current draft state;
- installed Unit library;
- package-private supported reducer subset;
- existing character formal semantics where applicable.

`Supported*` types/functions are package-private reducer gates only. They must not appear in exported Surface, Unit library, stat-block catalog, authored content, or MCP API types.

One batch may open another batch of one or more holes. The reducer must return updated draft, remaining holes, illegal issues, and finalization status.

Creation batch fill semantics are atomic: if any fill is illegal, the returned draft is unchanged and issues identify every rejected fill. Hole ids are stable domain ids derived from draft path plus Unit/source identity, not array positions. Duplicate fills for the same hole in one batch are invalid unless the hole explicitly accepts multiple values. Accepted batches rederive holes from the new draft and must be idempotent when replayed from the same prior draft.

Phase 1 supports only legal level-1 Fighter creation. It must preserve the existing formal rule that higher-level starts are level-1 creation plus ordered advancement. Do not model this as a loose “choose level” field.

Required phase-1 character facts:

- primary class: Fighter;
- advancement: exactly one Fighter entry;
- background: from actual SRD Unit if authored, otherwise author the minimum Unit first;
- species: from actual SRD Unit if authored, otherwise author the minimum Unit first;
- ability-score generation: enough to create a legal level-1 Fighter;
- background ability score increase if required by the chosen background;
- languages if required by chosen species/background;
- alignment;
- Fighter required choices, including Fighting Style if required at level 1;
- equipment/loadout from actual SRD weapon/armor/shield Units wherever available.

Shrinking current Core character-creation width is allowed. The phase-1 runtime does not need every current Core character option.

## Battle Semantics

Battle runtime uses replay-from-root over a chosen subject and accumulated filled battle holes.

Phase 1 battle subjects:

- runtime battle act `attack`, exposing the SRD Attack action;
- runtime/modeling battle act `endTurn` per ASSUMPTIONS.md A2, not a rules Action.

Phase 1 battle holes:

- target choice;
- attack roll;
- damage result fill for the selected attack's SRD damage expression. For character weapon attacks, the Unit/loadout supplies weapon damage dice, damage type, and applicable ability/modifier facts; the hole supplies the damage roll result unless a specific SRD rule provides fixed damage. For SRD monster Stat Block attacks, the projection may use the Stat Block's authored damage expression/average only as encoded from SRD 5.2.1 provenance.

Phase 1 battle state:

- combatant identity;
- initiative/current actor;
- HP/max HP/Temporary HP;
- AC;
- action resources/action availability;
- death policy derived at the Character Sheet vs Stat Block boundary and stored explicitly on the combatant; resolution branches on that typed death policy, not on provenance labels;
- battle-ready creature combat facts projected from Character Sheets and monster Stat Blocks.

Battle-ready inputs are one-time creature initialization data only: combatant
identity, caller-supplied Initiative score, current resources, selected
equipment/Unit references, and numeric facts needed to initialize battle state.
They must not encode executable action/effect semantics already present in
decoded Units or Stat Blocks. If battle needs authored semantics, pass
the decoded Unit/Stat Block or a narrowed reader over it, not a duplicated
projection record. Character creation finalizes `CharacterSheet`; MCP maps that
sheet into the battle runtime's creature-init shape at the composition root, so
character creation does not export a parallel battle initialization type.

The runtime Attack act must include damage. Hit/miss-only attack is not enough
for the MCP/runtime vertical.

Phase 1 chooses one damage protocol for the vertical and names it in the battle
hole type. CAM14 implements dice-result fills for character weapon attacks:
completed weapon hits sum rolled damage dice plus the attack ability modifier,
apply Temporary HP before HP, clamp HP at 0, and branch through the combatant's
typed zero-HP lifecycle. CAM18 widens that same Attack replay protocol to the
Goblin Warrior's authored Stat Block attacks. The runtime must derive supported
Goblin Attack action options from `StatBlockRecord` without introducing a second
executable Stat Block IR; unsupported authored riders, such as conditional
bonus damage that depends on Advantage, remain absent or rejected by a named
support gate until widened. Death policy follows ASSUMPTIONS.md A12 for
supported combatants: Stat Block monsters die immediately at 0 HP; Character
Sheet participants enter the 0-HP/death-save track by gaining Unconscious with
reset death-save counters, and later damage at 0 HP records Death Saving Throw
failures. CAM15 owns start-turn Death Saving Throw rolls. Massive Damage and
nonlethal melee knockout remain outside the phase-1 runtime slice until
explicitly widened.

## QNT Plan

Create local reducer-shaped QNT specs next to their runtime packages:

- `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- `packages/battle-runtime/battle-runtime-slice.qnt`

Character creation QNT should model the phase-1 hole/fill reducer protocol and import/reuse broad `character-creation.qnt` concepts where practical. It may be a small composition/algebra spec rather than a fork of all character semantics.

Battle QNT should model only the first MCP/runtime vertical:

- initiative/current actor/end turn;
- combatants with HP/Temporary HP/AC/action resources/action availability;
- Attack subject;
- target/attack-roll/damage holes;
- AC hit/miss;
- action spend;
- HP damage with Temporary HP absorption and clamp;
- minimal death policy.

These QNT specs are temporary seeds, not throwaways. The battle slice must eventually become, merge into, or replace old `battle.qnt`, and documentation must be updated so the repo has one battle authority again.

During Phase 1/2, promoted `@dnd/battle-runtime` is the active semantic
authority for new Unit/StatBlock-backed battle work, and
`battle-runtime-slice.qnt` is its package-local parity reference. Existing root
`battle.qnt` and Core battle MBT remain legacy/broad proof and restore source
material until BA reconciliation classifies, restores, merges, or quarantines
them. Missing old-only behavior is future width/restoration work, not evidence
that old Core remains canonical. Any behavior shared by both specs must either
match or have an explicit tracked divergence. Before closing reconciliation,
merge/replace the slice or retire/quarantine the old authority and update the
old MBT gate accordingly.

## Phase 0: Audit And Preconditions

1. Correction action-economy drift is resolved by `52cf18b5`, which landed Surface action resource sidecars and Correction action-resource handling. New runtime work should build on that baseline.
2. Confirm active docs and imports use `@dnd/surface`; keep prototype package names only in explicitly historical documents.
3. Create the concrete SRD-only Unit collection artifact used by MCP. `srdUnitCollection` must be a real import before Phase 3, and duplicate-id/provenance validation must exist at `buildUnitLibrary`.
4. Produce `plans/phase1-fighter-manifest.md` listing the exact selected background, species, ability-score method/values, languages, alignment representation, Fighting Style, weapons, armor, shield, and monster. For each item, record the SRD 5.2.1 reference file/section and the Unit id if already authored; otherwise add the minimum Unit authoring task before reducer implementation.
5. Produce `plans/phase0-surface-unit-availability.md` auditing which exact Fighter/monster manifest facts already exist as authored Units, which need minimum SRD Unit authoring, and which need a Surface shape decision.
6. Author the missing minimum SRD Units needed for the MCP/runtime vertical from `.references/srd-5.2.1/` only. Each shipped SRD Unit must carry SRD 5.2.1 provenance, and the SRD collection type/builder must make mixed-provenance or mixed-license collections unrepresentable. External structured data may be used only as import/normalization input, never as provenance.
7. CAM3 defines the stat-block Surface catalog boundary as a generic `StatBlockRecord` over `MonsterStatBlock`, separate from `UnitRecord`, and exposes it through `buildStatBlockCatalog`. The first collection is `srdStatBlockCollection`; it is SRD-only and enforces SRD 5.2.1 provenance at the collection boundary. The Core-free path must not read `@dnd/core` monster catalogs. CAM5 owns authoring the first SRD monster record into that collection.
8. Audit current `CPU*`/`PEA*`/`PPR*` call sites and identify what can be deleted immediately. Artifact: `plans/phase0-core-deletion-restore-audit.md`.
9. Record old-code references from baseline `39f9ab71` for every lane moved to the Restore Ledger. Artifact: `plans/phase0-core-deletion-restore-audit.md`.
10. Produce the runtime boundary/API artifact at `plans/phase0-runtime-boundary-api.md`, defining the package-level APIs and ownership boundaries for `@dnd/surface`, `@dnd/character-creation-runtime`, `@dnd/battle-runtime`, and the MCP runtime path.

Phase 0 exit criteria:

- checked-in Fighter/monster manifest at `plans/phase1-fighter-manifest.md`;
- checked-in Surface/Unit availability audit at `plans/phase0-surface-unit-availability.md`;
- Core/projected vocabulary call-site inventory at `plans/phase0-core-deletion-restore-audit.md`;
- checked-in runtime boundary/API artifact at `plans/phase0-runtime-boundary-api.md`;
- Correction action-resource sidecar baseline recorded;
- Restore Ledger additions for every intentionally broken lane;
- package/import cutover decision;
- concrete SRD UnitRecord collection artifact or tracked blocker.

Phase 1 may not start until these artifacts exist.

Do not run a broad Surface survey loop for the phase-1 MCP/runtime vertical
by default. Use the targeted Unit audit at
`plans/phase0-surface-unit-availability.md` against the exact Fighter/monster
manifest. If that audit finds a missing Surface shape or widening pressure
case, consult the existing `scripts/content-surface-survey/results-srd/<slug>/`
proposal first, then run only the narrow survey/red-green loop needed for that
Unit family.

## Phase 1: Character Creation Runtime

1. Create `@dnd/character-creation-runtime`.
2. Define creation draft state, holes, fills, batch fill result, and finalization result.
3. Consume actual decoded Units through a Unit library interface.
4. Implement level-1 Fighter holes with tiny supported option sets, not presets.
5. Add `character-creation-runtime-slice.qnt`.
6. Add MBT/parity against the runtime reducer.
7. Add deterministic tests for a complete level-1 Fighter and at least one invalid fill.

## Phase 2: Battle Runtime

1. Create `@dnd/battle-runtime`.
2. Define battle state, subjects, battle holes, filled values, and resolution result.
3. Implement battle init from battle-ready creature inputs projected from finalized Character Sheets and SRD monster Stat Blocks.
4. Implement discover acts for Attack and End Turn.
5. Implement Attack target/roll/damage replay.
6. Implement End Turn and initiative advancement.
7. Add `battle-runtime-slice.qnt`.
8. Add MBT/parity against the runtime reducer.
9. Add deterministic reducer tests for hit, miss, Temporary HP absorption, action spend, and end turn.

## Phase 3: MCP Green Surface

1. Wire MCP composition root to install the SRD UnitRecord collection.
2. Add MCP tools or adapt existing tools for:
   - create character draft;
   - discover creation holes;
   - fill creation holes;
   - finalize a supported Fighter;
   - select Stat Block creature;
   - start battle with caller-supplied Initiative scores;
   - discover battle acts;
   - fill/resolve battle holes;
   - end turn.
3. Add one MCP fixture test for the full vertical.

CAM18 carry-forward gates:

- Add minimal Goblin Warrior attack support from the authored Stat Block. The
  fixture is not Fighter-attacks-only.
- Audit battle durable state for stat-block and attack projection facts before
  widening battle support. Prefer identities plus runtime facts that cannot
  drift from Surface catalogs; avoid a second executable stat-block or attack IR.
- Use caller-supplied Initiative scores on `start_battle`; do not derive
  Initiative as `10 + modifier` and do not model Initiative as an in-battle act
  hole.
- Keep target legality scoped. Current discovery is all other combatants,
  acceptable only for the first 1v1 vertical before defeat until range, reach,
  line of effect, defeated-target filtering, and target legality are modeled.
- Track character-creation QNT parity depth. The current QNT slice checks
  hole/status protocol more deeply than finalized sheet values; before widening
  character creation beyond the first manifest, add parity for selected Unit
  refs, HP/Hit Die derivation, proficiencies, resources, and loadout identity.
- Reconcile temporary catalog/support-gate language as support widens:
  `UnitLibrary` aliases and package-private `unsupported*` issue vocabulary
  should disappear unless they remain real domain/runtime concepts.

## Phase 4: Controlled Core Break

After the phase-1/2 QNT tests exist, the promoted MCP server vertical fixture passes, and
every intentionally omitted projected lane has a Restore Ledger row with
`39f9ab71` references:

1. Move legacy Core-backed MCP routes/tests into a separate deletion-marked
   package before deleting projected code, so `@dnd/mcp` package tests describe
   the promoted runtime path instead of mixed legacy behavior.
2. Delete `CPU*`, `PEA*`, and `PPR*` projected execution code where no longer referenced.
3. Allow old app/Core routes outside the MCP/runtime vertical to fail only
   if they are in the Restore Ledger.
4. Keep local comments only as pointers to this plan; this plan is the source of truth.

## Phase 5: Green Reconciliation And MCP Promotion

`packages/mcp/src/green/` is a migration isolation lane, not the final MCP
architecture. It exists so the runtime vertical can be made
runnable while the legacy Core-backed `src/server.ts` path still exists.

After CAM19 isolates the Core-backed MCP path into a deletion-marked legacy
package and deletes unreferenced projected vocabulary, the next required step
is to reconcile the MCP runtime tools into the main MCP server path:

1. Promote the character creation, monster selection, battle
   start, battle act discovery, battle fill/resolve, and End Turn tools to the
   normal MCP server/router entrypoint.
2. Remove the deletion-marked legacy MCP package, or keep it only with explicit
   Restore Ledger coverage outside the promoted route.
3. Retire `src/green/` as a separate namespace once its tools are either moved
   into the main MCP path or reduced to ordinary composition helpers with no
   "green" naming.
4. Replace "green fixture" tests with normal MCP server tests over the promoted
   entrypoint.
5. Keep any still-omitted app/Core behavior only through Restore Ledger rows
   with restore conditions.

Green finalization criteria:

- no MCP tool path needed for the runnable Fighter/Goblin vertical imports
  `@dnd/core`;
- no `CPU*`, `PEA*`, `PPR*`, or projected executable vocabulary remains in the
  promoted MCP/runtime path;
- `packages/mcp/src/server.ts` or its replacement serves the
  vertical directly;
- `src/green/` no longer contains user-facing MCP tools, or the directory is
  deleted;
- normal MCP tests, not only green-specific tests, cover create/finalize
  character, select a Stat Block creature, start battle, Attack with damage,
  Goblin Warrior Attack with damage, and End Turn;
- docs stop describing the green path as the active way to use MCP and instead
  describe the promoted runtime path;
- temporary QNT authority is resolved per the Verification section's single
  battle-authority gate.

## Restore Ledger

Every omitted lane is wanted back after Correction application and app growth resumes.

CAM19A current-head refresh (`41a71d3dec664ab3a7036b5c02da7c6d41ac3670`):
the MCP runtime lane exists under `packages/mcp/src/green/` and has no
direct `@dnd/core` imports. The remaining Core-backed MCP files are now a
deletion-marked legacy isolation target for CAM19B, not shared infrastructure
for the promoted path. The detailed current inventory and CAM19B-CAM19D
checklist live in `plans/phase0-core-deletion-restore-audit.md`.

CAM20 promotion: the normal MCP server route is backed by the runtime packages through
`packages/mcp/src/server.ts`. The temporary `packages/mcp/src/green/` namespace
and deletion-marked `packages/mcp/src/legacy-core/` directory were removed from
the package. `@dnd/mcp` no longer depends on `@dnd/core`; omitted legacy Core
behavior remains preserved conceptually through the Restore Ledger rows below,
with baseline references pointing at pre-migration commits instead of retained
legacy files.

CAM20 closeout checks:

- RAW/SRD traceability: CAM20 promoted wiring, tests, and documentation without
  adding new modeled D&D rule behavior. The existing Fighter/Goblin vertical
  remains traced through the SRD-backed manifest, Surface records, and
  `UBIQUITOUS_LANGUAGE.md` terms such as Attack Roll, Initiative, Hit Points,
  and Damage Type.
- `/simplify` convergence: round 1 replaced remaining active green-path wording
  in this plan with promoted MCP/runtime terminology and added this closeout
  note; round 2 rechecked promoted MCP/runtime paths for `@dnd/core`,
  projected-executable vocabulary, `src/green`, and user-facing green naming
  and found no further important fixes.

CAM21 closeout: the first promoted end-user MCP vertical is accepted for Orc
Soldier Fighter 1 versus Goblin Warrior. The accepted post-battle handoff covers
reduced positive character HP through the durable character session and
`list_characters` read model. Zero-HP character closeout, Death Saving Throw
counters, Stable/dead status, rest recovery, and broader adventuring-state
handoff remain intentionally omitted and are preserved by the Restore Ledger row
below.

POST5 closeout: the first post-CAM widened MCP workflow is restored for Orc
Soldier Fighter 2 plus Orc Soldier Wizard 1 versus Skeleton. Promoted MCP tools
now cover real creation holes for both sheets, multi-character battle start from
finalized character identities plus selected Stat Block id, Fighter Action
Surge, Wizard `ray_of_frost` cantrip casting with no Spell Slot spend,
`magic_missile` slot spend, and Skeleton Bludgeoning vulnerability/Poison
immunity plus authored attack pressure. Remaining width stays ledgered below
rather than being represented by projected-executable vocabulary.

| Omitted lane                                | Baseline references                                                                                                                                                                                                                                                                   | Disabled/expected-failing checks                                                                                                                                                   | Promoted replacement check                                                                                                                   | Preserve conceptually                                                                                                                                       | Safe to omit now because                                                                                                                                                                | Restore condition                                                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full character creation width               | `git show 39f9ab71:packages/core/src/character-domain.ts`; `character-creation.qnt`; `character.qnt`                                                                                                                                                                                  | Old broad character lanes are omitted from the promoted gate                                                                                                                       | `@dnd/character-creation-runtime` plus promoted MCP tests cover Fighter 1, Fighter 2, and Wizard 1 first-width slice                         | Draft/sheet split, open choices vs illegal issues, level-1 creation distinct from advancement, higher-level starts via ordered advancement                  | First post-CAM width restores only Orc/Soldier Fighter and Wizard pressure cases                                                                                                        | UnitRecord-backed character runtime supports broad SRD choices                                                                                                |
| Level advancement and higher-level starts   | `git show 39f9ab71:packages/core/src/character-advancement.ts`; `git show 39f9ab71:packages/core/src/character-sheet-advancement.ts`                                                                                                                                                  | Old advancement lanes are omitted from the promoted gate                                                                                                                           | None in phase 1; explicit non-goal                                                                                                           | Ordered advancement replay, subclass/feat/ASI timing, multiclass prerequisites                                                                              | First MCP/runtime vertical is level-1 Fighter only                                                                                                                                      | `@dnd/character-creation-runtime` adds advancement reducer/QNT                                                                                                |
| Spellcasting and Mage/Wizard creation       | `git show 39f9ab71:packages/core/src/character-spellcasting.ts`; `git show 39f9ab71:packages/core/src/battle-spell-access.ts`                                                                                                                                                         | Old broad spellcasting/app spell paths are omitted from the promoted gate                                                                                                          | POST5 MCP workflow covers Wizard 1 spell access, `ray_of_frost` cantrip casting with no slot spend, and `magic_missile` slot spend           | Spell definition/access/invocation/effect distinction; prepared choices as character-owned facts                                                            | First width slice restores only selected Wizard 1 spells; upcasting, rituals, persistent effects, reactions, and broad spell catalog remain omitted                                     | UnitRecord-backed spell access holes and battle spell act holes cover broader spell families                                                                  |
| Old `available-actions.ts` breadth          | `git show 39f9ab71:packages/core/src/available-actions.ts`                                                                                                                                                                                                                            | Old action preview/finalize lanes are omitted from the promoted gate                                                                                                               | Runtime act discovery/resolution tests                                                                                                       | Discover/preview/finalize user-action workflows                                                                                                             | New runtime owns only promoted Attack/End Turn                                                                                                                                          | Runtime action protocol covers omitted action families structurally                                                                                           |
| Old Core battle MBT                         | `git show 39f9ab71:packages/core/src/battle-machine.mbt.test.ts`; `git show 39f9ab71:packages/core/src/battle-projection.mbt.test.ts`; `battle.qnt`                                                                                                                                   | Old Core battle MBT is outside the promoted gate                                                                                                                                   | `@dnd/battle-runtime` slice QNT/parity checks                                                                                                | Formal battle parity discipline, safety invariants, and broad reference traces                                                                              | Promoted `@dnd/battle-runtime` is the active semantic authority for new Unit/StatBlock-backed work; old-only behavior is BA inventory/restoration scope, not a competing canonical lane | `battle-runtime-slice.qnt` merges into/replaces old `battle.qnt`, or old Core MBT is quarantined as legacy reference and docs/tests name one battle authority |
| Old MCP Core-backed tools                   | `git show 39f9ab71:packages/mcp/src/server.ts`; `git show 39f9ab71:packages/mcp/src/server-control.ts`; `git show 39f9ab71:packages/mcp/src/start-battle.ts`                                                                                                                          | Core-backed MCP tools are deleted from the promoted package                                                                                                                        | Promoted MCP server vertical fixture                                                                                                         | Server-side stored workflows and tool ergonomics                                                                                                            | Promoted MCP tools now prove the replacement path                                                                                                                                       | MCP tools are rebuilt over Unit library, character runtime, and battle runtime                                                                                |
| Post-battle adventuring-state handoff       | `git show 39f9ab71:packages/core/src/machine-types.ts`; `git show 39f9ab71:packages/core/src/machine-startturn.ts`; `git show 39f9ab71:packages/core/src/machine-states.ts`; `UBIQUITOUS_LANGUAGE.md` Death Saving Throw, Stable, and Hit Points rows                                 | Zero-HP character closeout, Death Saving Throw counters, Stable/dead state, rest recovery, and broader adventuring-state handoff are omitted from the promoted MCP acceptance gate | Promoted MCP server vertical fixture covers reduced positive character HP after `end_battle`                                                 | Character-owned post-battle consequences beyond positive HP, including Death Saving Throw counters, Stable/dead status, and rest/adventuring recovery state | CAM21 accepts only the first vertical's reduced positive HP handoff; these facts require a broader adventuring-state boundary before durable character storage owns them                | Battle/runtime and character-session closeout support zero-HP/death-save/rest facts without duplicating runtime state                                         |
| App simulator and trace visualizers         | `git show 39f9ab71:packages/app/src/components/App.tsx`; `git show 39f9ab71:packages/app/src/components/trace-visualizer/TraceVisualizer.tsx`                                                                                                                                         | Old app routes are omitted from the promoted MCP/runtime gate                                                                                                                      | Promoted MCP server vertical fixture                                                                                                         | Debug and trace review workflows                                                                                                                            | MCP runtime path is the priority                                                                                                                                                        | New runtime exposes stable snapshots/traces                                                                                                                   |
| Advanced battle scene polish                | `git show 39f9ab71:packages/app/src/battle-scene/BattlePage.tsx`; `git show 39f9ab71:packages/core/src/battle-scene/director.ts`                                                                                                                                                      | Old battle UI checks are omitted from the promoted MCP/runtime gate                                                                                                                | Promoted MCP server vertical fixture                                                                                                         | Field rendering, narration, dice cues, visual replay                                                                                                        | MCP can validate runtime without full UI                                                                                                                                                | Battle runtime snapshot contract stabilizes                                                                                                                   |
| Spells and reactions                        | `git show 39f9ab71:packages/core/src/battle-machine-actions-spell.ts`; `git show 39f9ab71:packages/core/src/battle-machine-actions-spell-reaction.ts`                                                                                                                                 | Old spell/reaction lanes are omitted from the promoted gate                                                                                                                        | None in phase 1; explicit non-goal                                                                                                           | Reaction windows, spell access identity, slot spend/refund, concentration                                                                                   | Attack/End Turn vertical does not need them                                                                                                                                             | Battle runtime supports Unit spell acts and interrupt windows                                                                                                 |
| Monster legendary/recharge/daily controls   | `git show 39f9ab71:packages/core/src/monster-types.ts`; `git show 39f9ab71:packages/core/src/monster-catalog.ts`                                                                                                                                                                      | Old monster control lanes are omitted from the promoted gate                                                                                                                       | Promoted MCP tests cover Goblin Warrior and Skeleton SRD Stat Blocks, including Skeleton vulnerability/immunity and authored attack pressure | Monster provenance, Stat Block authored facts, resource controls                                                                                            | First width slice restores ordinary attacks plus Skeleton damage modifiers, not broad monster controls                                                                                  | Monster Stat Block projection uses a distinct authored Stat Block boundary, not `UnitRecord`                                                                  |
| Movement geometry and spatial actions       | `git show 39f9ab71:packages/core/src/battle-machine-actions-movement.ts`                                                                                                                                                                                                              | Old movement lanes are omitted from the promoted gate                                                                                                                              | None in phase 1; explicit non-goal                                                                                                           | Caller-owned spatial facts, movement budget, OA triggers                                                                                                    | First vertical has no movement                                                                                                                                                          | Battle runtime has spatial input boundary and movement QNT slice                                                                                              |
| Old projected execution vocabulary          | `git show 39f9ab71:packages/core/src/projected-executable.ts`; `git show 39f9ab71:packages/core/src/projected-compiler.ts`; `git show 39f9ab71:packages/core/src/projected-action-bridge.ts`; `git show 39f9ab71:packages/core/src/projected-persistent.ts`                           | Projected executable tests are deleted, omitted, or legacy-only                                                                                                                    | Surface structural interpretation tests                                                                                                      | Surface-authored semantics reach runtime without hardcoded unit ids                                                                                         | This vocabulary is the architecture being removed                                                                                                                                       | Do not restore as IR; restore only missing semantics directly through UnitRecords                                                                             |
| Projected prepared spell / Acid Splash lane | `git show 39f9ab71:packages/core/src/projected-action-bridge-prepared-spell.ts`; `git show 39f9ab71:packages/mcp/src/server-runtime.ts`; RAW: `.references/srd-5.2.1/Spells/Descriptions-A-D.md:20`, `:29`                                                                            | Acid Splash projected runtime tests are legacy-only                                                                                                                                | None in phase 1; explicit non-goal                                                                                                           | Save-gate + damage spell pressure; explicit runtime facts                                                                                                   | Fighter Attack action plus runtime end-turn command vertical does not include Acid Splash                                                                                               | UnitRecord-backed spell act holes exist                                                                                                                       |
| Second Wind battle action lane              | `git show 39f9ab71:packages/core/src/projected-creature-action-reducer.ts`; `git show 39f9ab71:packages/core/src/projected-action-context.ts`; RAW: `.references/srd-5.2.1/Classes/Fighter.md:31`, `:62`; manifest: `plans/phase1-fighter-manifest.md:26`                             | Feature projected action tests are omitted from the promoted gate                                                                                                                  | Character finalization preserves Second Wind as a level-1 sheet/resource fact                                                                | Class feature action and resource pressure                                                                                                                  | First battle runtime slice does not exercise the Bonus Action healing act                                                                                                               | Runtime supports UnitRecord-backed Second Wind battle action holes                                                                                            |
| Action Surge projected lane                 | `git show 39f9ab71:packages/core/src/projected-battle-action-reducer.ts`; `git show 39f9ab71:packages/core/src/projected-action-context.ts`                                                                                                                                           | Action Surge projected tests are omitted from the promoted gate                                                                                                                    | POST5 MCP workflow resolves UnitRecord-backed Fighter 2 Action Surge through `resolve_battle_act`                                            | Class feature extra-action pressure                                                                                                                         | Action Surge is restored without projected vocabulary; higher-level/two-use scaling remains outside the first width slice                                                               | Runtime supports broader UnitRecord-backed class feature action holes                                                                                         |
| Mage Armor projected persistent lane        | `git show 39f9ab71:packages/core/src/projected-persistent.ts`; `git show 39f9ab71:packages/core/src/battle-init-creature-config.ts`; `git show 39f9ab71:packages/core/src/character-sheet-derived.ts`; RAW: `.references/srd-5.2.1/Spells/Descriptions-M-P.md:5`, `:14`               | Persistent projection and AC override tests are omitted from the promoted gate                                                                                                     | None in phase 1; explicit non-goal                                                                                                           | Base AC override plus early-end lifecycle                                                                                                                   | First MCP/runtime vertical does not include Mage Armor                                                                                                                                  | Runtime supports UnitRecord-backed persistent effects/lifecycle                                                                                               |
| App character creation UI                   | `git show 39f9ab71:packages/app/src/components/character-creation/CharacterCreationPage.tsx`; `git show 39f9ab71:packages/app/src/components/character-creation/OpenChoicePicker.tsx`; `git show 39f9ab71:packages/app/src/components/character-creation/characterCreationPresets.ts` | App character creation tests/build are omitted from the promoted MCP/runtime gate                                                                                                  | Promoted MCP server vertical fixture                                                                                                         | Step UI and open-choice display workflow                                                                                                                    | MCP runtime path is the priority                                                                                                                                                        | App consumes new character runtime                                                                                                                            |

## Verification

Required before marking this plan complete:

1. RAW agent check: before implementing each phase-1 rule, read the relevant SRD passage in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md`. Each modeled rule must trace to SRD 5.2.1 or ASSUMPTIONS.md. If implementation requires a new interpretation or narrower phase-1 modeling choice not directly stated by SRD, stop and add/obtain an ASSUMPTIONS.md entry before coding.
2. Character runtime QNT/parity passes.
3. Battle runtime QNT/parity checks pass.
4. MCP full vertical test passes.
5. Typecheck passes for the runtime packages and MCP.
6. Circular dependency check passes for new package graph.
7. Promoted-path dependency check proves neither runtime package nor MCP tools import `@dnd/core`.
8. Before completion, restore a single battle authority. This is now tracked by
   the BA0-BA13 Battle Authority Reconciliation queue in
   `plans/ACTIVE_PLAN.md`: either merge/promote `battle-runtime-slice.qnt`,
   replace/retire the old authority and update project documentation, or record
   each intentional divergence from old `battle.qnt` with an SRD 5.2.1 citation
   or ASSUMPTIONS.md entry.
9. Command-level verification is added once packages exist, using `pnpm` only. Battle MBT must follow the repo MBT run protocol, including zombie evaluator checks before the run. Typecheck scope must include MCP and the new runtime packages.
10. Documentation stays synchronized with code changes. Tasks that change reducer behavior, shared algebras, action resources, hole/fill semantics, Surface record boundaries, or runtime package architecture must update the docs owned by the changed package in the same change. Battle runtime changes update `packages/battle-runtime/README.md` and `packages/battle-runtime/ARCHITECTURE_GRAPH.md`; character-creation changes update `packages/character-creation-runtime/README.md` and package vocabulary; shared algebra changes update `packages/shared-algebras` docs or package-local MBT docs. `packages/surface-runtime-correction/*` docs are legacy source material unless the task intentionally edits that package.
11. `/simplify` convergence: minimum two rounds after implementation, continuing until no important fixes remain.

## Explicit Non-Goals For Phase 1

- Full Core compatibility.
- Full app compatibility.
- Full character creation width.
- Wizard/Mage.
- Spells.
- Fighter level 2 / Action Surge.
- Higher-level starts.
- Full monster catalog execution.
- Full battle parity with old `battle.qnt`.
- Any new executable IR.
- Reintroducing a temporary MCP namespace as a final MCP route.
