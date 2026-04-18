## Javelin of Lightning

Outcome: `atom_widening`

Why it does not fit honestly:

- The activated **Lightning Bolt** property mostly matches the existing `magic_item` `activation` family: it is a once-per-dawn, attack-replacement save-gate that deals fixed Lightning damage in a 120-foot line.
- The item's always-on rider is not secondary fluff; it is a real combat rule:
  "Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage."
- The current surface has numeric weapon-damage modifiers (`modify_damage_numeric`) and concrete damage instances (`damage`), but no atom that substitutes a weapon hit's damage type while preserving the rest of the hit.
- The throw-property rider
  "Immediately after dealing this damage, the weapon reappears in your hand."
  also lacks a matching atom or lifecycle/effect shape for returning a thrown item after resolution.

Proposed widenings:

1. `new_atom`: `substitute_damage_type`
   - Justification: the item changes the damage type of a weapon hit without adding damage, replacing the hit, or granting a new spell.
   - Evidence: "Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage."
   - Suggested shape:
     - scoped like other weapon riders with an optional `weaponFilter`
     - records `from` and `to` damage types
     - optionally limited to `on_hit`

2. `new_atom`: `return_thrown_item`
   - Justification: the bolt transformation ends by moving the same item back to the wielder's hand immediately after resolution; this is not destruction, dismissal, or spell access.
   - Evidence: "Immediately after dealing this damage, the weapon reappears in your hand."

Notes:

- If the surface gained only `substitute_damage_type`, the once-per-dawn bolt property could still be authored with an omission note for the return rider.
- Because the damage-type substitution is part of the item's baseline weapon behavior, this unit should not be classified `clean` by encoding only the bolt property.
