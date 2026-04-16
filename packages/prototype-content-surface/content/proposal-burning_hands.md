# Proposal: surface_widening for Burning Hands

## Unit

**Burning Hands** — Level 1 Evocation, SRD 5.2.1

## Outcome

`surface_widening` — the `activation` family and all required v4 atoms exist; the only blockers are missing variants of existing surface types.

## What fits

| Component | Current surface | Fit |
|---|---|---|
| Family | `activation` | ✓ |
| Phase kind | `save_gate` | ✓ |
| Ability | `dex` | ✓ |
| DC source | `caster_spell_save_dc` | ✓ |
| Damage type | `fire` | ✓ |
| Damage amount | `DiceAmount` linear_per_level, axis=slot, base=3d6, +1d6/level, startingAtLevel=1 | ✓ |
| Half-on-success | `onSuccess: { kind: "damage", amount: half }` — or `onFail: full, onSuccess: none` with halved expr | ✓ (expressible) |
| Duration | `{ kind: "instantaneous" }` | ✓ |
| Components | V+S, no material | ✓ |

## What is missing

### 1. `area.shape.cone` (primary blocker)

The `Attachment` area variant currently only supports:

```typescript
shape: { readonly kind: "sphere"; readonly radiusFeet: number }
```

Burning Hands uses a **15-foot cone**. A cone is geometrically distinct from a sphere — it has a directional apex (the caster) and a length. The correct shape needs at minimum:

```typescript
| { readonly kind: "cone"; readonly lengthFeet: number }
```

**Why this can't be honoured with sphere:** A 15-foot cone is not equivalent to a 15-foot radius sphere, either mechanically or spatially. Encoding it as a sphere would misrepresent the area, produce a false trace, and mislead downstream consumers about which creatures are affected.

**Pressure coverage:** This widening is needed for every cone-shaped area spell in the SRD: Burning Hands, Cone of Cold, Dragon's Breath (upcast), and others.

### 2. `AreaOrigin.on_self` (secondary — may resolve through cone design)

Current `AreaOrigin` options:

```typescript
| { readonly kind: "point_within_range" }
| { readonly kind: "on_primary_target" }
```

Burning Hands has range `Self` — the cone originates at the caster's position, not at a designated point. `point_within_range` is inaccurate (there is no target point; the caster cannot aim the cone's origin). If the cone shape type encodes self-origin implicitly (e.g., "a cone always emanates from self"), `AreaOrigin` may not need a new variant. But if `AreaOrigin` remains a separate field on area attachments, an `on_self` variant should be added.

**Note:** This affects all self-emanating area spells (Thunderwave cube, Burning Hands cone, Shatter sphere-at-point-or-self). The cone design should settle whether origin is part of the shape or a separate field.

## Omitted secondary effect

> "Flammable objects in the Cone that aren't being worn or carried start burning."

This is DM agenda per `ARCHITECTURE.md` — an environmental narrative outcome with no deterministic mechanical resolution in the core rules engine. It is intentionally not modelled.

## Half-damage note

The `onSuccess: { kind: "damage" }` branch for half damage is expressible: encode `onFail` as `3d6` fire and `onSuccess` as `{ kind: "damage", amount: { kind: "fixed", expr: { dice: 1, dieSize: 6, flat: 0 } } }` with a "half" marker — or represent it as the full roll halved. The current `Effect` type has no `half_damage` variant; the convention used by similar spells (Fireball at tier 2) should set the precedent. This is not a blocker for the cone widening decision, but should be confirmed when the cone shape lands.

## Recommended widening

Add to `Attachment` area shape union:

```typescript
| { readonly kind: "cone"; readonly lengthFeet: number }
```

And resolve `AreaOrigin` for self-origin cones (either add `on_self` or make cones implicitly self-anchored).

Once these land, Burning Hands encodes as a single-phase `activation` spell with no further surface changes needed.
