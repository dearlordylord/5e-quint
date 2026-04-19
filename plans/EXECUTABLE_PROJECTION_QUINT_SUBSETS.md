# EPT3 - Quint Projected Executable And Persistent Subsets

## Purpose

This file records the closed Quint-side subset for the executable-projection
tracer bullet.

The Quint owner is
[projected-executable.qnt](/workspace/typescript/dnd/projected-executable.qnt).
It complements the scope freeze in
[plans/EXECUTABLE_PROJECTION_FIRST_SLICE_SCOPE.md](/workspace/typescript/dnd/plans/EXECUTABLE_PROJECTION_FIRST_SLICE_SCOPE.md)
and defines the contract EPT4 and EPT5 must mirror.

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

- `ProjectedExecutableNode` is closed to `attack_roll`, `save_gate`, `direct`,
  `damage`, `heal_hp`, and `grant_extra_action`.
- `ProjectedExecutableAction` carries only `source`, `activationCost`,
  `resourceGate`, `usageLimit`, `entryNode`, and `nodes`.
- `ProjectedExecutableAttachment` is closed to `self`, `one_target`, and the
  specific `area_sphere_point_within_range` record needed to keep Acid Splash's
  `rangeFeet` and `radiusFeet` distinct.
- `ProjectedAttackKind`, `ProjectedSaveDc`, `ProjectedGrantedActionRestriction`,
  `ProjectedActivationCost`, `ProjectedUsageLimit`, `ProjectedResourceCap`, and
  `ProjectedResetCadence` are all closed variants rather than string tags.

Persistent surface:

- `ProjectedPersistentRecord` is closed to one record kind: `PPRSetBaseAc`.
- The payload carries only runtime identity that can vary per record:
  `source` and `attachment`.
- Mage Armor's fixed semantics live in module-level constants:
  `MAGE_ARMOR_BASE_AC = 13`, `MAGE_ARMOR_ABILITY_MOD = Dex`,
  `MAGE_ARMOR_DURATION_HOURS = 8`, and
  `MAGE_ARMOR_EARLY_END = PMEETargetDonsArmor`.
- No second persistent duration form, early-end trigger, or AC formula is
  representable in EPT3.

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
- `source = { unitId: "acid_splash", unitKind: PUKSpell }`
- `activationCost = PACAction`
- `resourceGate = PRGNone`
- `usageLimit = PULNone`
- `entryNode` points at a `PENSaveGate`
- node chain: `save_gate -> damage`

Required preserved authored facts:

- save ability is `Dex`
- DC source is the caster's spell save DC
- attachment is `PEAAreaSpherePointWithinRange({ rangeFeet: 60, radiusFeet: 5 })`
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
- `source = { unitId: "fighter_second_wind", unitKind: PUKClassFeature }`
- `activationCost = PACBonusAction`
- `resourceGate = PRGUseCount(...)`
- `usageLimit = PULNone`
- `entryNode` points at a `PENDirect`
- node chain: `direct -> heal_hp`

Required preserved authored facts:

- direct attachment is `PEASelf`
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
- `source = { unitId: "fighter_action_surge_l2", unitKind: PUKClassFeature }`
- `activationCost = PACFree`
- `resourceGate = PRGUseCount(...)`
- `usageLimit = PULOncePerTurn`
- `entryNode` points at a `PENDirect`
- node chain: `direct -> grant_extra_action`

Required preserved authored facts:

- direct attachment is `PEASelf`
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
- `source = { unitId: "mage_armor", unitKind: PUKSpell }`
- `attachment = PPAChosenTarget`

Fixed semantics supplied by the EPT3 module, not duplicated per record:

- base AC is `13`
- ability modifier is `Dex`
- duration is exactly `8 hour`
- early end is exactly `target_dons_armor`

## Ordinary Attack Lane

`attack_roll` is part of the closed executable subset even though no authored
first-slice unit compiles into it. That is intentional.

The tracer-bullet scenario still needs ordinary weapon attacks through the
existing battle-owned lane. EPT3 therefore reserves a closed `attack_roll`
payload now:

- attachment `PEAOneTarget`
- attack kind `PAKWeaponAttack`
- hit/miss continuations represented through `ProjectedContinuation`

This lets EPT4 and EPT5 describe the existing lane without widening the Quint
subset later.

## Deliberate Boundary

EPT3 closes the projection vocabulary and the first-slice authored mappings. It
does not hardcode compiled per-unit fixtures in Quint, and it does not yet make
all graph well-formedness invariants unrepresentable. The `entryNode` plus node
continuations are the minimal graph-ready structure for this slice; enforcing
node-reference consistency is left to compiler/interpreter validation in EPT5
and EPT7.

## Verification

- `pnpm exec quint parse projected-executable.qnt --out /tmp/projected-executable.json`
- `pnpm exec quint typecheck projected-executable.qnt`
- `git diff --check -- projected-executable.qnt plans/EXECUTABLE_PROJECTION_QUINT_SUBSETS.md`

`/simplify` convergence:

- round 1: kept executable and persistent semantics in a dedicated projection
  module instead of mixing them into `creature.qnt`, and removed per-unit Quint
  fixtures so authored JSON remains the sole owner of compiled mechanic details
- round 2: narrowed Mage Armor to per-record identity plus module-level
  constants, so no alternate base AC, duration, ability modifier, or early-end
  trigger is representable in EPT3
- round 3: merged the stronger resource/reset contract from the Claude attempt
  with the non-lossy Acid Splash geometry shape from the Codex attempt, leaving
  no stringly operation slots in the landed subset
