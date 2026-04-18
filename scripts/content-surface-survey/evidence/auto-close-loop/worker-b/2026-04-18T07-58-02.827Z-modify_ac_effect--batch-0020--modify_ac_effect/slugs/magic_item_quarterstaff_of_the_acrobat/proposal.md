## Quarterstaff of the Acrobat

Outcome: `structural_widening`

The current `magic_item` surface can encode:

- passive held-item bonuses;
- triggered-reaction item abilities with use counts and rest resets;
- composite items that combine passive and activated parts.

It cannot encode this item honestly because the item's mechanics are gated by a persistent internal **form state**:

- `quarterstaff`
- `10-foot pole`
- `6-inch rod`

Those forms are not cosmetic. They change which passive grants and reaction abilities exist:

- `Acrobatic Assist` applies only in Quarterstaff and 10-Foot Pole forms.
- `Attack Deflection` applies only in Quarterstaff form.
- `Ranged Weapon` applies only in Quarterstaff form.
- A Bonus Action can switch among forms, so the gating state is mutable during play.

`alter_item_kind` exists as an effect atom, but the authored surface has no way to:

- attach later passive/reaction parts to the altered item state;
- express "while this item is in form X, these grants apply";
- model a magic item whose own internal mode changes and enables/disables other mechanics.

That forces a new stateful item-mode subgraph or equivalent structural widening.

Additional gaps surfaced by this item:

1. `emit_light` / `suppress_light` atom or subgraph

Evidence:

> "you can cause it to emit green Dim Light out to 10 feet ... or you can extinguish the light"

The current surface has no light-emission effect atom.

2. Weapon-property mutation / return semantics surface

Evidence:

> "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet. Immediately after you make a ranged attack with the weapon, it flies back to your hand."

The current surface lacks an honest way to encode:

- granting weapon-property/range changes to the item itself;
- a post-attack return-to-hand behavior for the thrown weapon.

## Suggested widening shape

Minimum honest widening:

- new subgraph for **stateful item modes/forms**:
  - item stores a current form;
  - an activation can replace that form;
  - passive and triggered-reaction item parts can require a specific form or set of forms.

Possible names:

- `item_form`
- `item_mode`
- `switch_item_form`

Without that, any encoding would either:

- falsely grant Quarterstaff-only benefits in all forms, or
- omit major rules text that materially changes the item's behavior.
