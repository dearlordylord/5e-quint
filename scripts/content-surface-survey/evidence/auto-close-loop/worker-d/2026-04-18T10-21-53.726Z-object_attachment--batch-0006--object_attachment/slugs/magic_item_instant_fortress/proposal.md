`Instant Fortress` does not fit the shipped surface honestly, so no `content/magic_item_instant_fortress.dhall` was authored.

Why the current surface is insufficient:

- The item is not just a one-shot activation. It deploys a persistent world object with ongoing state.
- Reversion is gated by occupancy: the tower can shrink only if empty.
- Damage persists across forms: shrinking does not repair the tower.
- The deployed tower exposes later commands: the door opens only on the attuned user's Bonus Action command.
- The tower has object-facing defenses and repair rules, including a Wish-only repair path.

Why this is `structural_widening` instead of a narrower surface tweak:

- `MagicItemRecord` exists, and `activation` exists, but neither family can own a durable non-creature object lifecycle.
- `alter_item_kind` can describe a form swap, but not a deployed fortress with persistent HP/AC/immunities, occupancy checks, commandable sub-parts, and cross-form damage carryover.
- The missing concept is not just one extra enum variant on an existing field. It is a new mechanics subgraph for created/deployed objects.

Minimal honest widening:

- Add a deployed-object subgraph for magic items:
  - deploy/create object
  - persistent object state
  - revert/restore with predicates such as `only_if_empty`
  - object stat block or object defenses
  - later commands against the deployed object or named subparts
- Add a `create_object` effect atom on the authored surface to represent the tower entering play as an object, not merely the statuette changing label.

RAW evidence driving the widening:

- "cause it to grow rapidly into a square adamantine tower"
- "works only if the tower is empty"
- "Shrinking the tower back down to statuette form doesn't repair damage to the tower."
- "The door opens only at your command, which you can issue as a Bonus Action."
