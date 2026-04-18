# Proposal: Major Image surface gaps

## Encoded core

`major_image.json` encodes the spell's primary mechanic honestly:

- Family: `ongoing_effect`
- Attachment: `area { kind: "cube", sideFeet: 20 }` at `point_within_range`
- Single passive operation: `create_illusion { maxSize: "gargantuan", channels: ["visual","sound","smell","temperature"] }`
- Duration: `concentration` up to 10 minutes

Typecheck passes; tracer emits a clean graph with `create_illusion` attached to the cube area.

---

## Gap 1 — Missing atom: `reposition_attachment`

### RAW text

> If you are within range of the illusion, you can take a Magic action to cause the image to move to any other spot within range. As the image changes location, you can alter its appearance so that its movements appear natural for the image.

### Why it is not encodable

The `on_caster_spends_action { cost: { kind: "standard_action", action: "magic" } }` trigger exists and fits perfectly. The problem is the *effect*: there is no atom that moves the spatial anchor of an ongoing effect to a new point within range.

- `force_move` — applies to creatures only (push/pull/slide).
- `teleport` — applies to the caster or a target creature.
- `alter_item_kind` — changes an item's rules form, not an effect's location.
- `set_speed` / `modify_speed` / `grant_speed` — all creature-facing.

This gap is identical to **Dancing Lights** (`reposition_attachment` new_atom, same widening), confirming it is a systematic v4 gap rather than a one-off.

### Proposed widening

```
new_atom: reposition_attachment
category: effect
semantics: moves the host effect's spatial anchor (area or location
           attachment origin) to a new point within range. Parameters:
             • maxFeet: number | "within_spell_range"  (distance the
               anchor may move per invocation)
             • destination: "any_visible_point_within_range" | ...
```

---

## Gap 2 — Missing surface variant: upcast changes duration kind

### RAW text

> Using a Higher-Level Spell Slot: The spell lasts until dispelled, without requiring Concentration, if cast with a level 4+ spell slot.

### Why it is not encodable

`DurationUpcastTier` supports amount changes only:

```typescript
export type DurationUpcastTier = {
  readonly atSlot: number;
  readonly amount: number;  // ← changes the amount within the same unit
};
```

At slot 4+, Major Image does not change the *amount* — it changes the duration *kind* from `concentration` to `permanent { endsOn: ["dispel"] }`. No existing field or tier variant expresses "at slot N, strip concentration and make permanent."

The `permanentIfMaintainedFull` flag on concentration duration is the closest existing shape, but semantically distinct: it promotes to permanent only after holding concentration for the *full* base duration. Major Image at 4+ is permanent *immediately* from cast, with no concentration requirement at all.

### Proposed widening

Add an optional field to the `concentration` duration variant:

```typescript
// Existing concentration duration variant — add one optional field:
{
  readonly kind: "concentration";
  readonly upTo: DurationValue;
  readonly earlyEnd?: ReadonlyNonEmptyArray<DurationEndTrigger>;
  readonly permanentIfMaintainedFull?: true;
  // NEW: at this slot level and above, concentration is removed and the
  // spell persists permanently (until dispelled). The base duration
  // becomes the fallback for lower-slot casts.
  readonly permanentAtSlot?: number;
}
```

SRD units where this pattern appears: Major Image (slot 4), Hypnotic Pattern (no such upcast — this is Major-Image-specific so far). Keep the field narrow and slot-scoped to avoid over-generalizing.

---

## Classification

`atom_widening` — the reposition mechanic requires a new v4 atom (`reposition_attachment`) not present in the taxonomy. The upcast duration-kind change is a `surface_widening` (new variant of an existing type), but the atom gap is the binding constraint since atoms are the harder requirement.
