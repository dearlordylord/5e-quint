`Gloves of Missile Snaring` nearly fits the existing `magic_item` `triggered_reaction` family, but not honestly.

Primary blocker: missing activation/equipment gate for `free hand`

- The reaction is only available "if you have a free hand."
- Current non-spell reaction mechanics can gate on `wearing_item`, `holding_item`, `wielding_weapon`, `unarmored`, and `all_of`, but there is no way to require an unused hand.
- Authoring the item without that gate would broaden the trigger illegally and produce a misleading trace.

Suggested widening:

- `surface_widening`: add a new `EquipmentPredicate` or activation-side requirement variant for `free_hand`.
- Evidence: "you can take a Reaction ... if you have a free hand."

Secondary omitted rider: catch the ammunition or weapon

- If the damage is reduced to 0, the wearer can catch the ammunition or weapon if it is small enough to hold.
- The current effect vocabulary has no atom for transferring the triggering projectile/weapon into the reactor's possession or hand.
- This is narrower than a general conjuration/object-creation effect: it references the triggering item and conditionally changes its possession state.

Suggested widening:

- `atom_widening`: add a new effect atom for catching or claiming the triggering item/projectile when a reaction negates its damage.
- Evidence: "If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand."

Because the free-hand gate blocks an honest encoding of the core reaction, no `content/magic_item_gloves_of_missile_snaring.dhall` was authored.
