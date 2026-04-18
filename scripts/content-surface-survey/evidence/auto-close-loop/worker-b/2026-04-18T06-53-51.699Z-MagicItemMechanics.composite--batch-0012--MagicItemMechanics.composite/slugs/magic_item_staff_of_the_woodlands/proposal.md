`Staff of the Woodlands` does not fit the current surface honestly enough to author a `content/magic_item_staff_of_the_woodlands.dhall` file.

What fits already:

- `magic_item` as the top-level kind
- `CompositeMagicItemMechanics`
- passive held-item bonuses:
  - `modify_roll_numeric` on `attack_roll` with `weaponFilter = specific_item`
  - `modify_damage_numeric` with `weaponFilter = specific_item`
- activated charge-cast spell access
- `charge_pool`
- `dawn` recharge

Why this still stops the encoding:

1. Tree Form changes the item itself, not the wielder or a creature target.
   The surface has `EffectAtom.alter_item_kind`, but `ActivationPhase.attachment` has no `item` or `object` attachment variant. Encoding Tree Form on `self` would be false, because the staff becomes the tree.

2. Tree Form has a deterministic revert rider: creatures in the tree fall when it reverts.
   That is a reusable mechanical consequence tied to the altered item form. The taxonomy includes `fall_on_end`, but the authored surface does not expose it in `EffectAtom`.

3. The last-charge rider is not destruction.
   RAW says the staff "loses its properties and becomes a nonmagical Quarterstaff" on a `1`, not that it is destroyed. `ItemDestructionPolicy.last_charge_roll` only represents destruction, so using it would produce a misleading trace.

4. The attunement requirement is class-gated.
   `MagicItemRecord.requiresAttunement` is only a boolean, so "Requires Attunement by a Druid" cannot be represented exactly.

5. The passive spell-attack bonus is narrower than the current roll taxonomy.
   The item grants `+2` to spell attack rolls only. `modify_roll_numeric` can target `attack_roll`, but the surface has no roll discriminator or filter for spell attacks versus weapon attacks, so encoding it as a generic attack-roll bonus would be false.

Suggested widenings:

- Add an `Attachment` variant for an affected `item` / `object` so `alter_item_kind` can target the staff itself.
- Add a spell-attack-only narrowing on `modify_roll_numeric` (for example a new roll kind or attack-source filter) so held items can bonus spell attack rolls without also bonusing weapon attacks.
- Add surface support for the existing v4 `fall_on_end` atom so Tree Form can model creatures falling when the tree reverts.
- Add an `ItemDestructionPolicy` variant for "last charge roll causes item to become nonmagical" rather than destroyed.
- Add attunement eligibility metadata, at minimum a class restriction shape for magic items.
