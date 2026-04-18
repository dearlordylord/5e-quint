# Proposal: Surface widenings for Light

## Status: surface_widening (2 gaps)

The core mechanic of Light encodes cleanly: `activation` family, `direct` phase, `object` attachment, `emit_light` effect, 1-hour `timed` duration. Two secondary constraints in the RAW text lack surface representation.

---

## Gap 1: ObjectFilter missing size cap

**RAW text:** "You touch one Large or smaller object that isn't being worn or carried by someone else."

**Current surface:** `ObjectFilter` has three fields: `material`, `heldOrWorn`, `manufactured`. No size field.

**Encoded as-is:** The filter only captures `heldOrWorn: "forbidden"`. The size cap (Large or smaller) is silently dropped, meaning the encoded spell would technically match a Huge object.

**Proposed widening:** Add an optional `maxSize: StatBlockSize` field to `ObjectFilter`:

```typescript
export type ObjectFilter = {
  readonly material?: ObjectMaterial;
  readonly heldOrWorn?: "required" | "forbidden";
  readonly manufactured?: boolean;
  readonly maxSize?: StatBlockSize;  // new
};
```

**Usage for Light:**
```dhall
filter = { heldOrWorn = "forbidden", maxSize = "large" }
```

**Pressure:** Light is the first spell in the survey to target a size-capped object. The constraint is genuine RAW text, not a narrative note — a Gargantuan object cannot be targeted by Light per SRD.

---

## Gap 2: DurationEndTrigger missing "caster recasts spell"

**RAW text:** "The spell ends if you cast it again."

**Current surface:** `DurationEndTrigger` variants cover:
- `target_makes_attack_roll`
- `target_deals_damage`
- `target_casts_spell`
- `target_dons_armor`
- `target_damaged_by_caster_or_ally`
- `target_takes_damage`

None matches "caster recasts THIS spell".

**Proposed widening:** Add a new variant:

```typescript
| { readonly kind: "caster_recasts_this_spell" }
```

This models the "you can only have one active instance" pattern — common in cantrips and some buffs. The v4 taxonomy already has `replace_on_recast` as a lifecycle atom concept, but it has no surface hook on `Duration.timed.earlyEnd`.

**Usage for Light:**
```dhall
duration =
  { kind = "timed"
  , value = { unit = "hour", amount = 1 }
  , earlyEnd = [ { kind = "caster_recasts_this_spell" } ]
  }
```

**Pressure:** This pattern appears in multiple cantrips (Light, Dancing Lights, others) and some lower-level spells. It is worth closing the taxonomy now rather than deferring.

---

## Omissions (DM agenda / narrative — not widenings)

- **"The light can be colored as you like"** — pure narrative flavor, no mechanical consequence. Correctly omitted.
- **"Covering the object with something opaque blocks the light"** — DM-agenda physical occlusion rule. The core engine does not model light propagation or physical occlusion; this belongs to the DM layer per ARCHITECTURE.md §1.
