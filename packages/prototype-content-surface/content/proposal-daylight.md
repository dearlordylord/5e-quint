# Proposal: Surface Widenings for Daylight

**Unit:** Daylight (spell, level 3, Evocation, SRD 5.2.1)
**Outcome:** `surface_widening` — primary emit_light mechanic encodes; three surface gaps prevent full encode.

---

## Widening 1 — `Attachment.choice` variant

### Gap

Daylight offers a cast-time choice between two fundamentally different attachment kinds:

- **Primary mode:** `area` (sphere r=60 ft, origin: point_within_range)
- **Alternative mode:** `object` (filter: not worn/carried) with an emanation shape

The surface fixes one attachment kind per phase. `CastTimeEffectModeChoice` only changes effect atoms within a phase, not the attachment kind. There is no `Attachment.choice` variant.

### SRD evidence

> "Alternatively, you cast the spell on an object that isn't being worn or carried, causing the sunlight to fill a 60-foot Emanation originating from that object."

### Proposed widening

Add a `choice` variant to `Attachment`:

```typescript
| {
    readonly kind: "choice";
    readonly options: ReadonlyNonEmptyArray<Exclude<Attachment, { kind: "choice" }>>;
  }
```

This allows authoring a cast-time selection between any two concrete attachment shapes (area vs object, self vs target, etc.) without forcing separate phases or duplicating the spell's effect list.

**Pressure beyond Daylight:** Similar cast-time attachment choice patterns exist in spells like Hypnotic Pattern (point vs self for area origin), and potentially in other spells with "you may instead cast this on an object" clauses.

---

## Widening 2 — Spatial-overlap + type filter on `end_ongoing_spells`

### Gap

Daylight automatically dispels darkness-creating spells when their areas overlap with Daylight's area. The existing `end_ongoing_spells` atom:

```typescript
| {
    readonly kind: "end_ongoing_spells";
    readonly maxSpellLevel: number | "caster_slot_level" | "contested_spell_level";
  }
```

…lacks two constraints needed here:

1. **Spatial filter:** only dispels spells whose active area overlaps with Daylight's area (not all spells on the target).
2. **Effect-type filter:** only dispels spells that produced a "darkness" effect category.

The effect also fires automatically as an ongoing passive, not as a player-triggered phase.

### SRD evidence

> "If any of this spell's area overlaps with an area of Darkness created by a spell of level 3 or lower, that other spell is dispelled."

### Proposed widening

Extend `end_ongoing_spells` with optional filter fields:

```typescript
| {
    readonly kind: "end_ongoing_spells";
    readonly maxSpellLevel: number | "caster_slot_level" | "contested_spell_level";
    readonly areaOverlapRequired?: true;          // only dispels if areas overlap
    readonly spellEffectKind?: "darkness";        // closed enum, widen as needed
  }
```

Alternatively, model this as an `ongoing_effect` operation with trigger `on_creature_enters_area` or a new `on_area_overlap` trigger variant — but `on_area_overlap` doesn't exist in the surface and is a broader surface widening.

---

## Widening 3 — `emit_light.lightKind` field

### Gap

Daylight creates *sunlight*, which is mechanically distinct from ordinary bright light. Creatures with **Sunlight Sensitivity** (e.g., drow, certain undead) suffer disadvantage on attack rolls and Perception checks while in sunlight. The `emit_light` atom has no `lightKind` field:

```typescript
| {
    readonly kind: "emit_light";
    readonly brightRadiusFeet: number;
    readonly dimAdditionalFeet?: number;
    // missing: readonly lightKind?: "sunlight" | "ordinary";
  }
```

Without this, the tracer cannot distinguish Daylight from the Light cantrip at the atom level, even though they differ mechanically.

### SRD evidence

> "For the duration, sunlight spreads from a point within range…"

### Proposed widening

Add an optional `lightKind` field to `emit_light`:

```typescript
| {
    readonly kind: "emit_light";
    readonly brightRadiusFeet: number;
    readonly dimAdditionalFeet?: number;
    readonly lightKind?: "sunlight";  // absent = ordinary bright light
  }
```

`sunlight` is the only non-ordinary light quality in SRD 5.2.1 with mechanically significant consequences. Other spells that create "magical darkness" (Darkness, Hunger of Hadar) would not use this field — they affect visibility rules rather than light quality.

---

## What Does Encode Cleanly

The partial encoding covers:

- `activation` family with `direct` phase
- `area` attachment (sphere r=60 ft, origin: point_within_range)
- `emit_light` { brightRadiusFeet: 60, dimAdditionalFeet: 60 }
- 1-hour timed non-concentration duration
- Level 3 evocation, action casting time, V/S components, 60 ft range

The trace is an honest representation of the primary cast mode. The three widenings above are needed to close the gap to full round-trip fidelity.
