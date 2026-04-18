## Folding Boat

Outcome: `surface_widening`

The unit fits the existing top-level `magic_item` kind, and its core transform effect matches the existing `alter_item_kind` atom on an `item` attachment. The current surface still cannot encode the item honestly for three separate reasons:

1. Unlimited non-spell item activations are missing.
   The existing `ActivatedAbilityMechanics` shape requires both `resource` and `resetCadence`. `Folding Boat`'s three command words are repeatable at will and do not consume charges, uses, rests, or cooldowns.

2. The fold-back command has an activation precondition.
   The third command word works only "if no creatures are aboard". There is no existing activation-side predicate for item state / occupancy.

3. Item destruction on attached form HP loss is missing.
   The item is destroyed when the rowboat or keelboat form is reduced to 0 Hit Points. Existing `ItemDestructionPolicy` only models charge-exhaustion destruction (`last_charge_roll`, `permanent_on_empty`), not destruction from an attached item's transformed form reaching 0 HP.

No new v4 atom is forced here:

- `alter_item_kind` already exists for the form changes.
- `item_destruction` already exists conceptually in the tracer.

What is missing is surface shape around activation economy / predicates / destruction triggers.

Suggested widenings:

- Add a resource-less activation variant or make `resource`/`resetCadence` optional for at-will non-spell activations.
- Add an activation predicate variant for item-state conditions such as "no creatures aboard".
- Add an `ItemDestructionPolicy` variant for destruction when the item's active transformed vessel form reaches 0 Hit Points.
