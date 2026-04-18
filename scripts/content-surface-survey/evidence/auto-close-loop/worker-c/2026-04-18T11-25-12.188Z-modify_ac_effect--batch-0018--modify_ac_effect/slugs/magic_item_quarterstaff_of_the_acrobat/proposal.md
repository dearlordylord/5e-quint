## Quarterstaff of the Acrobat

The item fits the existing top-level `magic_item` kind and would naturally want a `composite` mechanics record:

- passive held-item weapon bonuses (`+2` attack / damage with this weapon)
- an activated form-change ability
- a triggered reaction for Attack Deflection

That part is not the blocker. The blocker is that several required mechanics cannot be expressed honestly with the current surface.

### Missing honest shapes

1. Form-scoped item behavior needs a new surface variant.

The item's riders are conditional on the weapon's current altered form:

- `Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only)`
- `Attack Deflection (Quarterstaff Form Only)`
- `Ranged Weapon (Quarterstaff Form Only)`

The surface has `alter_item_kind`, but it has no way to gate passive parts or triggered-reaction parts on the current item form. `EquipmentPredicate` can say `holding_item`, but not `holding_item_in_form("quarterstaff")` or equivalent stateful item-mode predicates.

This is a `surface_widening` pressure:

- candidate: new `EquipmentPredicate` variant such as `item_form`
- justification: existing mechanics can express the form change, but not downstream rule gating based on the selected form

2. Emitted light needs a new atom.

The item can emit and extinguish green Dim Light:

- `you can cause it to emit green Dim Light out to 10 feet`
- `or you can extinguish the light`

The current surface has no `emit_light` / `shed_light` effect, and the repo already treats similar text as omitted elsewhere rather than encoding it with an existing atom.

This is `atom_widening`:

- candidate: new effect atom like `emit_light`
- minimum payload: light level (`dim` / future `bright`), radius, optional color

3. The ranged-weapon rider needs new weapon-modification atoms.

The Quarterstaff-form ranged mode says:

- `This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet.`
- `Immediately after you make a ranged attack with the weapon, it flies back to your hand.`

Current surface gaps:

- no effect atom to grant or remove weapon properties at runtime
- no honest authored shape for adding a ranged profile to a specific weapon
- no atom/subgraph for the automatic return-to-hand rider after a ranged attack

This is primarily `atom_widening`:

- candidate atom: `grant_weapon_property`
- candidate surface/atom pair for ranged profile: either `modify_range` brought into the surface plus a weapon-mode authoring shape, or a more explicit `grant_weapon_attack_profile`
- candidate atom/subgraph: `return_item_to_holder` / `return_after_attack`

### Why no partial authored content was produced

Encoding only the `+2` passive bonus and the deflection reaction would misstate the item, because the omitted parts are not incidental flavor:

- the light toggle is an explicit activated property
- the form change is a core stateful mechanic
- multiple other riders depend on form state
- the thrown/returning behavior changes how the weapon functions in play

So this worker stops before authoring `content/magic_item_quarterstaff_of_the_acrobat.dhall`.
