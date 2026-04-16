# Proposal: Fear — surface_widening

## Unit

**Fear** — Level 3 Illusion, Concentration 1 min, 30-foot Cone, Wisdom save.

## Why it cannot be encoded honestly

Fear is an `activation`-family spell with a `save_gate` phase applied to an area. All four widenings below are blocking — none can be papered over with an existing surface type without lying about what the rule says.

---

## Widening 1 — Cone shape in area attachment (surface_widening)

**Gap:** `Attachment.area.shape` only has `{ kind: "sphere"; radiusFeet: number }`. Fear targets a 30-foot Cone, which is a directional frustum, not a sphere.

**Required addition to `types.ts`:**

```typescript
export type AreaShape =
  | { readonly kind: "sphere"; readonly radiusFeet: number }
  | { readonly kind: "cone"; readonly lengthFeet: number };
```

And update `Attachment.area.shape` to `AreaShape`.

**Evidence:** "Each creature in a 30-foot Cone must succeed on a Wisdom saving throw"

---

## Widening 2 — "frightened" condition (surface_widening)

**Gap:** `Condition = "prone"`. Frightened is a distinct SRD condition with unique mechanical effects (Disadvantage on attack rolls and ability checks while source is in sight; can't willingly move closer to source of fear).

**Required addition to `types.ts`:**

```typescript
export type Condition = "prone" | "frightened";
```

**Evidence:** "have the Frightened condition for the duration"

---

## Widening 3 — Per-target repeat save with LoS gate (surface_widening)

**Gap:** Fear has a per-target escape mechanism: if a frightened creature ends its turn without line of sight to the caster, it makes a Wisdom save; on success, the spell ends *on that creature* (not globally). The v4 taxonomy includes `repeat_save` (Resolution atoms) but this shape does not exist in the surface `ActivationPhase` union or anywhere in the ongoing-effect machinery.

This is distinct from the initial save: it fires per-turn, per-target, gated on a spatial predicate (LoS), and its success terminates the effect locally rather than globally.

**Required surface addition:** A new `ActivationPhase` variant (or `OngoingOperation` mechanism) for per-target repeat saves with a condition predicate, or a new spell family for "ongoing with per-target repeat save" semantics.

**Evidence:** "If the creature ends its turn in a space where it doesn't have line of sight to you, the creature makes a Wisdom saving throw. On a successful save, the spell ends on that creature."

---

## Widening 4 — Drop held items effect (atom_widening)

**Gap:** On a failed save, targets immediately drop held items. This is a forced item-release with no analog in the v4 atom inventory. `force_move` covers movement; `apply_condition` covers conditions; but there is no `disarm` or `drop_held_items` effect atom.

This is a secondary gap — if the three surface widenings above were resolved, this would still need a new v4 atom before the item-release part of the spell could be honestly traced.

**Evidence:** "drop whatever it is holding"

---

## Encoding path once widenings are merged

1. Add `cone` to `AreaShape`.
2. Add `"frightened"` to `Condition`.
3. Add `repeat_save` surface type (or a per-target-expiry hook on `save_gate`).
4. Add `drop_held_items` effect atom to v4 and surface.

With all four in place, Fear encodes as:

```
activation
  phases:
    save_gate (Wisdom, caster_spell_save_dc)
      attachment: area { shape: cone, lengthFeet: 30, origin: point_within_range }
      onFail: [
        drop_held_items (immediate),
        apply_condition "frightened" (for duration)
      ]
      repeat_save (Wisdom, per_target, on: turn_end_without_los_to_caster)
        onSuccess: expire (on that creature)
```
