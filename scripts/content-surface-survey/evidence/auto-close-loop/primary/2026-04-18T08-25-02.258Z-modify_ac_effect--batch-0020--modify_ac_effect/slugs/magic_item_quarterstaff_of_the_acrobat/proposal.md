## Quarterstaff of the Acrobat

The item fits the existing `magic_item` top-level kind, and the unconditional `+2` weapon bonus fits the current passive surface cleanly. The omitted mechanics expose four real gaps.

### 1. Item-targeted form change needs a surface widening

The source text says:

> "While holding this weapon, you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff"

`EffectAtom.alter_item_kind` already exists, but `ActivationPhase.attachment` cannot target an item or object. Today it only allows `self`, `target`, `area`, or `mark`, so there is no honest way to say "this bonus action changes the held weapon's form" without falsely attaching the effect to the creature.

Proposed widening:

- `new_variant`: add item/object attachment support to `Attachment` (and therefore to activation phases) so `alter_item_kind` can target the held item directly.

### 2. Form-gated passives and reactions need item-form state / predicates

The source text says:

> "**Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only).** While holding this weapon, you have Advantage on Dexterity (Acrobatics) checks."

> "**Attack Deflection (Quarterstaff Form Only).** When you are hit by an attack while holding the weapon, you can take a Reaction ..."

> "**Ranged Weapon (Quarterstaff Form Only).** This weapon has the Thrown property ..."

The current surface can gate mechanics on being `holding_item`, but not on the held item's current authored form. Once `alter_item_kind` exists on the activation side, the surface still needs a way for passive parts and triggered-reaction parts to say "only while the item is in Quarterstaff form" or "Quarterstaff or 10-Foot Pole forms only."

Proposed widening:

- `new_variant`: add an item-form predicate/state gate usable by passive and triggered-reaction magic-item parts, for example an equipment predicate keyed to the current kind of a specific held item.

### 3. Light emission needs a new atom

The source text says:

> "you can cause it to emit green Dim Light out to 10 feet"

The current surface has no light-emission effect atom, and the v4 taxonomy excerpt provided here does not include one either.

Proposed widening:

- `new_atom`: `emit_light` or `grant_light_emission`, parameterized by light category and radius.

### 4. Returning to hand after a thrown attack is still unsupported

The source text says:

> "Immediately after you make a ranged attack with the weapon, it flies back to your hand."

This is deterministic item relocation after an attack. The current authored surface has no way to express that rider on a magic weapon.

Proposed widening:

- `new_variant`: add item-motion / return-to-holder support on post-attack item riders.
