`Sneak Attack` does not fit the current surface honestly.

Why it fails:

- `class_feature` records only support `mechanics.family = "activation"`.
- `Sneak Attack` is not an activated feature. Its core mechanic is a passive rider that applies on a qualifying hit.
- The closest existing family, `on_hit_trigger`, exists only under `mastery`, so forcing `Sneak Attack` into that shape would misstate both the top-level source kind and the available effect grammar.

Required widening:

1. Structural widening: add a passive/on-hit family for `class_feature`.
   - Suggested shape: a class-feature mechanics variant analogous to mastery `on_hit_trigger`, rooted under `class_feature`.
   - This is forced by: "Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack roll..."

2. Surface widening: add qualifying predicates for Sneak Attack eligibility.
   - Needs a way to express:
   - attack uses a Finesse weapon or a Ranged weapon
   - either Advantage on the attack roll, or an ally within 5 feet of the target that is not Incapacitated
   - you do not have Disadvantage on the attack roll
   - This is forced by:
   - "if you have Advantage on the roll and the attack uses a Finesse or a Ranged weapon"
   - "You don't need Advantage ... if at least one of your allies is within 5 feet of the target, the ally doesn't have the Incapacitated condition, and you don't have Disadvantage..."

3. Surface widening: add an on-hit damage rider whose damage type is inherited from the weapon hit, not fixed in authored content.
   - Existing spell `damage` and ongoing `damage_on_hit` require a concrete `DamageType`.
   - Sneak Attack requires "same as the weapon's type", which is a derived runtime projection.
   - This is forced by: "The extra damage's type is the same as the weapon's type."

4. Surface widening: allow class-level dice scaling on the rider amount.
   - The underlying `DiceAmount` type already supports class scaling, but there is no class-feature on-hit damage rider surface that can carry it.
   - This is forced by: "The extra damage increases as you gain Rogue levels..."

Narrowest honest classification:

- `structural_widening`

Reason:

- The first blocker is missing family fit for `class_feature`.
- Additional surface widenings are also needed once that family exists.
