`Dagger of Venom` does not fit the current magic-item mechanics honestly, so no `content/magic_item_dagger_of_venom.dhall` was authored.

Why it blocks:

- The item is a `composite` magic item in spirit:
  - passive while wielded: `+1` to attack rolls and damage rolls made with this weapon;
  - activated rider: bonus action coats the blade with poison.
- The passive half fits current surface vocabulary:
  - `modify_roll_numeric` on `attack_roll` with `weaponFilter = { kind = "specific_item", itemId = ... }`;
  - `modify_damage_numeric` with the same `specific_item` filter.
- The activated half does not fit any existing non-spell family:
  - it is not an immediate `activation`, because the effect does not resolve on activation;
  - it is not a `triggered_reaction`, because it is armed proactively with a bonus action rather than opened by a reaction trigger;
  - it is not a `passive`, because the poison rider is temporary and spent on first qualifying hit.

What is missing:

- A non-spell analogue of spell `ongoing_effect`, or a widening of `ActivatedAbilityMechanics`, that can:
  - attach a temporary state to a specific weapon;
  - listen for that weapon’s next hit;
  - on that hit, run a `save_gate` with fixed DC 15;
  - on failure, apply `damage(2d10 poison)` plus `apply_condition(poisoned)` with 1-minute duration;
  - expire either on first qualifying hit or after 1 minute.

Why this is `structural_widening`, not narrower:

- The missing piece is not a single effect atom. The needed damage, condition, fixed DC, bonus-action cost, and dawn reset already exist in the current surface.
- The missing piece is the delivery family itself: an activated, temporary, weapon-bound, later-on-hit rider for non-spell units.

RAW evidence forcing the gap:

> You can take a Bonus Action to magically coat the blade with poison.

> The poison remains for 1 minute or until an attack using this weapon hits a creature.

> That creature must succeed on a DC 15 Constitution saving throw or take 2d10 Poison damage and have the Poisoned condition for 1 minute.

Everything after the bonus action is delayed, conditional, and tied to a later hit by the same weapon. The current non-spell mechanics families have no honest place to put that stateful subgraph.
