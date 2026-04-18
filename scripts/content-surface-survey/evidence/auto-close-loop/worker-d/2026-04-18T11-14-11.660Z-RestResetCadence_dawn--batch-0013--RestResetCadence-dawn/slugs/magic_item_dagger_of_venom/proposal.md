`Dagger of Venom` forces a structural widening.

Why the current surface is insufficient:

- The item is a `magic_item`, and its passive half fits existing `PassiveMechanics`:
  - `+1` to attack rolls with this specific weapon
  - `+1` to damage rolls with this specific weapon
- The activated half does not fit any existing non-spell family honestly.

Blocking rule shape:

- "You can take a Bonus Action to magically coat the blade with poison."
- "The poison remains for 1 minute or until an attack using this weapon hits a creature."
- "That creature must succeed on a DC 15 Constitution saving throw or take 2d10 Poison damage and have the Poisoned condition for 1 minute."
- "The weapon can't be used this way again until the next dawn."

Why this is not encodable today:

- `MagicItemMechanics` supports `passive`, `activation`, `triggered_reaction`, `spawned_creature`, and `composite`.
- The poison rider is not a one-shot `activation` phase. The Bonus Action creates a temporary armed state on the weapon that persists for up to 1 minute and resolves later on a qualifying weapon hit.
- Non-spell activations have `duration`, but they do not have the spell-side `attachment + operations` grammar needed to say "while armed, on caster attack hit with this specific item, open a save gate, then end."
- `TriggeredReactionAbilityMechanics` is also wrong: the later hit is not a reaction window and does not consume a reaction.

Honest widening needed:

- New mechanics family or shared family extension for activated non-spell ongoing effects.
- Minimum shape pressure:
  - activation cost/resource/reset like existing `ActivatedAbilityMechanics`
  - a duration window
  - an attachment or host item/weapon reference
  - ongoing trigger support equivalent to spell `on_caster_attack_hit`
  - a way to scope that trigger to `weaponFilter = specific_item`
  - a way for the armed state to end on first qualifying hit

Suggested direction:

- Add a non-spell analogue of `ongoing_effect`, or widen `ActivatedAbilityMechanics` so non-spell units can carry `attachment` plus `operations` in addition to immediate `phases`.
- Reuse existing v4 atoms where possible:
  - `modify_roll_numeric` and `modify_damage_numeric` already cover the passive `+1`
  - `damage`
  - `apply_condition`
  - `save_gate`
  - `duration_window` / `expire`
- The gap is the family/subgraph, not a missing effect atom.
