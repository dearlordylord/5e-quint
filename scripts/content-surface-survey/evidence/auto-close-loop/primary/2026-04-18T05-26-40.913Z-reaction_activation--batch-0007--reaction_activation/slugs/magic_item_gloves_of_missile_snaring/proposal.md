Gloves of Missile Snaring fits the existing `magic_item` top-level kind and the existing activated-ability family: it is a reaction-shaped item activation with an attunement gate. It does not fit honestly in the current authored surface because the core mechanic is not representable with the existing effect atoms.

Primary blocker: missing damage-reduction effect atom.

- The item says: "you can take a Reaction to reduce the damage by 1d10 plus your Dexterity modifier"
- The current surface has `damage`, `grant_resistance`, `negate_named_effect`, and linked-damage readers, but no effect atom for reducing incoming damage from a triggering hit by an arbitrary amount.
- `grant_resistance` is not honest here: it halves qualifying damage for a duration, while these gloves apply a one-shot variable reduction to the triggering hit only.

Secondary blocker: the trigger filter cannot express "Ranged or Thrown weapon" honestly.

- `ReactionTrigger.hit_by_attack_roll` can only reuse `WeaponFilter`, whose closed vocabulary is `weapon_category: "melee" | "ranged"` or `specific_item`.
- The source text is narrower and different: "made with a Ranged or Thrown weapon".
- A thrown weapon may be a melee weapon used with the thrown property, so `weapon_category: "ranged"` would be false.

Secondary omitted rider: catch-on-zero.

- The item also says: "If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand."
- That follow-up depends on the reduction result and on object properties / hand occupancy not currently modeled here.
- This is not the primary classification driver because the core reactive damage reduction already blocks honest authoring.

Recommended widening:

1. New atom: `reduce_damage_taken`
   - Shape should support a one-shot numeric reduction applied to the triggering damage packet.
   - Minimum pressure here: `amount: DiceAmount | DiceDelta-derived expression`, probably attached to a reaction-triggered activation and scoped to the triggering hit only.

2. New surface variant: reaction weapon trigger that can express thrown-weapon qualification
   - Either widen `WeaponFilter` with a thrown/property branch, or widen `ReactionTrigger.hit_by_attack_roll` with a dedicated thrown-capable qualifier.
