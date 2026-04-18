`Instant Fortress` should not be coerced into the current authored surface.

Why it does not fit cleanly:

- The unit is still a `magic_item`, so this is not a missing top-level kind.
- The closest family is `activation` or `composite`, but the actual mechanic is a stateful deployed object, not a one-shot creature-facing effect.
- Current activation phases cannot attach to an `object` or `item`; they only support `self`, `target`, `area`, and `mark`.
- The surface has `alter_item_kind`, but no honest `create_object` payload for a persistent tower with structural stats and carry-over damage.

Concrete pressure from the text:

- Deploys a tower from the statuette:
  - "cause it to grow rapidly into a square adamantine tower"
- Reverts later, but only under an object-state predicate:
  - "Repeating the command word causes the tower to revert to statuette form, which works only if the tower is empty."
- Forces creature displacement on creation:
  - "Each creature in the area where the tower appears is pushed to an unoccupied space outside but next to the tower."
- Also moves unattended objects:
  - "Objects in the area that aren't being worn or carried are also pushed clear of the tower."
- Carries persistent structural damage across forms:
  - "Shrinking the tower back down to statuette form doesn't repair damage to the tower."
- Supports later object-specific commands:
  - "The door opens only at your command, which you can issue as a Bonus Action."

Minimal honest widening:

- Add `Attachment.object` / `Attachment.item` so activations can target the deployed fortress or its door.
- Add a surface representation for v4-style `create_object` so the tower can exist as a persistent object with stats.
- Add a deployed-object toggle subgraph that can:
  - deploy the object,
  - push creatures clear on creation,
  - gate reversion on `tower is empty`,
  - preserve HP across deployed/statuette states,
  - allow later commands against the deployed object.

Why this is `surface_widening`, not `atom_widening` or `structural_widening`:

- The top-level `magic_item` kind already exists.
- The unit still behaves like a magic-item activation/composite overall.
- The main gap is that the current TS surface and tracer do not expose object attachment / created-object state, even though the broader taxonomy already anticipates object-side mechanics.
