# Proposal: Continual Flame widening

**Outcome:** `atom_widening`

Continual Flame cannot be honestly encoded. Three distinct gaps block encoding:

---

## Gap 1 — Missing v4 atom: `grant_light` (atom_widening)

**Rule text:** "The effect casts Bright Light in a 20-foot radius and Dim Light for an additional 20 feet."

The spell's sole mechanical output is creating a deterministic illumination state on an object. Light state is runtime-relevant: it drives hidden/visibility/darkvision rules in the combat engine.

No v4 atom covers this. The closest candidates don't fit:
- `grant_sense` — grants a *creature* a perception sense; not environmental illumination.
- `create_object` — creates a physical object; a flame is not a discrete object in the mechanical sense here.
- `persist` / `expire` — lifecycle atoms, not effect atoms.

**Proposed atom:**
```
grant_light
  category: effect
  fields:
    brightRadiusFeet: number
    dimRadiusFeet: number    // the *additional* dim radius beyond bright
  attachment: object (the flame is on the object, not the caster)
```

This atom would also serve Daylight (60 ft bright, 60 ft dim), Light cantrip (20 ft bright, 20 ft dim), and similar illumination spells.

---

## Gap 2 — Missing `Duration` variant: permanent (surface_widening)

**Rule text:** `duration: [{type: "permanent", ends: ["dispel"]}]`

Continual Flame lasts indefinitely until dispelled. The current `Duration` type:

```typescript
type Duration =
  | { kind: "instantaneous" }
  | { kind: "concentration"; upTo: DurationValue }
  | { kind: "timed"; value: DurationValue }
```

None of these represent "permanent until dispelled." A `timed` variant with a very large value would be dishonest — there is no time limit; the flame lasts as long as the object exists and is not dispelled.

**Proposed variant:**
```typescript
| { kind: "permanent"; endsOn: ReadonlyArray<"dispel" | "trigger"> }
```

`"trigger"` covers cases where a permanent effect ends on a specific condition (e.g., the object is destroyed). For Continual Flame, `endsOn: ["dispel"]`.

Other spells that would use this: Alarm (if modeled as `anchored_trigger`, its persistence is also "until dispelled or 24 hours" — the 24-hour cap maps to `timed`, but purely-permanent-until-dispelled spells need this new variant).

---

## Gap 3 — Missing `Attachment` variant: `object` (surface_widening)

**Rule text:** "A flame springs from an object that you touch."

The v4 taxonomy includes `object` as an attachment atom (§3 Attachment Atoms), but the surface `Attachment` type has no corresponding variant:

```typescript
type Attachment =
  | { kind: "self" }
  | { kind: "target"; selection: TargetSelection }    // creature target
  | { kind: "area"; shape: ...; origin: ... }
  | { kind: "mark"; selection: ...; transfer?: ... }
```

The `AnchorTarget` type has a `location` variant used by `anchored_trigger`, but that's scoped to the anchored-trigger family. Continual Flame attaches its light effect to an arbitrary object at touch range — a standalone `object` attachment on the top-level `Attachment` union is needed.

**Proposed variant:**
```typescript
| { kind: "object"; range: Range }
```

Other spells that would use this: Magic Mouth, Glyph of Warding (partially), Arcane Lock, Continual Flame, and any other spell that enchants a physical object.

---

## Summary

| Gap | Classification | Proposed addition |
|---|---|---|
| No light emission atom in v4 | `atom_widening` | `grant_light` effect atom |
| No permanent duration variant | `surface_widening` | `Duration { kind: "permanent"; endsOn: ... }` |
| No object attachment variant | `surface_widening` | `Attachment { kind: "object"; range: Range }` |

All three are required simultaneously. The atom gap is the most novel — it requires a v4 taxonomy update before the surface type can be widened to express the effect.
