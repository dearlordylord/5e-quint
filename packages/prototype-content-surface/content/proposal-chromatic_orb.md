# Proposal: Chromatic Orb widening

**Outcome:** `atom_widening`  
**Unit:** Chromatic Orb (spell, SRD 5.2.1, level 1 evocation)

---

## Why honest encoding is blocked

Chromatic Orb has two independent blockers. Neither can be worked around without producing a false trace.

### Blocker 1 — Chosen-at-cast damage type (`surface_widening`)

The caster selects the damage type at cast time from a closed six-element set (Acid, Cold, Fire, Lightning, Poison, Thunder). The current `DamageType` in `types.ts` is a closed string literal union; every `DamageEffect` carries a single fixed type authored at design time. There is no variant representing "player-chosen at cast from enumerated options."

Workaround attempted: none. Fixing a single type (e.g., `"acid"`) would misrepresent every other possible choice and produce a trace that is factually wrong about the spell's mechanics.

**Proposed widening:** Add a variant to the `DamageType` or `DamageEffect` surface:

```typescript
// Option A — new DamageType variant
type DamageType = ... | { readonly kind: "chosen_at_cast"; readonly options: ReadonlyArray<DamageTypeLiteral> }

// Option B — new DamageEffect field
type DamageEffect = {
  readonly kind: "damage";
  readonly damageType: DamageType | { readonly kind: "chosen_at_cast"; readonly options: ReadonlyArray<DamageType> };
  readonly amount: DiceAmount;
}
```

---

### Blocker 2 — Matching-dice leap trigger (`atom_widening`)

When two or more d8s in the damage roll show the same face, the orb leaps to a new target within 30 feet. A fresh attack roll and a fresh damage roll are made against that target. At higher slot levels, the leap can chain up to [slot level] times, with each creature targetable only once per casting.

This trigger is conditioned on the **result pattern of the rolled dice** (matching faces among a set of dice) — not on the attack result, not on a saving throw, not on any existing resolution boundary. No v4 atom covers this:

| v4 atom | Why it doesn't fit |
|---|---|
| `on_hit_window` | Opens after attack hits; the matching-dice check happens on the *damage roll*, not the attack roll |
| `post_roll_window` | Generic post-roll hook; v4 doesn't have this atom at all |
| `save_gate` | Requires an ability save; no save is involved |
| `reaction_window` | Reaction-shaped trigger only |

**Proposed atoms:**

1. **`matching_dice_window`** — A new window atom that opens when the damage dice pool contains two or more equal values. Placement in the graph: after the damage roll resolves, before the damage effect commits. Parameterized by: minimum match count (2 for base Chromatic Orb), die pool (the damage dice only, not flat).

2. **`spell_leap_rider`** (or generalized `repeat_attack_rider`) — A new subgraph or rider node representing: "within this window, make a fresh ranged spell attack against a new target in range; if it hits, re-roll the spell's damage dice against that target." Similar to Cleave's `grant_weapon_attack` nested attack structure, but parameterized for spell attacks with a fresh dice expression rather than weapon damage.

**Proposed surface widenings for the higher-slot chain:**

3. **`UsageLimit.unique_target_per_cast`** — A constraint preventing the same creature from being targeted more than once per casting. The current `MasteryUsageLimit` only has `once_per_turn`; there is no "unique targets per casting" gate anywhere on the surface.

4. **`leap_count_cap = slot_level`** — The maximum number of leaps equals the slot level expended (not base + additive increment). This is a new scaling shape: `{ kind: "equals_slot_level" }` or equivalent. The current scaling shapes all use base + per-level delta or threshold tiers.

---

## What does fit

The primary mechanic — single ranged spell attack at 90 ft, 3d8 damage, upcast +1d8 per slot — maps cleanly onto the existing `activation` family with a single `attack_roll` phase and `linear_per_level` (axis=slot) damage scaling. If the damage-type choice and leap mechanic were dropped, the remainder would typecheck and trace cleanly. Those two mechanics are the sole blockers.

---

## Classification rationale

- Blocker 1 (damage type choice) alone → `surface_widening`
- Blocker 2 (matching-dice leap) → `atom_widening`

Combined outcome: **`atom_widening`** (the matching-dice window is not a variant of any existing surface type; it is a genuinely absent atom in v4). The damage-type choice is a secondary widening at the surface level.
