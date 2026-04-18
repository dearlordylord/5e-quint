## Instant Fortress

Verdict: `structural_widening`

`Instant Fortress` does not fit the current surface honestly, so no `content/magic_item_instant_fortress.dhall` was authored.

### Why it does not fit

The existing `magic_item` activation family is not sufficient for the item's primary mechanic.

First, the item has repeatable command-word activations with no tracked resource:

- "As a Magic action, you can ... cause it to grow rapidly into a square adamantine tower."
- "Repeating the command word causes the tower to revert to statuette form"
- "The door opens only at your command, which you can issue as a Bonus Action."

Current `ActivatedAbilityMechanics` requires both:

- `resource: ActivationResource`
- `resetCadence: RestResetCadence`

That makes resource-less, unlimited item activations unrepresentable without a fake `use_count` or fake recharge rule.

Second, the created tower is not a creature summon or a simple one-shot object mutation. It is a persistent structure with reversible state and retained damage:

- 20-foot-by-20-foot footprint, 30-foot height
- creatures and unattended objects in the footprint are pushed clear when it appears
- door command behavior
- AC / HP / immunities / resistances on door, roof, and walls
- damage persists when the tower shrinks back to statuette form
- only `Wish` repairs it

The current surface has:

- `Attachment.object`
- `EffectAtom.alter_item_kind`
- `EffectAtom.force_move`

But it does **not** have an honest object-creation / structure-state payload that can carry:

- persistent created object identity
- object durability stats
- damage immunities and resistances for the created structure
- reversible form changes tied to the same damaged structure
- occupancy / emptiness gating for reversion

### Narrowest honest widening

1. Add a resource-less repeatable activation variant for magic items.
   This could be an activation shape with optional `resource` / `resetCadence`, or a distinct at-will activation family.

2. Add a persistent created-structure subgraph.
   Minimum pressure from `Instant Fortress`:

- create a structure/object in the world
- optionally transform it between named forms
- preserve damage state across form changes
- carry object defenses and damage filters
- support simple command-state interactions like commanded door access

### Why this is structural, not just a small atom gap

Even before the tower-stat problem, the unit's main usage loop already fails the current mechanics-family contract because activations cannot be at-will and repeatable without an invented resource model. The created-tower mechanics then add a second independent gap around persistent structure state.
