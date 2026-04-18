## Cube of Force

Outcome: `structural_widening`

`Cube of Force` does not fit the current magic-item surface honestly.

Why it fails:

- The item exposes a single shared `charge_pool` with one recharge cadence: "The cube starts with 10 charges, and it regains 1d6 expended charges daily at dawn."
- The face table mixes ordinary spell casts (`Mage Armor`, `Tiny Hut`, `Private Sanctum`, `Resilient Sphere`, `Wall of Force`) with a reaction spell (`Shield`).
- Current magic-item mechanics force that choice into one of:
  - `activation` with one item-level `activationCost`, which would falsely model `Shield` as a normal action / Magic action cast, or
  - `triggered_reaction`, which would falsely model the non-reaction faces as reactions, or
  - `composite`, which would require duplicating the same charge pool + dawn recharge across separate action and reaction parts.

Why that duplication is not acceptable:

- The project rules explicitly forbid redundant state across layers.
- Duplicating one shared pool into separate parts would make invalid states representable, such as the action faces and the `Shield` face consuming different logical pools even though RAW gives the cube one pool of 10 charges.

Minimal honest widening:

- Add a mixed-casting-time magic-item spell menu shape with:
  - one shared resource/reset header (`charge_pool` + dawn recharge),
  - per-spell entries that preserve each granted spell's own casting time semantics,
  - optional fixed `dcOverride` per entry or per menu.

Suggested direction:

- Either a new magic-item mechanics family for "resource-backed spell menu", or a composite-level shared resource header that multiple parts can reference without duplicating state.

Evidence from unit text:

- "You can press one of those faces, expend the number of charges required for it, and thereby cast the spell associated with it (save DC 17), as shown in the Cube of Force Faces table."
- "The cube starts with 10 charges, and it regains 1d6 expended charges daily at dawn."
- Face table includes both `Shield` and non-reaction spells.
