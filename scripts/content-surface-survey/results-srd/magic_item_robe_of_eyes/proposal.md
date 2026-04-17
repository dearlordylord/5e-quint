## Robe of Eyes

Outcome: `surface_widening`

`Robe of Eyes` is mostly a passive magic item, but it is not honestly encodable with the current `MagicItemRecord` + `PassiveMechanics` surface.

What fits today:

- passive magic item record
- attunement gate
- `grant_sense` for Darkvision 120 ft and Truesight 120 ft
- `modify_roll_advantage` narrowed to Wisdom (Perception) checks

What does not fit honestly:

1. The Perception benefit is narrower than the current surface can say.

RAW: "The robe gives you Advantage on Wisdom (Perception) checks that rely on sight."

The surface can narrow `modify_roll_advantage` by skill via `skillFilter`, but it cannot express the additional sensory predicate "that rely on sight". Encoding plain advantage on Perception checks would overgrant.

Proposed widening:

- `new_variant`: add a roll predicate for sensory dependence on `modify_roll_advantage` / `modify_roll_numeric`, e.g. `senseRequirement: "sight" | "hearing" | ...`

2. The drawback is a triggered passive effect, not an activation and not a spell-family payload.

RAW: "A Light spell cast on the robe or a Daylight spell cast within 5 feet of the robe gives you the Blinded condition for 1 minute."

Current passive mechanics only support unconditional grants plus an optional equipment predicate. They cannot host deterministic trigger logic tied to outside events while the item is worn.

Proposed widening:

- `new_variant`: extend `PassiveMechanics` with triggered operations, parallel to spell `OngoingOperation`, so passive units can react to events while active

3. The drawback trigger shape is missing.

RAW: "A Light spell cast on the robe or a Daylight spell cast within 5 feet of the robe..."

Existing trigger grammar only covers reaction spell casting and a few ongoing spell windows. It does not express:

- a named spell cast on an equipped item
- a named spell cast within a proximity band of an equipped item

Proposed widening:

- `new_variant`: passive trigger variants for named-spell exposure on worn items / item-adjacent areas

4. The drawback's repeat save has trigger-dependent DC.

RAW: "At the end of each of your turns, you make a Constitution saving throw (DC 11 for Light or DC 15 for Daylight), ending the condition on yourself on a success."

The save cadence itself resembles existing `repeat_save`, but the DC depends on which trigger caused the blinded condition. There is no current way to carry trigger-selected save parameters through a passive item drawback.

Proposed widening:

- `new_subgraph`: passive-item triggered effect that applies a condition with attached repeat-save metadata parameterized by trigger branch

Why this is not `atom_widening`:

- All core effect atoms needed already exist in v4 or the surface: `grant_sense`, `modify_roll_advantage`, `apply_condition`, `repeat_save`.
- The gap is the authored surface's ability to compose them for passive magic items with external triggers and tighter predicates.

Why this is not `clean`:

- Omitting the drawback would materially misstate the item.
- Encoding generic advantage on all Perception checks would overstate the benefit.
