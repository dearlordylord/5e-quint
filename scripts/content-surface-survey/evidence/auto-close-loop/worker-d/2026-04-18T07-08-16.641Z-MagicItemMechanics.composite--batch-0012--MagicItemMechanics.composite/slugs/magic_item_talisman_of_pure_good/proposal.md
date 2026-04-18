## Talisman of Pure Good

Outcome: `structural_widening`

This item does not fit the current magic-item surface honestly, so no `content/magic_item_talisman_of_pure_good.dhall` was authored.

Why it does not fit:

1. The item combines three distinct mechanics:
   - a passive held/worn rider: `+2` to spell attack rolls;
   - an activated charge ability: **Pure Rebuke**;
   - a standing retaliatory trigger on hostile contact / continued carrying:
     "A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage and takes the damage again each time it ends its turn holding or carrying the talisman."

2. Current `MagicItemComponentMechanics` only allows:
   - `passive`
   - `activation`
   - `triggered_reaction`

   There is no magic-item component that can express an ongoing triggered rule attached to the item while it is worn/held/carried.

3. **Pure Rebuke** also forces an effect gap:
   - "On a failed save, the target falls into the fissure and is destroyed, leaving no remains."

   The current surface has no honest effect atom for deterministic creature destruction / annihilation.

Proposed widenings:

1. `new_variant`: magic-item ongoing component
   - Add an ongoing-trigger-capable component to `MagicItemComponentMechanics`, parallel to spell `ongoing_effect`, so magic items can express standing triggered rules while worn/held.
   - Evidence: "A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage and takes the damage again each time it ends its turn holding or carrying the talisman."

2. `new_atom`: destroy_target
   - Add a deterministic effect atom for effects that destroy a creature outright and leave no remains.
   - Evidence: "On a failed save, the target falls into the fissure and is destroyed, leaving no remains."

Secondary surface pressure if the structural gap is solved:

- The contact rider wants a trigger grammar along the lines of:
  - `on_creature_touches_item`
  - `on_holder_turn_end`
- It also wants target narrowing to `Fiend | Undead`.

I did not author a partial encoding because omitting either the touch/hold retaliation or the destruction branch would produce a misleading trace.
