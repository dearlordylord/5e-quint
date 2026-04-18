# Gloves of Missile Snaring

## Verdict

`Gloves of Missile Snaring` does not fit the current surface honestly. The top-level shape is already present:

- `MagicItemRecord`
- mechanics family `activation`
- `activationCost.kind = "reaction"`
- `ReactionTrigger.kind = "hit_by_attack_roll"` with a weapon filter

The missing piece is the item's core effect.

## Missing atom

### `reduce_damage_taken`

The item says:

> If you're hit by an attack roll made with a Ranged or Thrown weapon while wearing these gloves, you can take a Reaction to reduce the damage by 1d10 plus your Dexterity modifier if you have a free hand.

That is not representable by any existing `EffectAtom` in `types.ts`.

Why existing atoms are dishonest:

- `grant_resistance` halves damage for a duration; this item subtracts a rolled amount from one hit.
- `grant_temp_hp` creates a separate HP buffer; this item reduces the incoming damage event itself.
- `modify_roll_numeric` changes d20 rolls; it does not alter resolved damage totals.
- `damage` / `heal_hp` model HP changes, not interception of an incoming damage instance.

This matches the residue already called out in the taxonomy notes: `reduce_damage_taken` distinct from `grant_resistance`.

## Secondary rider

The catch rider is conditional:

> If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand.

That is not the blocking issue. The unit already fails before this point because the reduction effect itself is missing. If `reduce_damage_taken` were added, this follow-up would likely need either:

- a caller-owned/narrative projection for catching the projectile, or
- a later item/object-attachment widening if the survey decides the caught-object state belongs in core.

## Classification

`atom_widening`

The family and trigger shape exist. A new effect atom is what this unit forces.
