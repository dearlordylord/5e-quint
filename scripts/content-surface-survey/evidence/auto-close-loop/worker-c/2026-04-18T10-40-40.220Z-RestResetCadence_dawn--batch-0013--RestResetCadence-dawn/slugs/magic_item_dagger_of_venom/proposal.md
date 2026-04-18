`Dagger of Venom` does not fit the current magic-item surface honestly.

What fits today:
- The always-on `+1` bonus to attack rolls and damage rolls made with this weapon fits a `magic_item` record with passive grants:
  - `modify_roll_numeric` on `attack_roll` with `weaponFilter = specific_item`
  - `modify_damage_numeric` with `weaponFilter = specific_item`

What does not fit:
- The bonus-action coating is not an immediate activation. It creates a temporary armed state on the weapon:
  - lasts `1 minute` or until an attack with this weapon hits a creature;
  - on that later hit, the target makes a DC 15 Constitution save;
  - on a failed save, the target takes `2d10 poison` damage and gains the `poisoned` condition for `1 minute`;
  - the activation then goes on a `next dawn` recharge.

Why this is a `structural_widening`:
- `MagicItemMechanics.composite` can combine passive and activated parts, but the activated part must currently be one of:
  - immediate `activation` phases,
  - `triggered_reaction`,
  - `spawned_creature`.
- There is no non-spell item family for "activate now, then persist a timed on-hit rider until spent/expired".
- The only existing on-hit persistent delivery shape is spell-only: `ongoing_effect.operations` with trigger `on_caster_attack_hit`.
- Non-spell `PassiveMechanics.operations` only supports elapsed-time cadence, not attack-hit triggers.

Honest widening to add:
- New mechanics family or shared non-spell extension for activated ongoing effects, combining:
  - activation cost/resource/reset cadence from `ActivatedAbilityMechanics`,
  - duration,
  - ongoing trigger support including `on_caster_attack_hit`,
  - effect payloads that can branch through a save gate on the later hit.

Evidence:
> "You can take a Bonus Action to magically coat the blade with poison. The poison remains for 1 minute or until an attack using this weapon hits a creature."

> "That creature must succeed on a DC 15 Constitution saving throw or take 2d10 Poison damage and have the Poisoned condition for 1 minute."

> "The weapon can't be used this way again until the next dawn."
