# Proposal: Glyph of Warding — Surface Widenings Required

## Classification

`surface_widening` — the `anchored_trigger` spell family is structurally correct (explicitly anticipated in types.ts). All gaps are missing variants of existing surface types.

## What Fits

| Feature | Current support |
|---|---|
| `kind: "spell"` | ✓ `SpellRecord` |
| `family: "anchored_trigger"` | ✓ `AnchoredTriggerMechanics` |
| Casting time: 1 hour | ✓ `{ kind: "minutes", amount: 60, ritual: false }` |
| Range: Touch | ✓ `{ kind: "touch" }` |
| School: Abjuration | ✓ `"abjuration"` |
| Material component (consumed) | ✓ `m: "powdered diamond..."` |
| Creature exemption filter | ✓ `AnchoredFilter.creature_exemption_list` |
| Slot scaling (explosive rune +1d8/slot) | ✓ `DiceAmount.linear_per_level` with `axis: "slot"` |

## Gaps

### 1. `Duration.permanent` (blocking)

**Current `Duration` union:**
```typescript
| { kind: "instantaneous" }
| { kind: "concentration"; upTo: DurationValue }
| { kind: "timed"; value: DurationValue }
```

Glyph of Warding's duration is permanent until dispelled or triggered. There is no timed bound. Required addition:

```typescript
| {
    kind: "permanent";
    ends: ReadonlyArray<"dispel" | "trigger" | "dawn">;
  }
```

The `ends` array follows the 5etools modeling (`ends: ["dispel", "trigger"]`). Several other spells (Arcane Lock, Magic Mouth, Glyph of Warding) share this shape.

---

### 2. `AnchoredSignal.explosive_rune` (blocking)

**Current `AnchoredSignal` union:**
```typescript
| { kind: "audible"; sound: string; durationSeconds: number; audibleRadiusFeet: number }
| { kind: "mental"; rangeFeet: number; awakensIfAsleep: boolean }
```

The Explosive Rune mode releases an area save-gate with typed damage — not a notification. Required addition:

```typescript
| {
    kind: "explosive_rune";
    shape: { kind: "sphere"; radiusFeet: number };
    origin: { kind: "on_glyph" };
    ability: Ability;
    dc: DcSource;
    damageType: DamageType;            // chosen at cast time from acid/cold/fire/lightning/thunder
    amount: DiceAmount;                // 5d8 base, +1d8/slot above 3
    onFail: Effect;
    onSuccess: Effect;                 // half damage
  }
```

Note: `damageType` is chosen at cast time from a closed set. This could be modeled as `"caster_choice_at_cast"` or by widening `DamageType` with a meta-value.

---

### 3. `AnchoredSignal.stored_spell` (blocking)

The Spell Glyph mode stores an arbitrary prepared spell (level ≤ 3, or ≤ slot level) and releases it targeting the triggering creature. This is the `stored_spell` attachment atom from v4 taxonomy applied as a signal. Required addition:

```typescript
| {
    kind: "stored_spell";
    maxLevel: number;                  // 3 at base, or slot level when upcast
    targetingRule: "triggering_creature" | "area_centered_on_triggering_creature";
    concentrationOverride: "full_duration";   // "If the spell requires Concentration, it lasts until the end of its full duration"
  }
```

The `maxLevel` scales with slot: at slot 3 → max level 3; at slot N → max level N. This introduces slot-scaling on a non-dice field, which the current `SlotScaling<T>` type could cover: `maxLevel: SlotScaling<number>` with `base: 3, perSlotAboveBase: 1, baseLevel: 3`.

---

### 4. `AnchoredEvent` new variants (non-blocking for minimal encoding, but needed for honest coverage)

**Current variants:** `physical_contact`, `enters_area`

GoW's trigger rules include:
- Opening a closeable object → `opening_object`
- Seeing the glyph → `sees_glyph` (also mentioned in types.ts as a deferred candidate)
- Approaching within a distance → `enters_area` covers this ✓
- Removing a covering object → could stretch under `physical_contact`, but is a distinct act

Proposed additions:
```typescript
| { kind: "opening_object" }
| { kind: "sees_glyph" }
```

---

### 5. `AnchorTarget.location.description` broadening (non-blocking for minimal encoding)

**Current:** `description: "door_or_window"` (literal type, from Alarm)

GoW inscribes on any surface (table, floor section) or within any closeable object. Options:
- Broaden to a string literal union: `"door_or_window" | "any_surface" | "any_closeable_object"`
- Or loosen to `string` and document the closed values in a comment

The cleanest approach is a disjoint `AnchorTarget` extension:
```typescript
| { kind: "surface" }
| { kind: "object"; constraint: "closeable" }
```

---

## Encoding Strategy When Widenings Land

Once `Duration.permanent` and the two `AnchoredSignal` variants are merged, GoW can be encoded as:

```dhall
{ kind = "spell"
, family = "anchored_trigger"
, level = 3
, school = "abjuration"
, castingTime = { kind = "minutes", amount = 60, ritual = False }
, range = { kind = "touch" }
, duration = { kind = "permanent", ends = [ "dispel", "trigger" ] }
, anchor = { kind = "surface_or_object" }     -- needs AnchorTarget widening
, events = [ { kind = "physical_contact" }, { kind = "opening_object" }, ... ]
, filters = [ { kind = "creature_exemption_list", chosenAtCast = True } ]
, signals =
    [ { kind = "explosive_rune", ... }      -- needs new variant
    , { kind = "stored_spell", maxLevel = ..., ... }  -- needs new variant
    ]
}
```

Both signal variants should be in a disjoint `AnchoredRelease` union (one or the other is chosen at cast, not both active simultaneously). This suggests a top-level `releaseMode` field rather than `signals: Array`:

```typescript
AnchoredTriggerMechanics & {
  releaseMode:
    | { kind: "explosive_rune"; ... }
    | { kind: "stored_spell"; ... }
    | { kind: "signal"; signals: ReadonlyArray<AnchoredSignal> }  // Alarm
}
```

This would be a more principled widening than appending to `AnchoredSignal`, since Alarm emits notification signals while GoW releases effects — they are semantically disjoint.

## Atom inventory

All atoms required for the honest trace are already in v4:
- `store`, `release` (procedure)
- `location`, `area` (attachment)
- `post_action_window` (window — for trigger events)
- `save_gate` (resolution — for explosive rune)
- `damage` (effect — for explosive rune)
- `stored_spell` (attachment — for spell glyph)
- `scale_die_count` (scaling — for +1d8/slot)
- `persist`, `expire` → replaced by a new `persist_until_triggered` lifecycle shape

No new v4 atoms are required; only surface type widenings.
