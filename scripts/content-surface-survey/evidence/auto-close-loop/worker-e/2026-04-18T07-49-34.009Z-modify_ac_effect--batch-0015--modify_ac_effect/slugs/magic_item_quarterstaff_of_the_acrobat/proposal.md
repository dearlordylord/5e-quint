# Quarterstaff of the Acrobat

Outcome: `atom_widening`

## Why I stopped

The item fits the existing top-level record kind and overall composition shape:

- `magic_item`
- composite mechanics:
  - passive held weapon bonuses
  - bonus-action activations
  - triggered-reaction defensive rider

That means this is **not** a structural-family failure.

I stopped before authoring because the mechanics still force unsupported concepts, and at least one of them is beyond the current v4-authored surface rather than being only a missing family wrapper.

## Blocking gaps

### 1. Light emission is missing as a mechanics atom

RAW:

> While holding this weapon, you can cause it to emit green Dim Light out to 10 feet, either as a Bonus Action or after you roll Initiative, or you can extinguish the light as a Bonus Action.

This is deterministic rules text, not DM-agenda flavor. The surface has no atom for granting/toggling illumination radius, and the v4 taxonomy excerpt provided here does not include a light-emission atom either. That makes this an `atom_widening` blocker.

Suggested widening:

- new atom: `emit_light`
  - fields likely needed:
    - light kind / brightness (`dim`)
    - radius (`10 feet`)
    - optional color as descriptive metadata (`green`)
    - toggled state via activation / reaction windows

### 2. `alter_item_kind` exists, but there is no honest attachment for “the item itself”

RAW:

> While holding this weapon, you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff.

The effect atom `alter_item_kind` already exists, so this is not a new atom. But the current `ActivationPhase.attachment` grammar only allows `self | target | area | mark`. There is no object/item attachment for an activation that targets the held weapon itself.

Suggested widening:

- new `Attachment` variant for item/object targeting

Classification for this gap alone: `surface_widening`

### 3. Form-specific gating is missing

RAW:

> Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only).
>
> Attack Deflection (Quarterstaff Form Only).
>
> Ranged Weapon (Quarterstaff Form Only).

Existing predicates only cover states like holding/wearing/wielding/unarmored. They do not express “this grant only applies while the item is currently in transformed form X/Y”.

Suggested widening:

- new predicate / condition shape keyed to the current item form or component state

Classification for this gap alone: `surface_widening`

### 4. Reaction AC is scoped only to the triggering attack

RAW:

> ... gaining a +5 bonus to your Armor Class against the triggering attack ...

Current `modify_ac` is a general AC modifier. The surface does not express “only for the triggering attack” on a reaction item ability. Encoding this as plain `modify_ac +5` would lie about duration/scope.

Suggested widening:

- either widen `modify_ac` with a trigger-scoped duration/count/scope
- or introduce a narrower reaction-defense shape for “AC against triggering attack”

Classification for this gap alone: `surface_widening`

### 5. Thrown-range grant and return-to-hand are not honestly representable

RAW:

> This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet. Immediately after you make a ranged attack with the weapon, it flies back to your hand.

Two pieces are missing:

- weapon-range/property modification on a specific item form
- post-attack return of the item to the wielder

The v4 taxonomy includes `modify_range`, so surfacing that would likely be a `surface_widening`. The immediate return behavior appears to need a dedicated item-return subgraph or equivalent surface support.

## Honest verdict

Because the light-emission clause requires a missing mechanics atom, the narrowest honest overall classification is:

- `atom_widening`

Even if light emission were set aside, the item would still need several surface widenings before it could be authored without distorting the rules text.
