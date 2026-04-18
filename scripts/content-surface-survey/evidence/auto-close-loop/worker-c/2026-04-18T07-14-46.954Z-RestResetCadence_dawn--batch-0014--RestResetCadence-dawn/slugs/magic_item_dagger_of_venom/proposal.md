`Dagger of Venom` does not fit the current magic-item surface honestly.

Why it fails:

- The passive half fits: `MagicItemRecord` + passive grant(s) can express the dagger's `+1` to attack rolls and damage rolls with a `specific_item` weapon filter.
- The activated half does not fit: coating the blade is not an immediate effect. It creates temporary armed state on the weapon that persists for up to 1 minute, waits for a later hit with that specific weapon, then resolves a target-side `save_gate` for the struck creature, and expires either on that hit or at timeout.

Current blocker:

- `MagicItemComponentMechanics` has `passive`, `activation`, and `triggered_reaction`, but no non-spell ongoing / armed-rider family.
- `ActivatedAbilityMechanics.phases` resolves immediately at activation time; it cannot plant a delayed rider on a weapon and wait for a future hit.
- Existing `Attachment` variants (`self`, `target`, `area`, `mark`) do not model a weapon-bound payload whose eventual target is chosen by the later attack hit.

Forced widening:

1. A new non-spell persistent rider shape for magic items, or a shared cross-kind "ongoing activated ability" family.
2. A weapon-bound delayed-hit subgraph:
   `activate` -> attach poison coat to specific weapon -> persist/expire (1 minute or on first hit) -> on later hit with that weapon open a target-side `save_gate` -> on fail deal poison damage and apply `poisoned`.

Why this is structural, not just a missing atom:

- The needed concepts (`damage`, `apply_condition`, `save_gate`, `persist`, `expire`) already exist.
- What is missing is the family/subgraph that connects an activation to a future weapon hit against an as-yet-unknown target.

Evidence from unit text:

> "You can take a Bonus Action to magically coat the blade with poison."

> "The poison remains for 1 minute or until an attack using this weapon hits a creature."

> "That creature must succeed on a DC 15 Constitution saving throw or take 2d10 Poison damage and have the Poisoned condition for 1 minute."

> "The weapon can't be used this way again until the next dawn."
