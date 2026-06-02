# Moonbeam Shape-Shift Reversion Design

Task: QRFR-C11-MOONBEAM-SHAPESHIFT-DESIGN

## RAW and Language Anchors

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`, Moonbeam: a failed Constitution Saving Throw deals Radiant damage, and if the creature is shape-shifted it reverts to true form and cannot shape-shift until it leaves the Cylinder. A successful save takes half damage only. The same save trigger applies when the Cylinder appears, moves into a creature's space, a creature enters it, or a creature ends its turn there, once per creature per turn.
- `.references/srd-5.2.1/Rules-Glossary.md`, Shape-Shifting: the effect that lets a creature shape-shift specifies what happens to the creature, ongoing effects carry over unless that effect says otherwise, and the creature reverts to true form if it dies.
- `UBIQUITOUS_LANGUAGE.md`: use Spell Effect for runtime spell state, Apply for state changes after resolution, Saving Throw for the d20 roll, Damage Type for Radiant, Area of Effect for the Cylinder, and Stat Block for monster or Beast-form combat facts.

## Existing Facts Search

Searches performed before proposing fields:

- `rg -n "shapeShift|ShapeShift|shape-shift|shapeshift|wildShape|WildShape|polymorph|Polymorph|trueForm|revert|restore" packages/battle-runtime packages/shared-algebras packages/surface`
- `rg -n "spellTransformationActiveEffect|statBlockShapechangerRuntime|BattleShapeShiftSource|shapeShiftedRuntimeState\\(|BattleShapeShiftReversionOwner|BattleShapeShiftedRuntimeState|unsupportedShapeShiftSource" packages/battle-runtime/src packages/battle-runtime/*.qnt`
- `rg -n "revert_shape_shift_to_true_form|suppress_shape_shifting|ShapeShiftFormSource|ShapeShiftRevertTrigger" packages/surface/src packages/surface/content`
- `rg -n "Polymorph|polymorph|Shapechanger|shapechanger|druid_wild_shape|Wild Shape" packages/surface/content packages/surface/src packages/battle-runtime/src packages/battle-runtime/*.qnt`

Findings:

- Surface content already carries the Moonbeam source facts: `revert_shape_shift_to_true_form`, `suppress_shape_shifting_while_in_area`, and the conditional `onlyIfTargetIsShapeShifted`. These are authored source facts, not runtime restoration facts.
- `packages/battle-runtime/src/battle-reducer/shape-shifting.ts` derives executable shape-shift state from active battle state. Today it can derive only Druid Wild Shape because `battleShapeShiftedRuntimeState` reads `activeDruidWildShape(combatant)`.
- Druid Wild Shape restoration already has an executable owner: `druidWildShapeForm` active effect plus `revertDruidWildShapeForm`, which removes that active effect from the combatant. True-form projections are already derived from absence of the active effect.
- `spellTransformationActiveEffect` and `statBlockShapechangerRuntime` exist only as synthetic follow-up variants in `shape-shifting.ts` tests and in `battle-runtime-shape-shifting.qnt`; no active battle admission or reducer path constructs them from real spell or stat-block runtime state.
- `battle-runtime-moonbeam-movable-zone.qnt`, `moonbeam-movable-zone.ts`, and their MBT drivers contain local synthetic unsupported Moonbeam shape-shift states. Those states are the under-modeled no-op branch identified by QRF-3.

No new runtime field is needed for current admitted behavior. Existing Druid Wild Shape active-effect state is the canonical restoration owner.

## Source Boundaries

- Provenance: SRD 5.2.1 is the source for Moonbeam, Shape-Shifting, Druid Wild Shape, Polymorph, and any SRD stat-block shapechanger text. 5e-tools or other structured inputs must not be recorded as provenance.
- Structured input: Surface spell, class feature, and stat-block JSON records may describe transform effects, forms, and source references for import and support-profile parsing.
- Runtime projection: battle runtime may consume only executable facts: "this combatant is shape-shifted", the replacement-form projection used by combat rules, and a restoration owner that can apply true-form reversion without dispatching on authored identity.

Do not add a provenance or authored id field to make Moonbeam work. Moonbeam should call the shared shape-shift reversion operation and then mark Moonbeam suppression when the reversion result is executable.

## Runtime Design Decision

Make unsupported shape-shift sources unrepresentable in admitted runtime projection until their source owners are promoted.

Current admitted source:

- Druid Wild Shape class-feature shape-shift.
- Runtime facts: active `druidWildShapeForm` effect, `sourceCombatantId`, `sourceUnitId`, `formStatBlockId`, replacement-form projections derived through `activeDruidWildShape`, and `revertDruidWildShapeForm`.
- Moonbeam action on failed save: apply damage, call shared reversion, remove the active Wild Shape effect, then add Moonbeam suppression for the target until Cylinder exit or spell cleanup.

Not currently admitted:

- Polymorph, True Polymorph, Animal Shapes, magic-item casts of Polymorph, and spell-effect transformations.
- SRD stat-block shapechanger actions from familiar forms or monsters.

These should not appear as ordinary `shapeShifted` runtime states in Moonbeam until they carry restoration owners. If a future feature admits them, admission must create a precise restoration owner at the same time.

## Task 12 Implementation Handoff

Exact QNT changes:

1. In `packages/battle-runtime/battle-runtime-shape-shifting.qnt`, split the type vocabulary:
   - Keep source vocabulary only if needed for future structured tests: `ClassFeatureShapeShiftSource`, `SpellEffectShapeShiftSource`, `StatBlockShapechangerSource`, and `ShapeShiftSource`.
   - Replace executable `ShapeShiftedRuntimeState` with only:
     - `TrueForm`
     - `ClassFeatureShapeShifted({ source: ClassFeatureShapeShiftSource, replacementForm: ShapeShiftedReplacementFormFacts })`
   - Remove `SpellEffectShapeShifted` and `StatBlockShapechangerShapeShifted` from the executable runtime state union.
   - Replace `ShapeShiftReversionResult` with a total executable result that has no unsupported branch and cannot carry a shifted state after reversion:
     - `ShapeShiftAlreadyTrueForm`
     - `ShapeShiftRevertedToTrueForm`
   - Delete `shapeShiftStateAfterSupportedReversion`; its name encodes the obsolete supported/unsupported split. If a helper remains, name it `shapeShiftStateAfterReversion` and make it return `TrueForm` for both `ShapeShiftAlreadyTrueForm` and `ShapeShiftRevertedToTrueForm`.
   - Delete the run blocks that assert spell/stat-block sources are unsupported no-ops. Replace them with a run block proving every `ShapeShiftedRuntimeState` branch is reversible.

2. In `packages/battle-runtime/battle-runtime-moonbeam-movable-zone.qnt` and `packages/battle-runtime/src/battle-reducer/moonbeam-movable-zone.ts`, remove local unsupported state variants:
   - Remove `MoonbeamUnsupportedSpellShapeShifted`.
   - Remove `MoonbeamUnsupportedStatBlockShapechanger`.
   - Keep only `trueForm`, `supportedShapeShifted`, and `shapeShiftSuppressedTrueForm` in the focused synthetic driver shape, or rename `supportedShapeShifted` to `shapeShifted` because it is the only admitted executable shifted state.
   - Update MBT driver actions to stop generating unsupported shifted states.

3. In `packages/battle-runtime/battle-runtime-ground-command.qnt`, make `resolveMoonbeamShapeShiftRider` total over admitted `ShapeShiftedRuntimeState`:
   - On successful save, leave state unchanged.
   - On failed save and `ShapeShiftAlreadyTrueForm`, return true form without marking suppression.
   - On failed save and `ShapeShiftRevertedToTrueForm`, mark Moonbeam shape-shift suppression and return `TrueForm`.
   - Remove `UnsupportedShapeShiftSource(_)` handling.

Exact TypeScript changes:

1. In `packages/battle-runtime/src/battle-reducer/shape-shifting.ts`:
   - Remove `spellEffect` and `statBlockShapechanger` from `BattleShapeShiftSource` until their owners are promoted.
   - Remove `spellTransformationActiveEffect` and `statBlockShapechangerRuntime` from `BattleShapeShiftReversionOwner`.
   - Collapse `BattleShapeShiftRuntimeOwner` to the Druid Wild Shape class-feature owner, or keep it as a single object type named for executable class-feature shape-shift ownership.
   - Remove `unsupportedShapeShiftSource` from `BattleShapeShiftReversionResult`.
   - Make `revertShapeShiftedRuntimeState` total for admitted `shapeShifted` states: missing combatant remains a typed failure; otherwise return `revertedToTrueForm` with the updated `BattleState` and no shape-state payload.
   - Keep `missingCombatant` because stale state is an ordinary runtime/session failure, distinct from unsupported source modeling.

2. In `packages/battle-runtime/src/shape-shifting.test.ts`:
   - Delete synthetic spell/stat-block admission tests.
   - Add or keep tests that active Druid Wild Shape projects as `shapeShifted` and `revertShapeShiftedRuntimeState` returns `reverted`.
   - Keep the missing-combatant test in `battle-runtime-druid-wild-shape.test.ts`.

3. In `packages/battle-runtime/src/battle-reducer/moonbeam-movable-zone.ts` and `packages/battle-runtime/src/moonbeam-movable-zone.mbt.test.ts`:
   - Remove unsupported states and generated actions.
   - Ensure failed save from the sole admitted shifted state transitions to suppressed true form; successful save leaves shifted state unchanged.

4. In `packages/battle-runtime/src/battle-reducer/turn-end-movement.ts`:
   - `applyMoonbeamShapeShiftRider` should continue to ignore `trueForm` and `missingCombatant`.
   - Since unsupported source is unrepresentable, there should be no unsupported branch to ignore.

Admission rule for future promoted sources:

- A future spell-effect transformation may enter `BattleShapeShiftedRuntimeState` only after its active effect stores a restoration owner that can end or update that effect and restore all source-owned projections. Candidate minimal facts are `sourceCombatantId`, `sourceSpellId`, `targetCombatantId`, the concrete active-effect identity, replacement-form projection, and the source-owned ending/restoration operation.
- A future stat-block shapechanger may enter `BattleShapeShiftedRuntimeState` only after stat-block runtime state stores the current form and true-form restoration operation without dispatching on the stat-block's authored name. Candidate minimal facts are `sourceCombatantId`, current form projection, and a stat-block-owned restoration operation.
- Do not admit either source by adding only an id or a status enum. That would recreate the unsupported no-op state.

## Verification for Task 12

- RAW and ubiquitous-language check: re-read the Moonbeam, Shape-Shifting, and promoted source passages. If Task 12 does not promote spell/stat-block sources, only Druid Wild Shape and Moonbeam need implementation parity checks.
- Focused tests:
  - `pnpm --filter @dnd/battle-runtime exec vitest run src/shape-shifting.test.ts src/unit-profile-admission-moonbeam.test.ts src/moonbeam-movable-zone.mbt.test.ts`
  - `pnpm --filter @dnd/battle-runtime test:qnt-proofs`
  - `pnpm check:mbt-driver-closure`
- Broad diagnostic gate after focused checks pass: `pnpm quality`.
- Battle MBT is appropriate only if Task 12 changes integrated battle-runtime behavior beyond the focused Moonbeam and shape-shifting tests. If run, use the repository MBT timing/background protocol.

## Reviewer Loop Notes

- RAW traceability: the design follows Moonbeam's failed-save rider and the glossary statement that shape-shift source descriptions own restoration behavior.
- Domain language: the design keeps authored source identity, structured Surface transform input, and runtime restoration projection separate.
- Architecture and connascence: the strong coupling is between "shape-shifted" and "has executable true-form restoration". The fix weakens distant meaning coupling by making unsupported shifted states unrepresentable in executable runtime state.
- Code review: the next implementation should reject any ordinary unsupported no-op branch under Moonbeam failed-save reversion.
