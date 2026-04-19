# EPT3 - Quint Projected Executable And Persistent Subsets

## Purpose

This file records the closed Quint-side subset for the executable-projection
tracer bullet.

The Quint owner is
[projected-executable.qnt](/workspace/typescript/dnd/projected-executable.qnt).
It complements the scope freeze in
[plans/EXECUTABLE_PROJECTION_FIRST_SLICE_SCOPE.md](/workspace/typescript/dnd/plans/EXECUTABLE_PROJECTION_FIRST_SLICE_SCOPE.md)
and defines the contract the TS mirror must keep in sync with.

## RAW And Terminology Check

Reviewed against:

- [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)
- [Acid Splash RAW](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md:20)
- [Mage Armor RAW](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md:5)
- [Second Wind RAW](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Fighter.md:62)
- [Action Surge RAW](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Fighter.md:76)
- [Turn Structure](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:501)
- [Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:320)
- [Magic Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md:700)

## Closed Quint Subset

Executable surface:

- `ProjectedExecutableAction` is now a direct action union, not a graph.
- The closed executable variants are:
  - `PEASaveGateDamage`
  - `PEADirectHealHp`
  - `PEADirectGrantExtraAction`
- Every executable variant carries only:
  - `source`
  - `activationCost`
  - `resourceGate`
  - `usageLimit`
  - `attachment`
  - plus the variant-specific payload needed at resolution time
- `ProjectedExecutableAttachment` remains closed to `self`, `one_target`, and
  the specific `area_sphere_point_within_range` record needed to keep Acid
  Splash's `rangeFeet` and `radiusFeet` distinct.
- `ProjectedSaveDc`, `ProjectedGrantedActionRestriction`,
  `ProjectedActivationCost`, `ProjectedUsageLimit`, `ProjectedResourceCap`, and
  `ProjectedResetCadence` are all closed variants rather than open strings.

Persistent surface:

- `ProjectedPersistentRecord` remains closed to one record kind: `PPRSetBaseAc`.
- Unlike the earlier graph-era subset, the payload now carries the authored
  persistent semantics directly:
  - `source`
  - `attachment`
  - `baseArmorClass`
  - `abilityModifier`
  - `earlyEnds`
- Mage Armor's fixed semantics are no longer modeled as module-level Quint
  constants. They ride in the record payload, matching the TS mirror.

Resource and usage surface:

- `ProjectedResourceGate` is closed to `none` or `use_count`.
- `use_count` carries the exact threshold-tier cap and reset cadence shapes
  frozen in EPT1.
- `ProjectedUsageLimit` is closed to `none` or `once_per_turn`.

## Mapping Notes

### `acid_splash`

Authored source:
[packages/prototype-content-surface/content/acid_splash.json](/workspace/typescript/dnd/packages/prototype-content-surface/content/acid_splash.json)

Compiler target:

- `ProjectedExecutableAction`
- variant `PEASaveGateDamage`
- `source = { unitId: "acid_splash", unitKind: PUKSpell, unitName: "Acid Splash" }`
- `activationCost = PACAction`
- `resourceGate = PRGNone`
- `usageLimit = PULNone`
- `attachment = PEAAreaSpherePointWithinRange({ rangeFeet: 60, radiusFeet: 5 })`

Required preserved authored facts:

- save ability is `Dex`
- DC source is the caster's spell save DC
- damage type is `Acid`
- amount is threshold dice on `PLACharacterLevel` with 1d6 base, then 2d6 at
  level 5, 3d6 at 11, 4d6 at 17

Owned runtime facts, not duplicated in the projection:

- chosen point within range
- resolved creatures in the area
- saving-throw outcomes
- damage-roll outcome

### `fighter_second_wind`

Authored source:
[packages/prototype-content-surface/content/fighter_second_wind.json](/workspace/typescript/dnd/packages/prototype-content-surface/content/fighter_second_wind.json)

Compiler target:

- `ProjectedExecutableAction`
- variant `PEADirectHealHp`
- `source = { unitId: "fighter_second_wind", unitKind: PUKClassFeature, unitName: "Second Wind" }`
- `activationCost = PACBonusAction`
- `resourceGate = PRGUseCount(...)`
- `usageLimit = PULNone`
- `attachment = PEASelf`

Required preserved authored facts:

- heal amount is linear dice-plus-level on `PLAFighterLevel`
- base is `1d10 + 1`
- `perLevelFlat = 1`
- `startingAtLevel = 1`
- resource cap is threshold tiers on `PRAClass` with base `2`, `3` at level 4,
  `4` at level 10
- reset cadence is `partial_short_full_long` with `shortRestRefill = 1`

### `fighter_action_surge_l2`

Authored source:
[packages/prototype-content-surface/content/fighter_action_surge_l2.json](/workspace/typescript/dnd/packages/prototype-content-surface/content/fighter_action_surge_l2.json)

Compiler target:

- `ProjectedExecutableAction`
- variant `PEADirectGrantExtraAction`
- `source = { unitId: "fighter_action_surge_l2", unitKind: PUKClassFeature, unitName: "Action Surge" }`
- `activationCost = PACFree`
- `resourceGate = PRGUseCount(...)`
- `usageLimit = PULOncePerTurn`
- `attachment = PEASelf`

Required preserved authored facts:

- extra action restriction is `PGARExcludeMagicAction`
- resource cap is threshold tiers on `PRAClass` with base `1`, then `2` at
  level 17
- reset cadence is `PRCShortOrLongRest`

### `mage_armor`

Authored source:
[packages/prototype-content-surface/content/mage_armor.json](/workspace/typescript/dnd/packages/prototype-content-surface/content/mage_armor.json)

Compiler target:

- `ProjectedPersistentRecord`
- variant `PPRSetBaseAc`
- `source = { unitId: "mage_armor", unitKind: PUKSpell, unitName: "Mage Armor" }`
- `attachment = PPAChosenTarget`

Required preserved authored facts:

- base AC is `13`
- ability modifier is `Dex`
- early end is exactly `[PPEETargetDonsArmor]`

## Deliberate Boundary

EPT3 closes the projection vocabulary and the first-slice authored mappings.
It does not define a general authored-surface interpreter in Quint, and it does
not mirror the entire prototype-content surface. It mirrors only the reduced
runtime-facing subset the TS compiler is allowed to emit.

The direct action union is intentional:

- it keeps runtime attached to a smaller execution contract than the full
  authoring surface
- it avoids reintroducing node-graph indirection when the supported slice does
  not need graph control flow
- it keeps unsupported shapes fail-closed at compile time rather than forcing
  runtime to understand the whole surface language

## Verification

- `pnpm exec quint parse projected-executable.qnt --out /tmp/projected-executable.json`
- `pnpm exec quint typecheck projected-executable.qnt`
- `git diff --check -- projected-executable.qnt plans/EXECUTABLE_PROJECTION_QUINT_SUBSETS.md`

`/simplify` convergence:

- round 1: removed the stale node-graph mirror (`ProjectedExecutableNode`,
  `entryNode`, `nodes`) so Quint now matches the direct TS action contract
- round 2: moved Mage Armor semantics from module-level constants into the
  persistent record payload, matching the TS runtime owner path
- round 3: kept the closed subset narrow by mirroring only the three executable
  action shapes and one persistent shape currently emitted by the compiler
