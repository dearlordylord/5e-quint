# Proposal: Iron Bands — structural_widening

## Outcome

`structural_widening` — no `MagicItemRecord` exists in `UnitRecord`. No Dhall, JSON, or trace produced.

## Primary Blocker

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The v4 TAXONOMY lists `magic_item_root` as a source atom (same tier as `spell_root`, `class_feature_root`, `mastery_root`), but the authored surface has never received a corresponding payload family. Iron Bands cannot be encoded in any existing kind without producing a dishonest record.

## Secondary Gaps (in priority order)

Once a `MagicItemRecord` and a magic-item mechanics family exist, Iron Bands specifically requires the following additional widenings:

### 1. `AttackKind`: `'ranged_weapon_attack'`

The attack is a ranged attack roll with Dex mod + PB — the standard non-spell ranged weapon attack formula. `AttackKind` currently only covers `ranged_spell_attack` and `melee_spell_attack`. This needs a third variant for physical (non-spell) ranged attacks.

> "Make a ranged attack roll with an attack bonus equal to your Dexterity modifier plus your Proficiency Bonus."

### 2. `Condition`: `'restrained'`

The on-hit effect applies the Restrained condition. `Condition` currently only has `'prone'` (introduced for Topple mastery). Restrained has distinct mechanical consequences (speed 0, attack rolls disadvantaged, attacks against have advantage) and must be modeled separately.

> "On a hit, the target has the Restrained condition until you take a Bonus Action to issue a command that releases it."

### 3. `RestResetCadence`: `'dawn'`

Iron Bands recharges at the next dawn. None of the four current cadences (`short_or_long_rest`, `long_rest`, `short_rest`, `partial_short_full_long`) express this. A `dawn` variant is needed.

> "Once the bands are used, they can't be used again until the next dawn."

### 4. Ability check resolution on the surface

The v4 taxonomy has `ability_check` as a resolution atom, but it is absent from the `ActivationPhase` discriminated union in `types.ts`. Iron Bands has a secondary resolution path: any creature touching the bands may take an Action to attempt DC 20 Strength (Athletics) to break free. This needs an `ability_check` phase variant on the surface.

> "A creature that can touch the bands, including the one Restrained, can take an action to make a DC 20 Strength (Athletics) check to break the iron bands."

### 5. Item-destruction effect

On a successful break-free check, the item is destroyed. No v4 effect atom covers item self-destruction as a mechanical outcome. `alter_item_kind` (one of the existing effect atoms) does not apply here — the item ceases to exist. A new atom or a specialized `destroy_item` effect is needed.

> "On a successful check, the item is destroyed, and the Restrained creature is freed."

### 6. Repeated-failure lock

After a failed break-free attempt, further attempts by that creature automatically fail for 24 hours. This is a stateful cooldown that applies per-creature, per-item, with a clock-based expiry. The current atom inventory has no mechanism to represent "subsequent attempts by this specific actor automatically fail for N hours." This would likely require a new atom or a new `persist`/`expire` subgraph variant with a non-rest clock axis.

> "On a failed check, any further attempts made by that creature automatically fail until 24 hours have elapsed."

## What Would Compose from Existing Atoms

The Bonus Action release mechanic (wielder takes a Bonus Action to free the restrained creature) is composable from existing atoms:

- `bonus_action_quota` (resource consumed)
- `remove_condition` (effect — removes Restrained from the target)
- `activate` (procedure)

This portion would not require new atoms if the structural and surface gaps above were resolved.

## Recommended Widening Path

1. Add `MagicItemRecord` to `UnitRecord` with a new `magic_item` kind and at least one mechanics family (e.g., `activation` mirroring the class-feature pattern, but item-specific with `attunement` and `charge`/`use_count` resource shapes adapted for items).
2. Widen `Condition` to include `'restrained'` (and likely other common conditions: `'paralyzed'`, `'stunned'`, `'incapacitated'`, etc.) as the magic-item pass will encounter them repeatedly.
3. Add `'ranged_weapon_attack'` to `AttackKind`.
4. Add `'dawn'` to `RestResetCadence`.
5. Add `ability_check` to the surface `ActivationPhase` union.
6. Add item-destruction effect atom.
7. Decide whether repeated-failure lock needs its own atom or can be expressed as a `persist`/`expire` on a per-actor `use_count` with a `duration_window` (clock-based axis).
