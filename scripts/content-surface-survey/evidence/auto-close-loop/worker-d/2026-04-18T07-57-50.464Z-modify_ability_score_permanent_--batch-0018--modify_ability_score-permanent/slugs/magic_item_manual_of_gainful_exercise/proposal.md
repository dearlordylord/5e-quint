# Proposal: Manual of Gainful Exercise

**Outcome:** `structural_widening`

## Blocking gap: no `MagicItemRecord` in `UnitRecord`

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

The taxonomy (`TAXONOMY_atoms_graph.md` v4) includes `magic_item_root` as a source atom and the pipeline tags this unit as `kind: "magic_item"`, but no corresponding `MagicItemRecord` type or `MagicItemMechanics` family exists in the surface. There is no honest way to encode a magic item today — forcing it into `SpellRecord`, `ClassFeatureRecord`, or `MasteryRecord` would produce a structurally false trace.

---

## Unit mechanics summary

| Mechanic | Description |
|---|---|
| Activation cost | 48 hours of study/practice over ≤ 6 days (downtime ritual) |
| Core effect | Permanent STR +2, capped at 30 |
| Depletion | Item loses its magic after one use |
| Recharge | Magic returns after 100 years |

---

## Required widenings

### 1. `MagicItemRecord` + `MagicItemMechanics` family (structural)

A new top-level record type is needed:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

`MagicItemMechanics` needs at least one family variant. The Manual is a **single-use consumable with downtime activation** — a different shape from wearable passives (Belt of Giant Strength), charge-based actives (Necklace of Fireballs), or attunement-required passives (Headband of Intellect).

Candidate initial family: `consume_and_deplete` (single-use activation that permanently depletes the item until a timed recharge).

### 2. Downtime activation cost variant (surface widening)

A new `ClassFeatureActivationCost`-equivalent for magic items:

```typescript
| {
    readonly kind: "downtime_ritual";
    readonly totalHours: number;
    readonly maxDays: number;
  }
```

This covers the Manual's "48 hours over 6 days or fewer" pattern, and will recur for Tome of Clear Thought, Tome of Leadership and Influence, Tome of Understanding, Manual of Bodily Health, and Manual of Quickness of Action — a cluster of five identical-shape items.

### 3. `modify_ability_score` effect (atom widening — deferred)

TAXONOMY v4 §12 lists this as an open weak spot:

> `modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope)

The Manual (and its four sibling tomes) are the clearest pressure case for this atom. The effect is unambiguously a permanent, unconditional ability score increase with a numeric cap. Whether this belongs in the core mechanics graph (runtime projection) or in character-state metadata (pre-runtime) is a modeling question for the project owner.

If promoted to the core graph: `modify_ability_score` would be a new effect atom with at least `ability`, `delta`, and `maxScore` fields.

### 4. Item depletion + century recharge lifecycle (surface widening)

After the Manual is used, it becomes non-magical until recharged. This is not covered by existing lifecycle atoms:

- `use_count` + `rest_window` covers per-rest refills (Action Surge, Second Wind).
- `charge` (v4 resource atom) can model per-use depletion but its reset cadence is undefined in the current surface.

A new lifecycle shape is needed for "item loses its magic after use and regains it after N years." Candidate: a `depleted` lifecycle variant with a `recharge` field carrying a `{ kind: "timed", years: number }` value. This pattern also appears on the Candle of Invocation and similar one-shot items.

---

## Sibling pressure

The five stat-boosting manuals/tomes share identical structure:

| Item | Ability |
|---|---|
| Manual of Gainful Exercise | STR +2 |
| Manual of Bodily Health | CON +2 |
| Manual of Quickness of Action | DEX +2 |
| Tome of Clear Thought | INT +2 |
| Tome of Understanding | WIS +2 |
| Tome of Leadership and Influence | CHA +2 |

All six use the same downtime ritual cost, same depletion/recharge pattern, and the same `modify_ability_score` effect shape. The widenings here would close all six simultaneously.
