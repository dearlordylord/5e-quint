# Executable Projection First Slice Scope

> Archival note: this document is preserved history for baseline `39f9ab71`.
> The active Correction Application Migration supersedes this first slice with
> the promoted Fighter/Goblin MCP/runtime vertical; do not treat projected executable
> vocabulary as current architecture.

## Purpose

This file freezes the first executable-projection tracer-bullet slice for EPT1.
Later tasks may implement this slice, but they must not silently widen it. If a
later task needs a new unit, projected node kind, persistent record kind,
runtime-provided fact, action-economy primitive, or lifecycle trigger, that is
a scope change.

Primary design sources:

- [DESIGN_EXECUTABLE_PROJECTION_TRACER_BULLET.md](/workspace/typescript/dnd/DESIGN_EXECUTABLE_PROJECTION_TRACER_BULLET.md)
- [EXECUTABLE_PROJECTION_TRACER_BULLET_PLAN.md](/workspace/typescript/dnd/plans/EXECUTABLE_PROJECTION_TRACER_BULLET_PLAN.md)

Unit confirmations landed against this scope:

- [EXECUTABLE_PROJECTION_ACID_SPLASH_CONFIRMATION.md](/workspace/typescript/dnd/plans/EXECUTABLE_PROJECTION_ACID_SPLASH_CONFIRMATION.md) - EPT2 spell-side unit confirmation

Rules and terminology checked against:

- [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)
- [Acid Splash RAW](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md:20)
- [Mage Armor RAW](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md:5)
- [Second Wind RAW](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Fighter.md:62)
- [Action Surge RAW](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Fighter.md:76)
- [Turn Structure](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:501)
- [Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:320)
- [Attack Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md:104)
- [Magic Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md:700)

## Scenario Scope

The first tracer-bullet scenario is exactly:

- one mage with access to `acid_splash` and `mage_armor`
- one Fighter 2 with access to `fighter_second_wind` and `fighter_action_surge`
- one goblin opponent and one bugbear opponent through the owned monster path
- normal combat turn flow, including turn starts and turn ends

The point of the slice is to prove one durable path from authored content
records into projected records, Quint-owned semantics, runtime execution, and
MCP battle flow.

## In-Scope Units

### Authored units that must project

- `acid_splash`
- `mage_armor`
- `fighter_second_wind`
- `fighter_action_surge`

These are the only authored content units in scope for EPT1.

### Battle participation around those units

- ordinary attack flow is in scope as an existing battle lane the projected
  slice must coexist with
- goblin participation is in scope through the existing owned monster catalog
  path
- bugbear participation is in scope through the same owned monster path once
  EPT9 adds the missing shipped bugbear entry

Ordinary attacks are in-scope scenario behavior, but they are not part of the
EPT1 authored-unit compiler boundary.

## Closed Projected Executable Node Kinds

The first projected executable subset is closed to these node kinds:

- `attack_roll`
- `save_gate`
- `direct`
- `damage`
- `heal_hp`
- `grant_extra_action`

Nothing else belongs in the first executable subset.

### Required mappings inside this slice

| Unit or lane              | Required projected executable nodes                        |
| ------------------------- | ---------------------------------------------------------- |
| `acid_splash`             | `save_gate` -> `damage`                                    |
| `fighter_second_wind`     | `direct` -> `heal_hp`                                      |
| `fighter_action_surge` | `direct` -> `grant_extra_action`                           |
| ordinary weapon attacks   | `attack_roll` with existing battle-lane damage application |

`mage_armor` is intentionally not part of the executable subset. It belongs to
the persistent subset below.

The first slice is intentionally linear. It does not require graph-shaped spell
execution, chooser nodes, reactions, summons, or polymorph execution.

## Closed Projected Persistent Record Kinds

The first projected persistent subset is closed to one persistent record kind:

- `set_base_ac`

This is the only persistent record kind required for EPT1 because `mage_armor`
is the only persistent authored unit in scope.

### Closed `mage_armor` lifecycle surface

The persistent lifecycle surface is closed to the exact authored and RAW-backed
shape already present in [mage_armor.json](/workspace/typescript/dnd/packages/surface/content/mage_armor.json):

- duration kind `timed`
- duration value exactly `8 hour`
- early-end trigger exactly `target_dons_armor`
- no concentration slot
- no dispel hook, stacking rule, replacement rule, or extra cleanup trigger

No other persistent operation kind, duration form, or early-end trigger is in
scope for this slice.

## Allowed Runtime-Provided Facts

Runtime-provided facts are facts the interpreter may consume when they are not
already owned by the authored record plus current battle or character state.

The first slice is closed to these runtime-provided fact categories:

- acting-creature choice of which legal projected action to take
- target choice for `mage_armor`
- chosen point within range for `acid_splash`
- resolved set of creatures in the `acid_splash` area
- attack-roll resolution facts for `attack_roll`
- saving-throw resolution facts for `save_gate`
- damage-roll resolution facts for `damage`
- healing-roll resolution facts for `heal_hp`
- turn-boundary signals for turn start and turn end
- rest-completion signals for short rest and long rest
- lifecycle signal that the `mage_armor` target donned armor

