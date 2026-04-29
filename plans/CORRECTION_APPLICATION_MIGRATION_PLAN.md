# Correction Application Migration Plan

Status: draft for implementation planning  
Baseline restore reference: `master` at `39f9ab71`  
Goal: controlled Core breakage in favor of Surface/Unit-driven character creation and battle runtime, with a runnable MCP vertical.

## Decision Summary

Use controlled breakage, not a strangler migration and not a full rewrite.

The first green surface is:

1. MCP creates a minimal level-1 Fighter through real character-creation holes.
2. Character creation consumes actual decoded Surface Units wherever the authored Unit exists.
3. MCP selects one SRD monster Stat Block and projects it to a battle-ready creature input.
4. MCP starts battle.
5. MCP discovers battle acts.
6. MCP resolves core Attack with damage through battle holes.
7. MCP resolves End Turn.

Anything outside this green surface may break temporarily, but it must be listed in the Restore Ledger below. The migration must not silently erase knowledge.

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

| Package                           | Responsibility                                                                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@dnd/surface`                    | Surface schemas, `UnitRecord` types, decode helpers, structural predicates/readers. This may start as promoted/renamed `@dnd/prototype-content-surface`. |
| `@dnd/character-creation-runtime` | Minimal level-1 Fighter creation reducer: draft holes, batch fills, validation, finalization/projection to battle-ready input.                           |
| `@dnd/battle-runtime`             | Minimal battle reducer: battle state, subjects, battle holes, fills, Attack with damage, End Turn, local QNT slice and MBT.                              |
| future `@dnd/srd-units`           | SRD-only authored Unit collection. Do not create in phase 1 unless imports force it.                                                                     |

New green-path packages must have this dependency direction only:

```text
@dnd/surface <- @dnd/character-creation-runtime
@dnd/surface <- @dnd/battle-runtime
@dnd/character-creation-runtime <- @dnd/mcp
@dnd/battle-runtime <- @dnd/mcp
```

Neither runtime package may depend on `@dnd/core`. MCP green-surface tools must not import `@dnd/core`; any legacy MCP/Core imports must be isolated outside the green tool path and listed in the Restore Ledger if they are allowed to break.

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
- supported reducer subset;
- existing character formal semantics where applicable.

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

- core `attack`;
- core `endTurn`.

Phase 1 battle holes:

- target choice;
- attack roll;
- damage input for the selected attack's SRD damage expression. For character weapon attacks, the Unit/loadout supplies weapon damage dice, damage type, and applicable ability/modifier facts; the hole supplies the damage roll result unless a specific SRD rule provides fixed damage. For SRD monster Stat Block attacks, the projection may use the Stat Block's authored damage expression/average only as encoded from SRD 5.2.1 provenance.

Phase 1 battle state:

- combatant identity;
- initiative/current actor;
- HP/max HP/temp HP;
- AC;
- action availability;
- death policy derived from participant source, preserving the Character Sheet vs Stat Block boundary without making combat rules branch on "PC" vs "monster";
- battle-ready creature combat facts projected from Character Sheets and monster Stat Blocks.

Battle-ready inputs are runtime seed data only: combatant identity, current resources, selected equipment/Unit references, and numeric facts needed to initialize battle state. They must not encode executable action/effect semantics already present in decoded Surface Units. If a runtime needs authored semantics, pass the decoded Unit or a narrowed reader over it, not a duplicated projection record.

Core Attack must include damage. Hit/miss-only attack is not enough for the green MCP vertical.

Phase 1 chooses one damage protocol for the vertical and names it in the battle hole type. The default protocol is dice-result fill for character weapon attacks. Deterministic tests must cover hit, miss, temp HP absorption, HP floor at 0, monster dead/defeated status, and the selected Character Sheet participant behavior at 0 HP. Death policy must follow ASSUMPTIONS.md A12 for supported combatants: monsters die immediately at 0 HP; player characters enter the 0-HP/death-save track when applicable. Any narrower phase-1 handling requires an explicit ASSUMPTIONS.md entry before implementation.

## QNT Plan

Create local reducer-shaped QNT specs next to their runtime packages:

- `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- `packages/battle-runtime/battle-runtime-slice.qnt`

