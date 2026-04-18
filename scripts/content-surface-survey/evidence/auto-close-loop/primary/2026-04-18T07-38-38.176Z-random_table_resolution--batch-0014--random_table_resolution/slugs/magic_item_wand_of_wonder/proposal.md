## Wand of Wonder

Outcome: `atom_widening`

The top-level item shape already fits:

- `magic_item`
- `activation`
- `condition = holding_item`
- `activationCost = action` / Magic action
- `resource = charge_pool`
- `resetCadence = dawn`
- `destruction = last_charge_roll`
- `random_table` for the d100 effect table

I stopped before authoring because the table payload does not fit honestly.

### Blocking gaps

1. `create_obscured_area` is missing from v4 and the TS surface.
Evidence:
`During that time, the area of effect is Lightly Obscured.`
`The butterflies remain for 10 minutes, during which time the area of effect is Heavily Obscured.`

Why this matters:
These rows are deterministic mechanical area effects, not just flavor. Existing caller-owned handling of obscuration in some spell encodings is not enough here because these rows are themselves the primary payload of the table result.

2. `Attachment.object` is missing from the authored surface.
Evidence:
`An object of the GM's choice disappears into the Ethereal Plane.`

Why this matters:
`transport_exile` already exists, and `ethereal_plane` already exists, but only creature/self/area/mark attachments are currently available in `types.ts`.

3. `TargetSelection.closest_to_point` is missing.
Evidence:
`The creature closest to the chosen point of origin is enlarged ...`
`You cast Polymorph, targeting the creature closest to the chosen point of origin.`
`The creature closest to the chosen point of origin makes a DC 15 Constitution saving throw.`

Why this matters:
The table repeatedly chooses the nearest creature to a chosen point. Current target selection cannot express proximity-based deterministic targeting.

4. Random-table branches cannot honestly emit spawned-creature payloads.
Evidence:
`A magically formed creature appears in an unoccupied space as close to the chosen point of origin as possible.`

Why this matters:
The surface can model spawned creatures only as a top-level spell family, not as a branch of `ActivationPhase.random_table`. For Wand of Wonder, creature creation is one possible table outcome inside an activation-shaped magic item.

### Secondary pressure

- Random subject choice among multiple legal subjects:
  `If an effect has multiple possible subjects, the GM determines randomly which among them are affected.`
- Line-direction override from caster to chosen point for `Gust of Wind` and `Lightning Bolt`.
- Some rows are likely still caller-owned or intentionally omitted if the main blockers were solved:
  overgrown grass, leaves growing from a creature, and gem-value generation.

### Why this is `atom_widening`, not `surface_widening`

If the only issue were object attachment or nearest-target selection, this would be `surface_widening`.

But the obscuration rows force a new mechanics atom not present in the v4 inventory or the authored TS surface, so the narrowest honest classification is `atom_widening`.
