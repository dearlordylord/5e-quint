# Wand of Secrets

## Verdict

`dm_agenda`

## Why no authored content file

`Wand of Secrets` fits the existing top-level record shape only superficially:

- `kind = "magic_item"` exists.
- `mechanics.family = "activation"` exists.
- `activationCost = action`, `resource = charge_pool`, and `resetCadence = dawn` all exist.

But the item's actual payoff is not a combat/runtime state change. Its effect is:

> "if a secret door or trap is within 60 feet of you, the wand pulses and points at the one nearest to you."

That is an information-reveal / hidden-world query plus a notification signal. The current surface has no honest core-mechanics atom for:

- querying nearby hidden features such as secret doors or traps;
- selecting the nearest matching feature;
- surfacing a directional cue ("pulses and points").

Under the architecture guidance embedded in `TAXONOMY_atoms_graph.md`, narrative notifications and caller-owned information surfaces stay out of the core atom inventory. This item's entire purpose is exactly that kind of informational reveal, so forcing it into `detect` or any other existing atom would produce a misleading trace.

## Why this is not a widening

I am not classifying this as `surface_widening` or `atom_widening` because the missing behavior is not a combat/state transition the current prototype is trying to own. The blocker is architectural ownership, not just a missing enum variant.

If the project later decides to model exploration-side hidden-object queries in core, this item would need a new caller-approved design for:

- hidden-feature discovery targets (`secret_door`, `trap`);
- nearest-match selection;
- directional signaling / reveal output.

That would be a broader architecture decision, not a local schema patch for this unit alone.
