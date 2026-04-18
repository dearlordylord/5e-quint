`Wand of Wonder` does not fit the current authored surface honestly, so no `content/magic_item_wand_of_wonder.dhall` was authored.

Why it stops:

- The top-level shell fits `MagicItemRecord` with an `activation` family: 7-charge pool, `holding_item`, Magic action, dawn recharge, and last-charge destruction all already exist.
- The failure is inside the effects table. The current surface can model a random table, but it cannot honestly express several branch payloads.

Required widenings

- `new_variant`: `ActivationPhase.cast_spell_by_id`
  - Justification: multiple outcomes immediately cast an existing spell from the wand, not grant future spell access.
  - Evidence: "You cast a spell originating from the chosen point."
  - Why existing shapes fail: `grant_spell_access` only grants access; it does not resolve the spell as part of this activation. `random_table` outcomes need a direct "cast this spell now" branch payload, with per-cast overrides.

- `new_variant`: chosen-origin / nearest-subject targeting primitives
  - Justification: several branches resolve from "the chosen point of origin" or target "the creature closest to the chosen point of origin."
  - Evidence: "choosing a point within 120 feet of yourself. That location becomes the point of origin..."
  - Evidence: "The creature closest to the chosen point of origin..."
  - Why existing shapes fail: current `Attachment` can target a point within range, but branch-local targeting relative to that chosen point and "closest creature/object to point" are not representable.

- `new_variant`: spell-cast override for item-cast range/origin
  - Justification: the wand changes the originating point and may extend a granted spell's maximum range to 120 feet.
  - Evidence: "If a spell's maximum range is normally less than 120 feet, it becomes 120 feet when cast from the wand."
  - Why existing shapes fail: `grant_spell_access` has `dcOverride` and target restriction only; it has no way to override the cast's origin or printed range.

- `new_atom`: obscured_area
  - Justification: two table branches create temporary areas that are mechanically Lightly or Heavily Obscured.
  - Evidence: "During that time, the area of effect is Lightly Obscured."
  - Evidence: "during which time the area of effect is Heavily Obscured."
  - Why existing atoms fail: no v4 atom in the current surface models obscuration as a persistent area property.

- `new_variant`: uncontrolled random creature spawn inside non-spell activation branches
  - Justification: one outcome creates an uncontrolled Rhinoceros / Elephant / Rat for 1 hour or until 0 HP.
  - Evidence: "The creature isn't under your control, acts as it normally would, and disappears after 1 hour or when it drops to 0 Hit Points."
  - Why existing shapes fail: creature spawning exists only as top-level spell families (`spawned_creature` / `reanimated_creature` / `templated_multi_spawn`), not as a branch payload inside a magic-item `activation` random table.

Secondary residues

- Several outcomes are mostly caller- or GM-owned and should not be forced into fake mechanics:
  - heavy rain / butterflies / grass / leaves / gem generation
  - "the GM determines randomly which among them are affected"
  - "an object of the GM's choice disappears into the Ethereal Plane"
- Those do not justify authoring a misleading placeholder record. The honest stopping point is before Dhall.
