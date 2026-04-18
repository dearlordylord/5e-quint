# Proposal: Widenings for Moonbeam

## Unit

- **Slug**: `moonbeam`
- **Kind**: spell
- **Level**: 2 (Evocation, Concentration up to 1 min)
- **Provenance**: SRD 5.2.1

## Encoding Status: `atom_widening` (partial dhall authored)

Moonbeam belongs to the `ongoing_effect` family — concentration-based, attaches to a persistent area, triggers saves on creatures that interact with that area. The structural family is correct, and a partial encoding covering the core damage mechanic was authored and typechecks successfully.

### What fits since the prior run

Several gaps from the previous Moonbeam result (`surface_widening`, now superseded) have been resolved by surface widenings applied since that run:

- **Cylinder shape** — `{ kind: "cylinder", radiusFeet: number, heightFeet: number }` is now in `AreaShapeDescriptor`. Moonbeam's 5 ft × 40 ft cylinder encodes cleanly.
- **`save_gate` in `OngoingEffect`** — the ongoing operation can now carry a full `save_gate` with ability, DC, onFail, onSuccess. Entry and turn-start triggers both author as homogeneous save_gate operations.
- **`reposition_attachment` atom** — now in `EffectAtom`. "Take a Magic action to move the Cylinder up to 60 feet" maps to `on_caster_spends_action { kind: standard_action, action: magic }` + `reposition_attachment { maxMoveFeet: 60 }`. **Expressible but omitted from the dhall** due to Dhall list homogeneity (see below).
- **`on_creature_enters_area` trigger** — covers creatures entering the cylinder mid-duration.
- **`emit_light` atom** — "Dim Light fills the Cylinder" maps to `emit_light { brightRadiusFeet: 0, dimAdditionalFeet: 5 }` on a `passive` trigger. **Expressible but omitted from the dhall** due to Dhall list homogeneity (see below).

### Dhall homogeneity constraint

The operations list must be homogeneous in Dhall. Moonbeam ideally needs four operations:

| Trigger | Effect |
|---|---|
| passive | emit_light |
| on_creature_enters_area | save_gate |
| on_attached_turn_start (proxy) | save_gate |
| on_caster_spends_action (magic) | reposition_attachment |

The three different effect shapes (emit_light, save_gate, reposition_attachment) cannot coexist in one Dhall list without the Optional-field hack. The dhall encodes the two save_gate operations only, which are homogeneous. The emit_light and reposition_attachment operations are noted as omitted but expressible — they would need a JSON-level multi-op encoding or the Optional-field trick.

---

## Gap 1 — Shape-shift revert (new atom: `revert_form`)

**SRD text**: "if the creature is shape-shifted (as a result of the Polymorph spell, for example), it reverts to its true form"

This fires conditionally (only if the creature is currently in a non-true form) as part of the save_gate's onFail branch. The v4 taxonomy has `transform_target` (apply a polymorphed form) but no inverse. Options:

- `end_ongoing_spells` — too coarse: it would end all concentration spells up to a level, not just the transform-causing effect.
- A new `revert_form` atom that undoes the current shape-shift, whatever its source (spell, wild shape, monster trait).

**Proposed atom**:
```typescript
| {
    readonly kind: "revert_form";
    // No fields needed — always reverts to true form.
    // "if shape-shifted" is a runtime predicate, not a surface field.
  }
```

This would appear in the `onFail` composite alongside the damage atom.

---

## Gap 2 — Shape-shift suppression (new atom: `suppress_shape_change`)

**SRD text**: "can't shape-shift until it leaves the Cylinder"

After reverting, the creature cannot use any shape-changing ability (Polymorph, Wild Shape, Shapechange, natural traits) while it remains within the cylinder. The suppression ends when the creature exits the area attachment — an expiry type that doesn't exist in `RiderExpiry` or `ConditionExpiry`.

This could be modeled as:
1. A new `EffectAtom` variant:
   ```typescript
   | {
       readonly kind: "suppress_shape_change";
       readonly expiresOn: "leaves_area";
     }
   ```
2. Or a new `Condition` literal ("shape_change_suppressed") with an area-exit expiry.

Either way, the concept of "condition/suppression that expires when the creature exits the host spell's area" requires a new expiry primitive.

**Required surface additions**:
- New atom or condition: `suppress_shape_change`
- New expiry variant: `{ kind: "leaves_area" }` on the expiry grammar

---

## Gap 3 — `on_creature_ends_turn_in_area` trigger (surface_widening, shared with Cloudkill)

**SRD text**: "A creature also makes this save when… it ends its turn there."

`OngoingTrigger` has `on_attached_turn_start` but no turn-end variant. The proxy (`on_attached_turn_start`) fires at the wrong phase of the round — a creature that enters the area at the start of its turn and exits before the turn ends would correctly not trigger the end-of-turn save, but the proxy would fire at the beginning of the next turn instead.

**Proposed addition**:
```typescript
| { readonly kind: "on_creature_ends_turn_in_area" }
```

Same gap as Cloudkill. Multiple SRD spells use "ends its turn in the area" semantics (Cloudkill, Spirit Guardians, Wall of Fire, Moonbeam, Black Tentacles, etc.).

---

## Gap 4 — Once-per-turn deduplication

**SRD text**: "A creature makes this save only once per turn."

With three triggers (area moves in, creature enters, creature ends turn), a creature could theoretically trigger multiple saves in one turn. The "once per turn" cap deduplicates them. No field on `OngoingOperation` expresses this constraint.

**Proposed addition** to `OngoingOperation`:
```typescript
readonly oncePer?: "turn";  // creature makes this save/roll at most once per turn
```

---

## Summary

| Gap | Kind | Blocking? |
|---|---|---|
| `revert_form` atom | `new_atom` | Yes (secondary, no workaround) |
| `suppress_shape_change` atom + area-exit expiry | `new_atom` + `new_variant` | Yes (secondary, no workaround) |
| `on_creature_ends_turn_in_area` trigger | `new_variant` (OngoingTrigger) | Partial (turn_start used as proxy) |
| Once-per-turn dedup | `new_variant` (OngoingOperation field) | No (dedup is runtime concern) |

The dominant classification is `atom_widening` (shape-shift revert and suppression need new v4 atoms). The turn-end trigger gap is shared with Cloudkill and is the same `surface_widening` filed there. The dhall partial covers the core Con-save radiant damage loop.
