`Staff of Frost` forces a structural widening of `MagicItemMechanics`.

Why it does not fit:

- The item has a passive rider: "You have Resistance to Cold damage while you hold this staff."
- The same item also has an activated charge-cast rider: "The staff has 10 charges. While holding the staff, you can cast one of the spells on the following table from it, using your spell save DC."
- The current surface allows `MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics`, which means a magic item can be passive or activated, but not both at once.

Why this is structural, not just a missing atom:

- All needed effects already exist in the surface:
  - `grant_resistance`
  - `grant_spell_access`
  - `charge_pool`
  - `dawn` recharge
  - `last_charge_roll` destruction
- The missing piece is a top-level mechanics shape that can compose passive and activated item behavior in one record without lying.

Suggested widening:

- Add a composite magic-item mechanics family, or widen `MagicItemMechanics` to allow both:
  - a passive grant list
  - an activated ability payload

Sketch:

```ts
type CompositeMagicItemMechanics = {
  readonly family: "composite";
  readonly passive?: PassiveMechanics;
  readonly activation?: ActivatedAbilityMechanics;
};
```

Evidence from unit text:

> "You have Resistance to Cold damage while you hold this staff."

> "The staff has 10 charges. While holding the staff, you can cast one of the spells on the following table from it, using your spell save DC."

Secondary surface pressure, but not the primary blocker:

- The rules text is explicitly gated by "while you hold this staff." The current surface has no general hold/wear gate for activated magic-item use, and passive gating only has `EquipmentPredicate` variants for armor/weapon cases, not held items broadly.
- Even if a `holding_item` predicate were added, the item would still need the structural widening above to encode both halves together.
