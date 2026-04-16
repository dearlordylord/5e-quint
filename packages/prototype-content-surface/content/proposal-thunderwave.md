# Proposal: Thunderwave surface widenings

**Unit**: Thunderwave (spell, level 1, evocation, srd-5.2.1)  
**Outcome**: `surface_widening`  
**Family fit**: `activation` with `save_gate` phase — correct, no structural gap.

---

## What blocks honest encoding

Three surface shapes are missing. All required atoms exist in v4.

### 1. `Attachment.area.shape` — add `cube`

The current `Attachment` type's area variant is:

```typescript
{
  readonly kind: "area";
  readonly shape: { readonly kind: "sphere"; readonly radiusFeet: number };
  readonly origin: AreaOrigin;
}
```

Thunderwave's area is a 15-foot Cube. No `cube` shape variant exists.

**Proposed addition to `Attachment.area.shape`:**

```typescript
| { readonly kind: "cube"; readonly sideFeet: number }
```

Pressure: Thunderwave, Thunderclap, any cube-area AoE spell. The `AnchorTarget` already models cube (`{ kind: "area"; shape: { kind: "cube"; maxSideFeet: number } }`), confirming the concept is understood — it just isn't surfaced in `Attachment`.

---

### 2. `AreaOrigin` — add `caster_self`

The current `AreaOrigin`:

```typescript
export type AreaOrigin =
  | { readonly kind: "point_within_range" }
  | { readonly kind: "on_primary_target" };
```

Thunderwave's cube originates from the caster, not from a chosen point. Many AoE spells (cone, cube, line shapes) originate from the caster. Neither existing origin kind represents this.

**Proposed addition:**

```typescript
| { readonly kind: "caster_self" }
```

This pairs naturally with `Range = { kind: "self" }` to indicate the area emanates from the caster's position.

---

### 3. `Effect` — add `force_move` (and compound on-fail)

The current spell `Effect`:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

On a failed save, Thunderwave applies **two** effects simultaneously: 2d8 thunder damage **and** a 10-foot push. This requires:

**a) A `force_move` Effect variant:**

The v4 taxonomy lists `force_move` as a first-class effect atom, but it is not exposed in the `Effect` type used by spell `ActivationPhase`.

```typescript
export type ForceMoveEffect = {
  readonly kind: "force_move";
  readonly distanceFeet: number;
  readonly direction: "away_from_caster" | "toward_caster" | "chosen";
};
```

**b) A compound effect for multiple simultaneous outcomes:**

The `onFail` / `onSuccess` branches of `save_gate` currently accept a single `Effect`. Thunderwave's on-fail applies damage AND push together. Options:

- Option A: A `CompoundEffect` wrapper:
  ```typescript
  export type CompoundEffect = {
    readonly kind: "compound";
    readonly effects: ReadonlyArray<DamageEffect | ForceMoveEffect | ...>;
  };
  ```
- Option B: Expand `onFail`/`onSuccess` to `ReadonlyArray<Effect>` (list of effects applied on that branch).

Option B is likely more honest to the schema's structure since a phase branch can produce multiple parallel results.

---

## Non-blocking notes

- **Slot scaling** (`+1d8 per slot level above 1`): expressible as `DiceAmount` with `kind: "linear_per_level"`, `axis: "slot"`, `base: { dice: 2, dieSize: 8 }`, `perLevel: { dice: 1 }`, `startingAtLevel: 1`. No widening needed.
- **On-success half damage**: The convention in 5e is that half damage means applying the rolled result ÷ 2, not a different dice formula. The surface currently doesn't have a "half damage" marker on save branches — this is a known limitation consistent with other encoded spells (e.g., Circle of Death). Not newly blocking for Thunderwave.
- **Object push** (secondary effect — "unsecured objects are pushed 10 feet"): The object movement on unsecured objects is a secondary environmental effect. The core `force_move` rider on the save_gate handles the creature-targeting mechanical core; the object push is a DM-adjudicated / environmental consequence that ARCHITECTURE.md places outside the core atom graph. No additional widening required for this.
- **Thunderous boom (audible 300 ft)**: Notification/environmental effect. Out of core per ARCHITECTURE.md.

---

## Minimum widening to unblock

1. Add `{ kind: "cube"; sideFeet: number }` to `Attachment.area.shape`.
2. Add `{ kind: "caster_self" }` to `AreaOrigin`.
3. Add `ForceMoveEffect` to the spell `Effect` union.
4. Allow `onFail` / `onSuccess` branches to carry `ReadonlyArray<Effect>` (or a `CompoundEffect` wrapper) so damage + push can coexist on a single branch outcome.
