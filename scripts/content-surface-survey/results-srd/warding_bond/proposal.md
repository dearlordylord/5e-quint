# Proposal: Warding Bond widening

**Outcome:** `atom_widening`
**Blocking artifact:** no `warding_bond.dhall` / `.json` / `.trace.md` authored (unit does not fit honestly)

---

## What Warding Bond does

> You touch another creature that is willing and create a mystic connection between you and the target until the spell ends. While the target is within 60 feet of you, it gains a +1 bonus to AC and saving throws, and it has Resistance to all damage. Also, each time it takes damage, you take the same amount of damage.

Level 2 Abjuration, Action, Touch, 1 hour (not concentration). Four simultaneous effects, all persistent for the spell's duration:

1. **+1 AC bonus** — flat numeric, ongoing on target
2. **+1 saving throw bonus** — flat numeric, ongoing on target
3. **Resistance to all damage** — ongoing on target
4. **Damage mirror** — caster suffers exact same damage as target on each instance

---

## Why it cannot be encoded honestly

### 1. `damage_mirror` — missing v4 atom (primary blocker)

The damage mirror is Warding Bond's identity mechanic. It is not:
- `grant_resistance` — that halves damage on the target; damage_mirror redirects a copy of it to the caster
- `damage_on_hit` / `damage` — those apply damage in the context of an attack resolution; the caster is not in the resolution at all
- any existing effect atom

A new atom is needed: something like `damage_mirror`, representing "the caster passively receives the exact HP loss suffered by the bonded target on each damage instance." The atom's graph shape would require a new `attaches_to` edge pattern: the effect attaches to the *target* for triggering but resolves against the *caster*.

This atom has no v4 precedent. It is structurally distinct from all existing effect atoms.

### 2. `modify_ac` not in `OngoingOperation` (surface widening)

`modify_ac` exists as a `ReactionEffect` variant (Shield's +5 AC). For Warding Bond, the AC bonus is passive and persistent — it is an ongoing operation, not a reaction commit. The `OngoingOperation` union (`RollModifierOperation | DamageOnHitOperation`) has no `modify_ac` variant.

**Proposed addition:**
```typescript
export type ModifyAcOperation = {
  readonly kind: "modify_ac";
  readonly delta: number;        // flat numeric
};
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation | ModifyAcOperation;
```

### 3. `grant_resistance` not in `OngoingOperation` (surface widening)

`grant_resistance` is a v4 effect atom and it appears in the taxonomy, but it is not reachable through any `OngoingOperation` variant. Warding Bond's resistance is passive and persistent (not triggered by an attack).

Additionally, the resistance applies to **all** damage types simultaneously. The existing `DamageType` union enumerates 13 specific types; there is no "all" selector. Encoding "resistance to all damage" either requires enumerating all 13 (fragile, verbose) or a new `"all"` sentinel.

**Proposed addition:**
```typescript
export type GrantResistanceOperation = {
  readonly kind: "grant_resistance";
  readonly damageTypes: ReadonlyArray<DamageType> | "all";
};
export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | ModifyAcOperation
  | GrantResistanceOperation;
```

### 4. Single `operation` field — must become plural (surface widening)

`OngoingEffectMechanics` has:
```typescript
readonly operation: OngoingOperation;
```

Warding Bond needs three (or four, with damage_mirror) simultaneous operations on the same attachment. This field must become:
```typescript
readonly operations: ReadonlyArray<OngoingOperation>;
```

Bless and Hunter's Mark each have a single operation, so widening to an array is backwards-compatible for them.

### 5. Flat numeric modifier vs `DiceDelta` (surface widening)

`RollModifierOperation` uses `DiceDelta`:
```typescript
export type DiceDelta = {
  readonly dice: number;
  readonly dieSize: number;
  readonly sign: "+" | "-";
};
```

This is a dice expression (e.g., +1d4 for Bless). Warding Bond's +1 saving throw bonus is a flat integer, not a dice roll. Encoding `{dice: 0, dieSize: 0, sign: "+"}` would be dishonest. Either:
- Add a `flat_modifier` variant to `OngoingOperation`, OR
- Extend `DiceDelta` with an optional `flat?: number` field and allow `dice: 0`

The cleanest solution is a dedicated `FlatModifierOperation`:
```typescript
export type FlatModifierOperation = {
  readonly kind: "flat_modifier";
  readonly on: ReadonlyArray<RollKind>;
  readonly delta: number;        // positive = bonus, negative = penalty
};
```

---

## Novel termination conditions (secondary, noted for completeness)

Warding Bond also ends under two non-standard conditions:
- Caster drops to 0 HP
- Caster and target move more than 60 feet apart

The existing lifecycle atoms (`expire`, `concentrate`, `persist`) handle timed duration and concentration breaks but not:
- Proximity-based expiry (range constraint between caster and target)
- Caster-HP-drop as a lifecycle termination (distinct from caster dying, which is already edge-case)

These are real gaps but secondary to the damage_mirror atom gap. They would likely require new lifecycle atom variants when this spell family is encoded.

---

## Summary of gaps

| Gap | Type | Severity |
|---|---|---|
| `damage_mirror` atom missing from v4 | `atom_widening` | **Blocking** |
| `modify_ac` not in `OngoingOperation` | `surface_widening` | Blocking |
| `grant_resistance` not in `OngoingOperation` | `surface_widening` | Blocking |
| No `"all"` damage-type selector | `surface_widening` | Blocking |
| `operation` must become `operations` array | `surface_widening` | Blocking |
| `DiceDelta` cannot express flat numeric | `surface_widening` | Blocking |
| Proximity-based expiry lifecycle | `surface_widening` | Secondary |
| Caster-0HP termination lifecycle | `surface_widening` | Secondary |

All six blocking gaps must be resolved before Warding Bond can be traced. The atom_widening for `damage_mirror` is the principal gap; the surface_widenings are co-required but structurally smaller changes.
