## Gloves of Missile Snaring

The item fits the existing `magic_item` top-level kind and its primary shape is a `triggered_reaction` ability, but the current surface cannot encode the trigger and follow-on rider honestly.

### Missing surface shapes

1. `ReactionTrigger.hit_by_attack_roll` cannot express "made with a Ranged or Thrown weapon" faithfully.
   - The shared `WeaponFilter` only supports:
     - `weapon_category = "melee" | "ranged"`
     - `specific_item`
   - That covers ranged weapons, but not thrown weapon attacks. A thrown dagger or handaxe is not a ranged weapon category attack, so widening to `"ranged"` would be false.

2. The reaction is gated by "if you have a free hand".
   - The current surface has `EquipmentPredicate`, but nothing that can predicate a triggered reaction on free-hand availability.
   - Omitting that gate would overstate availability of the reaction.

### Missing atom / subgraph

3. "If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough to hold in that hand" has no current effect atom.
   - This is not just damage prevention; it conditionally transfers the attacking object/ammunition into the reactor's possession/hand after a zero-damage outcome.
   - Existing atoms cover damage reduction, movement, targeting, and item-kind alteration, but not item capture/possession transfer.

### Recommended widening

- `surface_widening`: add a trigger-side weapon filter or reaction predicate that can represent `ranged_or_thrown_weapon_attack`, and a reaction/activation predicate for `requires_free_hand`.
- `atom_widening`: add a conditional catch/capture effect or subgraph for "on prevented-to-zero projectile/weapon hit, catch the object".

### Evidence

> If you're hit by an attack roll made with a Ranged or Thrown weapon while wearing these gloves, you can take a Reaction to reduce the damage by 1d10 plus your Dexterity modifier if you have a free hand.

> If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand.