The first slice does not permit any other runtime fact category.

### Explicitly not runtime-provided facts

The projection must read these from existing owned state rather than from a
separate runtime fact channel:

- the target's Dexterity modifier for `mage_armor`
  - owned on battle creatures already via [`battle-machine-types.ts`](/workspace/typescript/dnd/packages/core/src/battle-machine-types.ts:136)
- the acting creature's Fighter level for `fighter_second_wind`
  - already present on battle creatures through the same owned state shape
- the acting creature's spell save DC and spell-slot state for `acid_splash`
  and `mage_armor`
  - already derived from the stored sheet in [`character-sheet-derived.ts`](/workspace/typescript/dnd/packages/core/src/character-sheet-derived.ts:218) and [`character-spellcasting.ts`](/workspace/typescript/dnd/packages/core/src/character-spellcasting.ts:74)

These values may be projected or read from owned actor data, but they are not a
second runtime-boundary input channel.

## Closed Action-Economy And Resource Surface

The first slice may rely on only these action-economy and usage primitives:

- `Action` casting time for `acid_splash`
- `Action` casting time for `mage_armor`
- `Bonus Action` activation cost for `fighter_second_wind`
- `free` activation cost for `fighter_action_surge`
- one additional action with the explicit restriction that it cannot be the
  `Magic` action
- ordinary turn start and turn end boundaries

The first slice may rely on only these resource and quota shapes:

- `fighter_second_wind.resource.kind = use_count`
- `fighter_second_wind.resource.cap.kind = threshold_tiers` with base `2`,
  then `3` at Fighter level `4`, then `4` at Fighter level `10`
- `fighter_second_wind.resetCadence.kind = partial_short_full_long` with
  `shortRestRefill = 1`
- `fighter_action_surge.resource.kind = use_count`
- `fighter_action_surge.resource.cap.kind = threshold_tiers` with base `1`,
  then `2` at Fighter level `17`
- `fighter_action_surge.resetCadence.kind = short_or_long_rest`
- `fighter_action_surge.usageLimit.kind = once_per_turn`
- `mage_armor` uses the existing spell-slot resource path
- `acid_splash` uses no spell-slot resource path because it is a cantrip

The bounded scenario still uses the Fighter 2 concrete values implied by those
shapes: `Second Wind = 2 uses`, `Action Surge = 1 use`.

Nothing broader is in scope. In particular, EPT1 does not authorize:

- arbitrary free-cost activations
- arbitrary per-rest counters
- generalized recharge cadences
- generalized per-window or per-phase quotas

## Explicit Out Of Scope

The following are explicitly out of scope for the first slice:

- any authored unit other than the four named units above
- any projected executable node kind other than the six named node kinds above
- any projected persistent record kind other than `set_base_ac`
- any persistent duration other than `timed` `8 hour`
- any persistent early-end trigger other than `target_dons_armor`
- concentration, concentration-break checks, and concentration-slot ownership
- reaction execution, triggered reactions, and Ready-based held execution
- graph-shaped or chooser-shaped spell execution
- spell upcasting or cast-level variation
- summon, spawn, reanimation, transformation, or polymorph execution
- generalized monster-mechanics promotion beyond battle participation, targeting,
  ordinary attacks, and turn flow
- geometry- or perception-heavy targeting rules beyond the single
  `acid_splash` area-membership fact boundary
- any MCP payload that embeds mechanic semantics directly instead of referencing
  stored characters, owned monsters, projected records, and runtime facts

## Verification

RAW traceability checked:

- `acid_splash` freeze traced to
  [Descriptions-A-D.md:20](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md:20)
- `mage_armor` persistent and lifecycle freeze traced to
  [Descriptions-M-P.md:5](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md:5)
- `fighter_second_wind` action, healing, and reset shape traced to
  [Fighter.md:62](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Fighter.md:62)
- `fighter_action_surge` extra-action and recharge shape traced to
  [Fighter.md:76](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Fighter.md:76)
- turn boundaries traced to
  [Playing-the-Game.md:501](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:501)
- bonus-action timing traced to
  [Playing-the-Game.md:320](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:320)
- ordinary attack coexistence traced to
  [Rules-Glossary.md:104](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md:104)
- `Action Surge`'s `except the Magic action` restriction traced to
  [Rules-Glossary.md:700](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md:700)

`/simplify` convergence:

- round 1: removed redundant runtime facts and aligned the fighter resource
  freeze with the authored `threshold_tiers` shapes
- round 2: re-read the closed lists and exclusions; no further important
  simplification or deduplication remained
- result: converged for this documentation-only task

## Acceptance Questions This File Must Answer

The answer is `out of scope` unless it is listed above.

- Is this authored unit part of the first projected compiler slice?
- Is this projected node kind allowed in the first executable subset?
- Is this persistent record kind allowed in the first persistent subset?
- Is this runtime-provided fact permitted?
- Does this mechanic require a wider action-economy, resource, or lifecycle
  surface than EPT1 allows?

If a later task cannot stay within this boundary list, the task is proposing a
scope change rather than merely implementing EPT1.
