## Hat of Many Spells

Verdict: `structural_widening`

I did not author `content/magic_item_hat_of_many_spells.dhall`.

The item has a superficial top-level fit as a composite magic item with:

- a passive held-item rider (`Spellcasting Focus`)
- an activated property (`Unknown Spell`)

But the core `Unknown Spell` property does not fit the current surface honestly.

### Primary blocker

The current surface can grant access to a named spell via `grant_spell_access`, but this item does something broader and higher-order:

- choose an arbitrary eligible Wizard spell you do not know
- require that it is level 1+, on the Wizard list, of a level you can cast, and without costly Material components above 1,000 GP
- expend a spell slot of the chosen spell's level
- make an Intelligence (Arcana) check against `10 + spell level`
- on success, cast that chosen spell using its normal casting time and normal mechanics
- on failure, branch into a separate random table instead
- only lock out reuse until a Short or Long Rest on success

That is not just a missing atom. It needs a higher-order subgraph that can select a spell from a constrained spell-list query, consume the chosen spell's slot, gate the cast behind an ability check, and then delegate into the selected spell's own mechanics and casting-time shape.

### Secondary blockers in the failure table

Even if the main "unknown spell" cast path existed, the failure table still exceeds the current payload surface:

- object creation branches: "You pull a nonmagical object out of the hat."
- temporary magic-item creation branch: "You pull a magic item out of the hat."
- uncontrolled creature appearance branches: "The creature isn't under your control and acts as it normally would"
- hostile swarm branch
- persistent portal branch: "A vertical, 10-foot-diameter, two-way portal to another plane of existence opens"

Current `RandomTableSpec` outcomes only carry `EffectAtom[]` or a nested table. They cannot dispatch into a spawned-creature payload, temporary item/object creation payload, or a portal payload.

### Widenings forced

1. `new_subgraph`: `attempt_selected_spell_cast`
   - Why: the unit attempts to cast an arbitrary eligible spell, not a named authored spell.
   - Needed capabilities:
     - spell-list query / eligibility filter
     - chosen-spell slot consumption
     - dynamic ability-check DC based on chosen spell level
     - delegation to the chosen spell's own casting time and mechanics on success
     - success-only cooldown

2. `new_variant`: `RandomTableOutcome.mechanics`
   - Why: some failure branches need to dispatch into full payload families or other structured mechanics, not just `EffectAtom[]`.
   - Pressure cases here:
     - uncontrolled creature appearance
     - hostile swarm appearance
     - portal opening
     - object / temporary magic-item creation

### Not the main blocker

`Spellcasting Focus` is also not represented cleanly in the current atom surface, but it is not the reason this unit fails. The structural issue is the `Unknown Spell` property.
