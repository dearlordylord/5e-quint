# Proposal: Color Spray — surface_widening

## Unit

- **Name**: Color Spray
- **Kind**: spell
- **Level**: 1 Illusion
- **Provenance**: srd-5.2.1

## Summary

Color Spray would map cleanly to the `activation` family with a single `save_gate` phase, except that three surface variants are missing. All required v4 atoms exist — this is a shape gap, not a taxonomy gap.

## Intended encoding (blocked)

```
activation spell
  castingTime: action
  range: self
  duration: instantaneous
  level: 1 / school: illusion
  phase: save_gate
    attachment: area { kind: "cone", lengthFeet: 15 }  ← MISSING SHAPE
    ability: con
    dc: caster_spell_save_dc
    onFail:  apply_condition { condition: "blinded", expiresOn: end_of_next_turn }  ← MISSING EFFECT VARIANT
    onSuccess: none
```

## Gap 1 — Area shape: `cone`

**Location**: `Attachment` → `area` → `shape`

**Current**:
```typescript
shape: { readonly kind: "sphere"; readonly radiusFeet: number }
```

**Needed**:
```typescript
shape:
  | { readonly kind: "sphere"; readonly radiusFeet: number }
  | { readonly kind: "cone"; readonly lengthFeet: number }
```

Cone areas originate from the caster (self), so no `AreaOrigin` disambiguation is required; the shape alone is sufficient. Future pressure cases (Burning Hands, Thunderwave, Cone of Cold) will all use the same variant.

## Gap 2 — `apply_condition` in spell `Effect`

**Location**: `Effect` union used by `ActivationPhase.onFail` / `ActivationPhase.onSuccess`

**Current**:
```typescript
export type Effect = DamageEffect | NoneEffect;
```

**Needed**:
```typescript
export type ConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
  readonly expiresOn?: RiderExpiry;  // reuse existing type
};

export type Effect = DamageEffect | NoneEffect | ConditionEffect;
```

The `apply_condition` v4 atom already exists. The mastery surface already models `SaveGateRiderResult` with `apply_condition`; this proposal lifts that pattern into the general `Effect` union so spells can use it too.

The `expiresOn` field reuses the existing `RiderExpiry` type, which already covers `end_of_next_turn` (Color Spray's expiry) and `target_uses_or_turn_start`.

## Gap 3 — `Condition` type: add `"blinded"`

**Location**: `Condition` primitive

**Current**:
```typescript
export type Condition = "prone";
```

**Needed**:
```typescript
export type Condition = "prone" | "blinded";
```

This is a simple string union extension. Every condition that appears in encoded spells/masteries needs to be added here. `"blinded"` is the second entry; expect `"charmed"`, `"frightened"`, `"incapacitated"`, `"paralyzed"`, `"poisoned"`, `"restrained"`, `"stunned"` to follow as more units are encoded.

## Tracer impact

Once the three gaps are filled, the tracer would emit for Color Spray:

| atom | category |
|---|---|
| `spell_root` | source |
| `activate` | procedure |
| `action_quota` | resource |
| `spell_slot` | resource |
| `area` (cone 15 ft, origin: self) | attachment |
| `save_gate` (CON, caster DC) | resolution |
| `apply_condition` (blinded, end_of_next_turn) | effect |

Relations: `roots`, `consumes`, `grants`, `attaches_to`, `branches_on_save`.

No new v4 atoms required.

## Classification

`surface_widening` — all three proposals are new variants of existing surface types. The v4 atom inventory is complete for this unit.
