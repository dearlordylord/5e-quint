# Proposal: surface widenings for Lay On Hands

**Unit:** `paladin_lay_on_hands` — Paladin L1 class feature  
**Outcome:** `atom_widening`  
**Encoding status:** approximation only — primary heal encoded; three mechanics omitted

---

## Why this unit doesn't fit cleanly

Lay On Hands has three mechanics that push outside the current closed atom vocabulary:

1. A **numeric HP point pool** (not discrete use-counts)  
2. A **bounded player-chosen draw amount** (not a computed DiceAmount)  
3. A **condition-cure secondary use** sharing the same pool  

All three share a structural dependency: they all draw from the same HP pool, making this a *dual-use pool-draw* pattern that needs coordinated support.

---

## Gap 1 — `hp_pool` resource atom (new atom)

### What the SRD says

> "you have a pool of healing power that replenishes when you finish a Long Rest. With that pool, you can restore a total number of Hit Points equal to five times your Paladin level"

### Why `use_count` doesn't work

`UseCountResource` tracks a discrete count that decrements by 1 per activation. Lay On Hands:

- Has a **point pool** (integer HP count, not discrete uses)  
- Pool capacity scales as `5 × paladin level` (linear, axis=class)  
- Each activation depletes the pool by a **variable amount** (1 to pool_remaining per use)  
- Multiple activations per rest are possible as long as pool HP remain  
- Pool serves both uses (heal HP and cure condition)

### Proposed atom

```typescript
export type HpPoolResource = {
  readonly kind: "hp_pool";
  readonly capacity: LinearPerLevel<number>;  // 5 × class level
};
```

Where `LinearPerLevel<number>` would carry `{ axis: "class", base: 5, perLevel: 5, startingAtLevel: 1 }`.

The tracer would emit an `hp_pool` resource node (category: `resource`) in place of `use_count`, with a `persists_until` edge to the long-rest window.

---

## Gap 2 — `variable_draw` DiceAmount variant (new variant)

### What the SRD says

> "you can touch a creature … and draw power from the pool of healing to restore a number of Hit Points to that creature, **up to the maximum amount remaining in the pool**"

### Why existing DiceAmount variants don't work

| Variant | Shape | Problem |
|---|---|---|
| `fixed` | Computed at definition | Amount is determined by pool state at activation, not at definition |
| `threshold_tiers` | Computed by level | Same — level-keyed, not pool-state-keyed |
| `linear_per_level` | Computed by level | Same |

The heal amount is a **player-chosen integer bounded by current pool state** — a runtime value, not a static expression. No existing DiceAmount variant captures this.

### Proposed variant

```typescript
export type VariableDraw = {
  readonly kind: "variable_draw";
  readonly source: "hp_pool";          // which pool to draw from
  readonly minimum: 1;
  readonly maximum: "pool_remaining";  // bounded by runtime pool state
};
```

This would slot into `DiceAmount` as a new union member. The tracer would emit a `variable_draw` label on the `heal` effect node.

---

## Gap 3 — `remove_condition` ClassFeatureEffect variant (new variant)

### What the SRD says

> "You can also expend 5 Hit Points from the pool of healing power to remove the Poisoned condition from the creature; those points don't also restore Hit Points to the creature."

### Why existing effects don't work

`ClassFeatureEffect` is `GrantExtraActionEffect | HealHpEffect`. Neither:

- Models condition removal  
- Models an HP cost drawn from an hp_pool (rather than a use-count decrement)  
- Enforces the "no HP restoration" constraint of this branch  

### Proposed variant

```typescript
export type RemoveConditionEffect = {
  readonly kind: "remove_condition";
  readonly condition: Condition;       // "poisoned" (requires Condition widening too)
  readonly poolCost: number;           // 5 HP from hp_pool
  readonly restoresHp: false;          // explicit SRD constraint
};
```

Note: `Condition` currently only includes `"prone"`. To encode the Poisoned cure, `Condition` must be widened to include `"poisoned"`.

---

## Gap 4 — `dual_use_pool_draw` structural subgraph (new subgraph)

### The structural problem

`ClassFeatureActivationMechanics` has a single `effect: ClassFeatureEffect` field. Lay On Hands requires:

- **Player choice** at activation: heal HP *or* cure condition  
- Both branches draw from the **same `hp_pool`** (shared resource)  
- The two branches have different draw amounts (variable vs. fixed 5 HP)  
- The two branches have different effects (`heal_hp` vs. `remove_condition`)  

This is a two-branch player-choice mechanic on a shared pool — a structural pattern the current `ClassFeatureActivationMechanics` cannot express.

### Proposed subgraph shape

```
activate → hp_pool (shared)
         → player_choice
             ├── branch: heal_hp (variable_draw from hp_pool, target_creature)
             └── branch: remove_condition (poolCost=5, condition=poisoned, target_creature)
```

A `player_choice` node (category: `procedure`) would carry an array of branch effects, each specifying its pool cost. The tracer would emit `player_choice` with two `grants` edges, each to a distinct effect node that also carries a `consumes` edge into the shared `hp_pool`.

---

## What the current approximation does capture

The `paladin_lay_on_hands.json` encoding is valid and the tracer succeeds:

- `bonus_action_quota` — correct (Bonus Action cost)  
- `use_count` (cap=1) — structural placeholder for hp_pool; captures "there is a limited resource" but not the pool semantics  
- `heal` with `scale_numeric_bonus` (axis=class, +5/level) — correctly shows the heal effect scales linearly with class level, but represents pool *capacity* rather than "up to pool remaining"  
- `rest_window` (long) — correct reset cadence  

Atoms and relations emitted by the tracer are all valid v4 atoms. No `unhandled` was thrown. The approximation is underspecified, not broken.

---

## Summary

| Gap | Kind | Atom/variant name | Blocks encoding? |
|---|---|---|---|
| HP point pool resource | new atom | `hp_pool` | Yes — resource is fundamentally mistyped |
| Player-chosen bounded heal | new variant | `variable_draw` (DiceAmount) | Partial — heal amount is misrepresented |
| Condition cure from pool | new variant | `remove_condition` (ClassFeatureEffect) | Yes — secondary use entirely omitted |
| Dual-use on shared pool | new subgraph | `dual_use_pool_draw` | Yes — choice structure absent |
| Poisoned condition name | type widening | `Condition` += `"poisoned"` | Prerequisite for remove_condition |
