## Vorpal Sword

Outcome: `structural_widening`

I did not author `content/magic_item_vorpal_sword.dhall` because the current surface cannot encode this item honestly.

### Why it does not fit

`MagicItemMechanics` currently allows only:

- `passive`
- `activation`

Vorpal Sword is neither of those alone. It is a compound item with:

- always-on weapon bonuses;
- a conditional on-hit rider keyed to a natural 20 on the attack die.

Encoding only the passive half would omit the item's defining mechanic and produce a misleading trace.

### Specific gaps

1. `magic_item` needs a way to compose passive grants with an on-hit rider.

Evidence:

> You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon.
> When you use this weapon to attack a creature that has at least one head and roll a 20 on the d20 for the attack roll, you cut off one of the creature's heads.

2. The surface lacks an honest passive modifier for weapon damage rolls.

Current `RollKind` supports `attack_roll`, `saving_throw`, `ability_check`, `initiative`, and `death_saving_throw`, but not damage rolls.

Evidence:

> You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon.

3. The surface lacks `bypass_resistance` / ignore-resistance authoring.

This concept exists in the v4 taxonomy, but not in `EffectAtom` in the current TS surface.

Evidence:

> the weapon ignores Resistance to Slashing damage

4. The core rider is not representable as existing damage or condition atoms.

The effect is decapitation with possible death, not merely bonus damage.

Evidence:

> you cut off one of the creature's heads. The creature dies if it can't survive without the lost head.

5. The trigger and fallback logic need a richer subgraph than the current mastery-style `weapon_hit`.

The rider triggers on a natural 20 on the d20, then branches:

- decapitation/death if valid;
- extra 30 slashing damage instead if the creature is immune, headless, does not need a head, is too large by GM ruling, or expends Legendary Resistance.

Evidence:

> roll a 20 on the d20 for the attack roll
> Such a creature instead takes an extra 30 Slashing damage from the hit.
> If the creature has Legendary Resistance, it can expend one daily use of that trait to avoid losing its head, taking the extra Slashing damage instead.

### Classification notes

- I classified this as `structural_widening`, not `dm_agenda`.
- The GM size exception is a secondary branch, not the whole item's core mechanic.
- Even without that branch, the item still needs:
  - mixed passive + on-hit composition;
  - damage-roll bonus support;
  - bypass-resistance support;
  - a decapitation / instant-death rider.