Character creation QNT should model the phase-1 hole/fill reducer protocol and import/reuse broad `character-creation.qnt` concepts where practical. It may be a small composition/algebra spec rather than a fork of all character semantics.

Battle QNT should model only the green surface:

- initiative/current actor/end turn;
- combatants with HP/temp HP/AC/action availability;
- Attack subject;
- target/attack-roll/damage holes;
- AC hit/miss;
- action spend;
- HP damage with temp HP absorption and clamp;
- minimal death policy.

These QNT specs are temporary seeds, not throwaways. The battle slice must eventually become, merge into, or replace old `battle.qnt`, and documentation must be updated so the repo has one battle authority again.

During Phase 1/2, `battle-runtime-slice.qnt` is authoritative only for the green `@dnd/battle-runtime` surface. Existing `battle.qnt` remains authoritative for old Core lanes until those lanes are disabled or deleted and entered in the Restore Ledger. Any behavior shared by both specs must either match or have an explicit tracked divergence. Before declaring one battle authority again, merge/replace the slice and update the old MBT gate accordingly.

## Phase 0: Audit And Preconditions

1. Fix the current Correction action-economy test drift or explicitly move the fix to a tracked side-car job before depending on that algebra.
2. Decide the Surface package strategy: either rename `@dnd/prototype-content-surface` to `@dnd/surface` or create `@dnd/surface` as the exported facade. Record the chosen package name and update green-path imports.
3. Create the concrete SRD-only Unit collection artifact used by MCP. `srdUnitCollection` must be a real import before Phase 3, and duplicate-id/provenance validation must exist at `buildUnitLibrary`.
4. Produce a `phase1-fighter-manifest.md` listing the exact selected background, species, ability-score method/values, languages, alignment representation, Fighting Style, weapons, armor, shield, and monster. For each item, record the SRD 5.2.1 reference file/section and the Unit id if already authored; otherwise add the minimum Unit authoring task before reducer implementation.
5. Audit which level-1 Fighter creation facts already exist as authored Surface Units.
6. Author the missing minimum SRD Units needed for the green surface from `.references/srd-5.2.1/` only. Each shipped SRD Unit must carry SRD 5.2.1 provenance, and the SRD collection type/builder must make mixed-provenance or mixed-license collections unrepresentable. External structured data may be used only as import/normalization input, never as provenance.
7. Before Phase 2, define the minimum SRD monster/stat-block Surface collection boundary for exactly one SRD monster, including provenance. If this is not a `UnitRecord`, name the distinct SRD Stat Block type and keep it separate from authored Units. The green path must not read `@dnd/core` monster catalogs.
8. Audit current `CPU*`/`PEA*`/`PPR*` call sites and identify what can be deleted immediately.
9. Record old-code references from baseline `39f9ab71` for every lane moved to the Restore Ledger.

Phase 0 exit criteria:

- checked-in Fighter/monster manifest;
- Core/projected vocabulary call-site inventory;
- Correction action-economy drift decision;
- Restore Ledger additions for every intentionally broken lane;
- package/import cutover decision;
- concrete SRD Unit collection artifact or tracked blocker.

Phase 1 may not start until these artifacts exist.

Do not run a broad Surface survey loop for the phase-1 green surface by default. Use a targeted Unit audit against the exact Fighter/monster manifest. If that audit finds a missing Surface shape or widening pressure case, consult the existing `scripts/content-surface-survey/results-srd/<slug>/` proposal first, then run only the narrow survey/red-green loop needed for that Unit family.

## Phase 1: Character Creation Runtime

1. Create `@dnd/character-creation-runtime`.
2. Define creation draft state, holes, fills, batch fill result, finalization result, and battle-ready projection.
3. Consume actual decoded Surface Units through a Unit library interface.
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
9. Add deterministic reducer tests for hit, miss, temp HP absorption, action spend, and end turn.

## Phase 3: MCP Green Surface

1. Wire MCP composition root to install the SRD Unit collection.
2. Add MCP tools or adapt existing tools for:
   - create character draft;
   - discover creation holes;
   - fill creation holes;
   - finalize minimal Fighter;
   - select/create monster;
   - start battle;
   - discover battle acts;
   - fill/resolve battle holes;
   - end turn.
