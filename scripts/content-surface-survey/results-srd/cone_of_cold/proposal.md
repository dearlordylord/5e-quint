# Proposal: Surface Widenings for Cone of Cold

## Unit

**Cone of Cold** — Level 5 Evocation, SRD 5.2.1  
Family: `activation` / `save_gate` phase / `area` attachment

## Why encoding is blocked

The spell's core mechanic maps cleanly to the `activation` family with a single `save_gate` phase. All required v4 atoms exist. Three gaps in the surface type vocabulary prevent honest encoding.

---

### Gap 1 — `area` attachment: missing `cone` shape

**Current:**
```typescript
readonly shape: { readonly kind: "sphere"; readonly radiusFeet: number }
```

**Needed:**
```typescript
| { readonly kind: "cone"; readonly lengthFeet: number }
```

**Why:** Cone of Cold targets every creature in a 60-foot cone originating from the caster. This is geometrically distinct from a sphere: a sphere selects all creatures within a radius of a point; a cone selects all creatures within an angular frustum of fixed length projected from an origin direction. No sphere shape can represent this without producing false targeting boundaries.

**Evidence:** "Each creature in a 60-foot Cone originating from you"

**Pressure:** This same gap will block Burning Hands (15-ft cone), Thunderwave (self-cube), and other self-projected area spells.

---

### Gap 2 — `AreaOrigin`: missing self-emanation variant

**Current:**
```typescript
export type AreaOrigin =
  | { readonly kind: "point_within_range" }
  | { readonly kind: "on_primary_target" };
```

**Needed:**
```typescript
| { readonly kind: "self" }
```

**Why:** Cone of Cold's range is `Self` — the cone originates from the caster's body, not from a chosen point within range. `point_within_range` implies a directed, positionally-free choice (like Fireball's targeted-point origin). A self-emanating area is not positionally free: it always starts at the caster. The distinction matters for AI/pathfinding, opportunity attack, and targeting legality.

**Evidence:** "a 60-foot Cone originating from you"; source range field `"type": "cone"` with no separate point target.

**Pressure:** Burning Hands, Thunderwave, Thunderclap, and all AoE spells with Self range share this pattern.

---

### Gap 3 — `Effect`: no "half of fail" modifier for save-success branch

**Current:** `Effect = DamageEffect | NoneEffect`, where `DamageEffect` holds a `DiceAmount` (fixed DiceExpr or scaled DiceExpr with integer dice counts).

**Needed:** A way to express "half the fail damage" as a derived effect on the success branch — not a separate independently-specified damage amount.

**Why this matters for scaling:** At base slot (5), half of 8d8 = 4d8. This is representable. But each higher slot adds 1d8 to the fail damage and 0.5d8 to the success damage. 0.5d8 is not an integer dice count. Encoding success as `linear_per_level { dice: 0 ... }` produces wrong results and wrong traces; encoding it as a static `4d8` omits the scaling entirely.

**Options to consider:**
1. Add a `{ kind: "half_of_fail" }` Effect variant that the tracer resolves at runtime as a derived damage node.
2. Add a `fractional` field to `DiceExprDelta` (e.g., `perLevel: { dice: 0.5 }`) — but this breaks integer-only dice math elsewhere.
3. Add a new `DiceAmount` kind `{ kind: "half_of"; source: "fail_branch" }` — clean but requires tracer awareness of inter-branch derivation.

Option 1 is narrowest and most honest. The `half_of_fail` Effect variant could emit a `damage` atom with a `modifies` edge pointing to the fail-branch damage node, making the derivation traceable.

**Evidence:** "taking 8d8 Cold damage on a failed save or half as much damage on a successful one. The damage increases by 1d8 for each spell slot level above 5."

**Pressure:** Fireball, Lightning Bolt, Ice Storm, Shatter, Thunderwave, and most area-damage spells follow the same half-on-success pattern. This gap blocks the entire "blast" spell archetype.

---

## What is honestly omitted

**"Frozen statue" rider:** "A creature killed by this spell becomes a frozen statue until it thaws." This effect applies only to dead creatures and has no deterministic mechanical consequence for surviving combatants in the combat round. It is a DM-owned narrative state (thawing timeline is unspecified, reincarnation/animate-dead interactions are adjudicated). This is correctly out of core scope per ARCHITECTURE.md. No atom or surface widening is needed for it.

---

## Summary

All three gaps are `surface_widening` — new variants of existing surface types. No new v4 atoms are required. The tracer's atom set for this spell would be:

| Atom | Category |
|---|---|
| `spell_root` | source |
| `activate` | procedure |
| `action_quota` | resource |
| `spell_slot` | resource |
| `area` | attachment |
| `save_gate` | resolution |
| `damage` (×2, fail + success) | effect |
| `scale_die_count` | scaling |

Relations: `roots`, `consumes`, `grants`, `attaches_to`, `branches_on_save`, `modifies`.

Once all three gaps are addressed, Cone of Cold and most of the "blast archetype" spells become encodable in a single pass.
