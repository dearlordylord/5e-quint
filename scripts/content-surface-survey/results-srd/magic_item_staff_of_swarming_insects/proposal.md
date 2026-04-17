## Staff of Swarming Insects

This item does not fit the current surface cleanly enough to author an honest `content/magic_item_staff_of_swarming_insects.dhall`.

Primary blockers:

1. The item's non-spell activation creates an obscuring field, but the surface has no atom for area obscuration / visibility denial.
   Evidence: "a swarm of harmless flying insects to fill a 30-foot Emanation originating from you. The insects remain for 10 minutes, making the area Heavily Obscured for creatures other than you."
   Why this matters: `block_targeting`, `apply_condition`, and `grant_sense` are not honest substitutes. Heavy obscuration is an area-state visibility rule with asymmetric exemption ("other than you"), not a targeting ban or a condition on creatures.

2. The item has multiple selectable activations sharing one charge pool.
   Evidence:
   - "expend 1 charge to cause a swarm..."
   - "you can cast one of the spells on the following table from it"
   Why this matters: current `MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics` can encode a passive spell grant, or one activated sequence, but not a menu of distinct activated abilities sharing the same `charge_pool` resource without lying about all effects happening at once.

Secondary blocker:

3. The insect cloud ends on a specific environmental dispersal trigger not present in the current duration grammar.
   Evidence: "A strong wind (like that created by Gust of Wind) disperses the swarm and ends the effect."
   Why this matters: current duration end triggers only cover target-side actions/damage/armor and cannot express environmental wind dispersal.

Suggested widenings:

- `new_atom`: `create_obscurement` or equivalent area-visibility atom
  - Should encode area shape/origin/duration plus at least obscuration level and exemption rules.
- `new_variant` or `new_subgraph`: activation menu for magic items
  - A way for one item to expose several mutually exclusive activations under one shared resource pool.
- `new_variant`: duration early-end trigger for environmental dispersal
  - Something like `dispersed_by_strong_wind`.
