`Instant Fortress` does not fit the current surface honestly enough to author a placeholder `content/magic_item_instant_fortress.dhall`.

Classification: `surface_widening`

Why this is not `structural_widening`

- The top-level kind is still `magic_item`.
- The item is still activation-shaped: a Magic action deploys it, later commands interact with the deployed form, and reversion is another activation.
- The blocker is not the absence of a magic-item family. The blocker is that the existing surface cannot represent the specific object-state payload the activation creates and then reuses.

Primary surface gaps

1. Missing object-creation effect variant

- Core rule text: "cause it to grow rapidly into a square adamantine tower."
- The current `EffectAtom` union has `alter_item_kind`, but that is only a label-level kind swap on an existing targeted item/object.
- `Instant Fortress` needs an honest created-object / created-structure payload that can carry at least:
  - footprint / dimensions: 20-foot square, 30-foot height
  - durable object identity in play
  - durability profile: AC, HP, resistances, immunities
  - initial appearance rider that pushes creatures and unattended objects clear

2. Missing persistence / reversion linkage for the created structure

- Core rule text: "Repeating the command word causes the tower to revert to statuette form, which works only if the tower is empty."
- Core rule text: "Shrinking the tower back down to statuette form doesn't repair damage to the tower."
- The surface cannot currently:
  - reference the same deployed tower across later activations,
  - gate reversion on occupancy,
  - preserve accumulated damage across form changes,
  - target later commands at that same created instance.

Secondary pressure not modeled cleanly today

- Bonus-action command of the door:
  - "The door opens only at your command, which you can issue as a Bonus Action."
- Repair exception:
  - "Only a Wish spell can repair the tower."
- Anti-tip and magic-immunity rider:
  - "Magic prevents the tower from being tipped over."
  - "It is immune to the Knock spell and similar magic."

These matter, but they are downstream of the bigger surface problem: the prototype has no honest way to create and persist the tower object itself.

Why I did not coerce this into current JSON

- Encoding only the push-clear rider would produce a false trace that omits the item's main mechanic.
- Encoding only `alter_item_kind` would be misleading because it would not express the tower as a persistent, damageable structure with reversion state.
- Encoding the tower as a `companion` would also be false: it is an object/structure, not a creature.

Recommended widening direction

1. Add an `EffectAtom.create_object` surface variant aligned with the existing v4 taxonomy name.
2. Let that payload describe a durable structure/object profile, including dimensions and defenses.
3. Add a way for later magic-item activations to reference the created object instance and preserve its state across deploy/revert cycles.
