`Quarterstaff of the Acrobat` does not fit the current surface honestly enough to author as a content record yet.

Primary blocker: form-scoped gating is missing.

- The item is a composite magic item with passive, activated, and triggered-reaction parts, and those families already exist.
- The problem is that several clauses are conditional on the weapon's current altered form:
  - `Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only).`
  - `Attack Deflection (Quarterstaff Form Only).`
  - `Ranged Weapon (Quarterstaff Form Only).`
- The current surface can encode `alter_item_kind`, but it cannot make other grants or activations depend on the current altered kind. `EquipmentPredicate` can say `holding_item`, `wearing_item`, etc., but not `holding_item_in_form("quarterstaff")` or `holding_item_in_any_form([...])`.

Recommended widening:

- Kind: `new_variant`
- Surface: `EquipmentPredicate`
- Name: `item_kind_state`
- Sketch:
  - `| { readonly kind: "item_kind_state"; readonly kinds: ReadonlyNonEmptyArray<string> }`
  - or a composed held-item variant if the project prefers the gate to stay equipment-shaped:
    - `| { readonly kind: "holding_item_kind"; readonly kinds: ReadonlyNonEmptyArray<string> }`
- Why: the item already uses an authored `alter_item_kind` state transition; other parts need to reference that same state instead of duplicating or hand-waving it.

Evidence:

> "While holding this weapon, you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff"

> "**Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only).** While holding this weapon, you have Advantage on Dexterity (Acrobatics) checks."

> "**Attack Deflection (Quarterstaff Form Only).** When you are hit by an attack while holding the weapon, you can take a Reaction ..."

Secondary pressure after that widening:

- The `Ranged Weapon` rider still needs explicit support for temporary weapon-property/range mutation plus the automatic return-to-hand rider.
- That looks like a separate future widening, likely beyond the existing v4 atoms, because the current surface has attack/damage modifiers keyed to a weapon but no atom that changes the weapon's own properties or grants "returns immediately after the ranged attack."

Evidence:

> "**Ranged Weapon (Quarterstaff Form Only).** This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet. Immediately after you make a ranged attack with the weapon, it flies back to your hand."

Non-blocking omission if the form-state widening lands:

- The green dim-light clause is likely outside the current deterministic combat-facing surface and could be left out as non-core utility text unless the project later decides to model illumination explicitly.
