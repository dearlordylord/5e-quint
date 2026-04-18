## Stone of Controlling Earth Elementals

Outcome: `surface_widening`

The unit fits the existing `magic_item` + `spawned_creature` family closely enough to author, but two details are not representable honestly without placeholders:

1. Activation precondition is narrower than `holding_item`.
The item requires the user to be touching the stone to the ground while activating it. The current activation gate vocabulary can say `holding_item`, but it cannot express "holding and touching the item to the ground".

Proposed widening:
- New variant on the activation/equipment predicate surface for an item-ground-contact precondition, such as `touching_ground_with_item`.

Evidence:
> "While touching this 5-pound stone to the ground, you can take a Magic action to summon an Earth Elemental."

2. Summoned-creature control requires invented values when RAW leaves them unstated.
The item says the elemental obeys commands and acts immediately after the user, but it does not state a command range or what the elemental does absent commands. `CreatureControl` currently requires both `commandRangeFeet` and `defaultBehavior`, so the authored record had to use placeholders.

Proposed widening:
- Allow `CreatureControl.commandRangeFeet` to be optional or admit an explicit `unspecified` / `no_stated_limit` variant.
- Allow `CreatureControl.defaultBehavior` to be optional when RAW only says the creature obeys commands.

Evidence:
> "The elemental appears in an unoccupied space you choose within 30 feet of yourself, obeys your commands, and takes its turn immediately after you on your Initiative count."

## Trace discrepancy

The current tracer accepts the authored JSON but does not surface some existing spawned-creature fields in the trace output:

- `turnOrder = "immediately_after_caster"` is not reflected in emitted atoms/relations.
- `dismissal.manualDismiss = "bonus_action"` is not reflected in emitted atoms/relations.

That is a tracer coverage gap, not a new atom requirement. The authored JSON still carries those fields.