3. Add one MCP fixture test for the full vertical.

## Phase 4: Controlled Core Break

After the phase-1/2 QNT and MCP tests exist:

1. Disable or delete conflicting promoted old lanes.
2. Delete `CPU*`, `PEA*`, and `PPR*` projected execution code where no longer referenced.
3. Allow old app/Core routes outside the green surface to fail only if they are in the Restore Ledger.
4. Keep local comments only as pointers to this plan; this plan is the source of truth.

## Restore Ledger

Every omitted lane is wanted back after Correction application and app growth resumes.

| Omitted lane                              | Baseline references                                                                                                                                                                                                                                         | Disabled/expected-failing checks                                   | Green replacement check                                    | Preserve conceptually                                                                                                                      | Safe to omit now because                              | Restore condition                                                                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full character creation width             | `git show 39f9ab71:packages/core/src/character-domain.ts`; `character-creation.qnt`; `character.qnt`                                                                                                                                                        | Old broad character tests may be excluded from green gate          | `@dnd/character-creation-runtime` Fighter slice QNT/parity | Draft/sheet split, open choices vs illegal issues, level-1 creation distinct from advancement, higher-level starts via ordered advancement | Phase 1 proves only level-1 Fighter holes             | Surface Unit-backed character runtime supports broad SRD choices                                                                                                        |
| Level advancement and higher-level starts | `git show 39f9ab71:packages/core/src/character-advancement.ts`; `git show 39f9ab71:packages/core/src/character-sheet-advancement.ts`                                                                                                                        | Old advancement tests may be excluded from green gate              | None in phase 1; explicit non-goal                         | Ordered advancement replay, subclass/feat/ASI timing, multiclass prerequisites                                                             | First green surface is level-1 Fighter only           | `@dnd/character-creation-runtime` adds advancement reducer/QNT                                                                                                          |
| Spellcasting and Mage/Wizard creation     | `git show 39f9ab71:packages/core/src/character-spellcasting.ts`; `git show 39f9ab71:packages/core/src/battle-spell-access.ts`                                                                                                                               | Old spellcasting/app spell paths may fail                          | None in phase 1; explicit non-goal                         | Spell definition/access/invocation/effect distinction; prepared choices as character-owned facts                                           | Fighter-only vertical avoids spell access and slots   | Surface Unit-backed spell access holes and battle spell act holes exist                                                                                                 |
| Old `available-actions.ts` breadth        | `git show 39f9ab71:packages/core/src/available-actions.ts`                                                                                                                                                                                                  | Old action preview/finalize tests may be excluded from green gate  | Runtime act discovery/resolution tests                     | Discover/preview/finalize user-action workflows                                                                                            | New runtime owns only promoted Attack/End Turn        | Runtime action protocol covers omitted action families structurally                                                                                                     |
| Old Core battle MBT                       | `git show 39f9ab71:packages/core/src/battle-machine.mbt.test.ts`; `git show 39f9ab71:packages/core/src/battle-projection.mbt.test.ts`; `battle.qnt`                                                                                                         | Old Core battle MBT may be outside green gate during breakage      | `@dnd/battle-runtime` slice QNT/MBT                        | Formal battle parity discipline and safety invariants                                                                                      | New battle authority is being seeded separately       | `battle-runtime-slice.qnt` merges into/replaces old `battle.qnt`, and docs/tests name one battle authority                                                              |
| Old MCP Core-backed tools                 | `git show 39f9ab71:packages/mcp/src/server.ts`; `git show 39f9ab71:packages/mcp/src/server-control.ts`; `git show 39f9ab71:packages/mcp/src/start-battle.ts`                                                                                                | Core-backed MCP tools outside green path may fail                  | MCP green vertical fixture                                 | Server-side stored workflows and tool ergonomics                                                                                           | Green tools prove the new runtime path first          | MCP tools are rebuilt over Unit library, character runtime, and battle runtime                                                                                          |
| App simulator and trace visualizers       | `git show 39f9ab71:packages/app/src/components/App.tsx`; `git show 39f9ab71:packages/app/src/components/trace-visualizer/TraceVisualizer.tsx`                                                                                                               | Old app routes may fail                                            | MCP green vertical fixture                                 | Debug and trace review workflows                                                                                                           | MCP green surface is the priority                     | New runtime exposes stable snapshots/traces                                                                                                                             |
| Advanced battle scene polish              | `git show 39f9ab71:packages/app/src/battle-scene/BattlePage.tsx`; `git show 39f9ab71:packages/core/src/battle-scene/director.ts`                                                                                                                            | Old battle UI checks may fail                                      | MCP green vertical fixture                                 | Field rendering, narration, dice cues, visual replay                                                                                       | MCP can validate runtime without full UI              | Battle runtime snapshot contract stabilizes                                                                                                                             |
| Spells and reactions                      | `git show 39f9ab71:packages/core/src/battle-machine-actions-spell.ts`; `git show 39f9ab71:packages/core/src/battle-machine-actions-spell-reaction.ts`                                                                                                       | Old spell/reaction tests may be excluded from green gate           | None in phase 1; explicit non-goal                         | Reaction windows, spell access identity, slot spend/refund, concentration                                                                  | Attack/End Turn vertical does not need them           | Battle runtime supports Surface Unit spell acts and interrupt windows                                                                                                   |
| Monster legendary/recharge/daily controls | `git show 39f9ab71:packages/core/src/monster-types.ts`; `git show 39f9ab71:packages/core/src/monster-catalog.ts`                                                                                                                                            | Old monster control tests may be excluded from green gate          | One SRD Stat Block battle fixture                          | Monster provenance, Stat Block authored facts, resource controls                                                                           | One basic monster can fight with ordinary attack only | Monster Stat Block projection is Surface-backed where monster Stat Blocks are represented as authored Units; otherwise preserve Stat Block as authored monster boundary |
| Movement geometry and spatial actions     | `git show 39f9ab71:packages/core/src/battle-machine-actions-movement.ts`                                                                                                                                                                                    | Old movement tests may be excluded from green gate                 | None in phase 1; explicit non-goal                         | Caller-owned spatial facts, movement budget, OA triggers                                                                                   | First vertical has no movement                        | Battle runtime has spatial input boundary and movement QNT slice                                                                                                        |
| Old projected execution vocabulary        | `git show 39f9ab71:packages/core/src/projected-executable.ts`; `git show 39f9ab71:packages/core/src/projected-compiler.ts`; `git show 39f9ab71:packages/core/src/projected-action-bridge.ts`; `git show 39f9ab71:packages/core/src/projected-persistent.ts` | Projected executable tests should be deleted or marked legacy-only | Surface structural interpretation tests                    | Surface-authored semantics reach runtime without hardcoded unit ids                                                                        | This vocabulary is the architecture being removed     | Do not restore as IR; restore only missing semantics directly through Surface Units                                                                                     |

## Verification

Required before marking this plan complete:

1. RAW agent check: before implementing each phase-1 rule, read the relevant SRD passage in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md`. Each modeled rule must trace to SRD 5.2.1 or ASSUMPTIONS.md. If implementation requires a new interpretation or narrower phase-1 modeling choice not directly stated by SRD, stop and add/obtain an ASSUMPTIONS.md entry before coding.
2. Character runtime QNT/parity passes.
3. Battle runtime QNT/MBT passes.
4. MCP full vertical test passes.
5. Typecheck passes for the green surface packages and MCP.
6. Circular dependency check passes for new package graph.
7. Green-path dependency check proves neither runtime package nor MCP green tools import `@dnd/core`.
8. Before completion, restore a single battle authority: either merge `battle-runtime-slice.qnt` into `battle.qnt`, replace/retire the old authority and update project documentation, or record each intentional divergence from old `battle.qnt` with an SRD 5.2.1 citation or ASSUMPTIONS.md entry.
9. Command-level verification is added once packages exist, using `pnpm` only. Battle MBT must follow the repo MBT run protocol, including zombie evaluator checks before the run. Typecheck scope must include MCP and the new runtime packages.
10. `/simplify` convergence: minimum two rounds after implementation, continuing until no important fixes remain.

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
