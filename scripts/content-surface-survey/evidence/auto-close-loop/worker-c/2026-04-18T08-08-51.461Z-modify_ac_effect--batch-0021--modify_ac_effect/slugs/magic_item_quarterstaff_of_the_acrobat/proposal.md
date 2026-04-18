## Quarterstaff of the Acrobat

The unit fits the existing top-level `magic_item` kind in principle, but it does not fit the current authored surface honestly enough to author `content/magic_item_quarterstaff_of_the_acrobat.dhall`.

### Why it blocks

The item is built around mutable item forms plus form-scoped riders:

- Quarterstaff / 10-foot pole / 6-inch rod states
- bonuses that apply only in some forms
- a reactive AC rider that applies only in Quarterstaff form
- a weapon-property rewrite in Quarterstaff form
- a deterministic light-emission toggle

The current surface can encode held-item passive bonuses and triggered reactions, but it cannot encode the item-state machine those riders depend on.

### Required widenings

1. `Attachment` / item-target surface widening

- Need an `Attachment` variant for the held item itself, or an equivalent item/object target in activated non-spell abilities.
- `alter_item_kind` already exists as an effect atom, but there is no honest way to attach it to the weapon being altered in a magic-item activation.
- Evidence: "you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff"

2. Form-aware equipment predicate / state gate

- Need a predicate that can scope passive grants and triggered reactions to specific item forms.
- Existing `EquipmentPredicate` can say `holding_item`, but not "holding this item while it is in Quarterstaff form" or "Quarterstaff and 10-Foot Pole forms only".
- Evidence:
  - "Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only)"
  - "Attack Deflection (Quarterstaff Form Only)"
  - "Ranged Weapon (Quarterstaff Form Only)"

3. New atom: light emission / illumination state

- The item can be toggled on and off and emits Dim Light to a fixed radius.
- No existing surface atom or v4 atom models deterministic illumination.
- Evidence: "you can cause it to emit green Dim Light out to 10 feet ... or you can extinguish the light"

4. Weapon-property rewrite / return subgraph widening

- The item gains the Thrown property with explicit normal/long ranges in Quarterstaff form, then immediately returns to hand after a ranged attack.
- The current surface has no honest way to grant a temporary weapon property bundle or model post-attack item return.
- `modify_range` exists in v4 taxonomy, but the authored surface does not expose weapon-property rewriting, and "flies back to your hand" also needs an item-return mechanic.
- Evidence: "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet. Immediately after you make a ranged attack with the weapon, it flies back to your hand."

### Why I did not author a partial subset

Authoring only the `+2` attack/damage bonus would produce a misleading trace for a unit whose distinctive mechanics are the form changes and form-scoped riders. The missing mechanics are not secondary flavor text; they are the core of the item's rules text.
