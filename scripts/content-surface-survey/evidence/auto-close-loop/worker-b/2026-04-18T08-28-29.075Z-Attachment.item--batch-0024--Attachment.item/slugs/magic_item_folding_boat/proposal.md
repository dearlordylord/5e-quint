`Folding Boat` does not fit the current surface honestly, but the gap is a surface gap rather than a missing v4 atom.

Why it almost fits:

- `MagicItemRecord` already exists.
- `alter_item_kind` already exists and matches the core transformation mechanic:
  - box -> Rowboat
  - box -> Keelboat
  - vessel -> box
- `Attachment.kind = "item"` already exists and is the right attachment target.

What blocks an honest encoding:

1. `ActivatedAbilityMechanics` requires a resource + reset cadence.

The item text says:

> "This item also has three command words, each requiring a Magic action to use"

Those command-word uses are repeatable and do not spend charges, uses, or any other bounded pool. The current activation surface requires:

- `resource: ActivationResource`
- `resetCadence: RestResetCadence`

There is no honest variant for "repeatable activation with no expendable resource".

Proposed widening:

- `new_variant`: `ActivationResource = { kind: "none" }`
  - or equivalently make `resource`/`resetCadence` optional for unlimited activations.
  - This is the narrowest fix because the activation family already exists and the action cost is already expressible as:
    - `activationCost = { kind = "standard_action", action = "magic" }`

2. `ItemDestructionPolicy` cannot express destruction from vessel-form HP loss.

The item text says:

> "If either vessel is reduced to 0 Hit Points, the Folding Boat is destroyed."

Current `ItemDestructionPolicy` only supports:

- `none`
- `last_charge_roll`
- `permanent_on_empty`

Those all model exhaustion of uses/charges, not destruction caused by the attached transformed item form reaching 0 HP.

Proposed widening:

- `new_variant`: `ItemDestructionPolicy = { kind: "destroy_on_attached_form_zero_hp" }`
  - Narrowly scoped to transformed item/object forms.

3. The fold-back command has an activation predicate the surface cannot state.

The item text says:

> "The Folding Boat folds back into a box if no creatures are aboard."

Current activation mechanics have no generic non-equipment predicate for "only if no creatures are aboard the attached item".

Proposed widening:

- `new_variant`: activation predicate for item occupancy, e.g.
  - `{ kind: "item_has_no_creatures_aboard" }`

Classification:

- `surface_widening`

Rationale:

- No new v4 effect atom is needed. `alter_item_kind` already exists.
- No new top-level record kind or mechanics family is needed. `magic_item` + activation/composite is already the right family.
- The missing pieces are variants on existing authored-surface shapes.
