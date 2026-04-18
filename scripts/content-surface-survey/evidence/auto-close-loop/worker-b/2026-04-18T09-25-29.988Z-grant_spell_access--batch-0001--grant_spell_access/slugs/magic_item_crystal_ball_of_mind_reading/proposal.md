`Crystal Ball of Mind Reading` mostly fits the existing `magic_item` surface as a passive item that grants spell access:

- `Scrying` with a fixed DC 17 is representable with `grant_spell_access.dcOverride`.
- The extra `Detect Thoughts` cast is partly representable with `grant_spell_access.dcOverride` plus `targetRestriction = visible_target_within_feet` from `origin = spell_sensor`.

The current surface cannot encode the full second rider honestly, so no content file was authored.

Missing surface shapes

1. A touch-state equipment gate.
The item works only "while touching this crystal orb". The current `EquipmentPredicate` admits `holding_item`, `wearing_item`, and related states, but not a generic `touching_item` predicate.

Evidence:
> "While touching this crystal orb, you can cast Scrying (save DC 17) with it."

2. A grant-spell lifecycle override tied to another granted spell.
The item changes `Detect Thoughts` so it does not require concentration, but the spell then ends when the item-cast `Scrying` ends. `grant_spell_access` can override DC, area, and target restriction, but it cannot override concentration/duration behavior or express "this granted spell persists until that granted spell ends".

Evidence:
> "You don't need to concentrate on this Detect Thoughts spell to maintain it during its duration, but it ends if the Scrying spell ends."

Why this is `surface_widening`, not `atom_widening`

- Both mechanics are still about existing surface families:
  - passive magic-item spell grants;
  - lifecycle/concentration constraints on granted spellcasts.
- No new v4 effect atom is forced by the rules text here. The gap is an authoring-shape gap on existing surface types.
