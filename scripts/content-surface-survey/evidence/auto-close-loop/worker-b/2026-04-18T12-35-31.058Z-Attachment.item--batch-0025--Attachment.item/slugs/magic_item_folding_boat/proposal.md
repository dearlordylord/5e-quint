## Folding Boat

Verdict: `surface_widening`

`Folding Boat` is close to an honest `magic_item` composite:

- passive box-side storage
- activated item-form changes via `alter_item_kind`
- transformed-form destruction when the vessel is wrecked

The existing surface already has the right effect atom for the form changes:

- `alter_item_kind` can represent `box -> rowboat`, `box -> keelboat`, and `vessel -> box`

The current schema still cannot author the item honestly for three separate reasons.

### 1. Activated magic items currently require a tracked expendable resource

`ActivatedAbilityMechanics` requires both:

- `resource: ActivationResource`
- `resetCadence: RestResetCadence`

That works for wands, staffs, and other charge/use-count items, but not for repeatable command-word items with no pool and no recharge schedule.

RAW pressure:

> This item also has three command words, each requiring a Magic action to use:

What is needed:

- a surface widening that allows a magic-item activation with only an action cost and no expendable `resource`
- equivalently, a new `ActivationResource` / activation-header variant representing `unlimited`

Without that widening, any authored activation would have to lie by inventing charges or uses.

### 2. Item destruction is tied to transformed vessel HP, not charge exhaustion

`ItemDestructionPolicy` currently supports:

- `none`
- `last_charge_roll`
- `permanent_on_empty`

`Folding Boat` is destroyed by damage to one of its transformed vessel forms instead.

RAW pressure:

> If either vessel is reduced to 0 Hit Points, the Folding Boat is destroyed.

What is needed:

- a new `ItemDestructionPolicy` variant for destruction on transformed-form / vessel HP reaching 0

This is a surface gap, not an atom gap. The taxonomy already has lifecycle space for destruction-like consequences; the authored surface just does not expose this trigger.

### 3. Box-form storage exists, but the unit text here gives no numeric storage capacity

The current `container_storage` effect requires explicit numeric fields:

- `maxWeightPounds`
- `maxVolumeCubicFeet`

This unit text says the box can store items, and that fitting items remain/return when folding, but it does not give a numeric storage profile in the provided text.

RAW pressure:

> It can be opened to store items inside.

> Any objects in the vessel that can't fit inside the box remain outside the box as it folds. Any objects in the vessel that can fit inside the box do so.

What is needed:

- either a storage variant that can represent item storage without numeric capacity
- or a separate box-capacity / fit-check surface for object-form containers

### Why this is not `atom_widening`

This is not blocked on a missing v4 atom:

- `alter_item_kind` already exists and is explicitly documented in `types.ts` as a Folding Boat pressure case

The blockers are all schema-shape gaps inside existing families, so the narrowest honest classification is `surface_widening`.
