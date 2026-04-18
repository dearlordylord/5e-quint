## Brazier of Commanding Fire Elementals

Outcome: `structural_widening`

This unit does not fit an existing `MagicItemMechanics` family honestly.

The core mechanic is not passive, not a standard activation over `ActivationPhase`, and not a triggered reaction. It is a magic-item activation that:

- consumes a `Magic action`
- creates a companion (`Fire Elemental`)
- grants command semantics
- fixes initiative behavior (`immediately after you on your Initiative count`)
- sets dismissal / expiry rules
- locks reuse until dawn

Those semantics already exist in the surface, but only under spell-only `spawned_creature` mechanics. `MagicItemComponentMechanics` currently admits only:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`
- `TriggeredReactionAbilityMechanics`

So the narrow honest widening is to allow a magic item component to use a spawned-creature payload family, rather than forcing this item into a fake direct-effect activation.

### Required widening

Add a magic-item companion-summon variant, e.g.:

- `MagicItemComponentMechanics.spawned_creature`

or a shared non-spell companion-summon family reusable by spells and magic items.

Evidence:

> While you are within 5 feet of this brazier, you can take a Magic action to summon a Fire Elemental.

### Secondary surface gaps

Even after the family widening, two existing item-side shapes are still too narrow:

1. `EquipmentPredicate` cannot express proximity to a placed item.

Evidence:

> While you are within 5 feet of this brazier

2. The summon origin is the item's position, not the caster's.

Evidence:

> The elemental appears in an unoccupied space as close to the brazier as possible

Existing spell summon range/origin handling is caster-centered. This item needs an item-anchored origin.

### Why no placeholder content file was authored

Encoding this as a plain magic-item `activation` with a fabricated direct effect would lose the unit's actual mechanics:

- no honest `create_companion` / `command_companion` path for magic items
- no honest expression of the brazier-centered placement rule
- no honest expression of the proximity gate

Per protocol, that is worse than emitting no trace.
