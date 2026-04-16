# Proposal: Eversmoking Bottle — structural_widening

## Summary

The Eversmoking Bottle cannot be encoded. The primary stopper is that `magic_item` is not a valid `UnitRecord` kind: `types.ts` defines `UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord` with no `MagicItemRecord`. Even if that gap were closed, the item's mechanics would require five additional widenings across surface types, scaling, and atoms.

No Dhall, JSON, or trace was produced.

---

## Gap 1 — Missing `MagicItemRecord` (structural_widening)

`UnitRecord` has no `magic_item` discriminant and no associated mechanics family. The v4 taxonomy lists `magic_item_root` as a valid source atom, but that atom has never been backed by a corresponding schema type.

**Forced by:** The unit is tagged `kind: magic_item`.

---

## Gap 2 — Missing `magic_action` activation cost (surface_widening)

The bottle is activated with a Magic action ("As a Magic action, you can open or close this bottle."). The existing `ClassFeatureActivationCost` union only supports `free` and `bonus_action`. A `magic_action` variant (or an equivalent on a future item-activation cost type) is needed to consume the correct action quota.

---

## Gap 3 — Missing toggle/dual-state family (structural_widening)

The item has a stateful open/close toggle with two meaningfully distinct persistent states:

- **Open state:** Active emanation, grows over time, moves with the bottle.
- **Closed state:** Cloud detaches from the bottle and becomes a fixed, slowly dispersing zone.

No existing mechanics family models this pattern. The `activation` family is one-shot; `ongoing_effect` has no concept of a user-initiated transition to a second persistent state with different lifecycle behavior. A new family — tentatively `toggle_persistent` or `item_channel` — would be needed.

---

## Gap 4 — Missing `emanation_from_object` attachment (surface_widening)

The smoke fills a **60-foot Emanation originating from the bottle** (an item), not from a creature. Current `Attachment` kinds:

- `self` — creature-centric
- `target` — a chosen creature
- `area` — a placed area with a point-within-range or on-primary-target origin
- `mark` — a persistent binding on a creature

None of these models an area that originates from and moves with a held or placed item. An `item` or `object` attachment variant is needed, or the `area` kind needs an `origin: on_held_item` option.

---

## Gap 5 — Missing time-based area scaling (surface_widening / atom_widening)

The Emanation grows 10 ft per minute while open, from 60 ft to a cap of 120 ft. Existing `LevelAxis` values are:

```
"character" | "class" | "slot" | "subclass" | "proficiency_bonus"
```

None cover time-elapsed (per-minute) growth. A new axis variant (e.g., `"elapsed_minutes"`) or a separate "growing_area" scaling shape is needed. This is also the first documented case of time-based area expansion in the item survey.

---

## Gap 6 — Missing heavy-obscurement area effect atom (atom_widening)

"The area within the smoke is Heavily Obscured." This is a vision-blocking environmental effect applied to an area. The v4 taxonomy has `block_targeting` (prevents targeting) but no atom for granting obscurement to a zone. Heavily Obscured is a SRD-defined visibility state that affects attack rolls, hiding, and spell targeting — it is mechanically distinct from `block_targeting`. A new atom, tentatively `apply_obscurement` with a severity parameter (`"heavy"` vs `"light"`), would be needed.

---

## Gap 7 — Missing dual-condition dispersal lifecycle (surface_widening)

The fixed cloud disperses under two independent conditions:
1. After 10 minutes (timer).
2. After 1 minute in a strong wind (named environmental event, cited as *Gust of Wind*).

The existing `Duration` type supports `instantaneous`, `concentration.upTo`, and `timed`. None has a conditional-override branch. A new `Duration` variant — tentatively `dispersible` or `conditional_timed` — with a secondary trigger (environmental event or named-effect reference) would be needed to represent either dispersal path.

---

## Widening inventory

| # | Kind | Name | Classification |
|---|------|------|----------------|
| 1 | `new_subgraph` | `MagicItemRecord` + magic item mechanics family | structural_widening |
| 2 | `new_variant` | `ClassFeatureActivationCost.magic_action` | surface_widening |
| 3 | `new_subgraph` | toggle_effect / dual-state persistent family | structural_widening |
| 4 | `new_variant` | `Attachment.emanation_from_object` | surface_widening |
| 5 | `new_variant` | `LevelAxis.elapsed_minutes` or time-growth scaling | surface_widening |
| 6 | `new_atom` | `apply_obscurement` (area vision-blocking effect) | atom_widening |
| 7 | `new_variant` | `Duration` conditional dispersal branch | surface_widening |

---

## Recommendation

The primary prerequisite is adding `MagicItemRecord` and a minimal magic-item mechanics family to `types.ts`. Given the number of secondary widenings (particularly the toggle pattern and time-based area growth), the Eversmoking Bottle is a high-complexity pressure case and should probably be encoded after simpler magic items (passive attunement items, one-shot charged items) have established the baseline record structure.
