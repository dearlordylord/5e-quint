# Proposal: Gem of Seeing — structural_widening

## Summary

The Gem of Seeing cannot be encoded in the current surface. `UnitRecord` has no `magic_item` kind. Beyond the structural gap, three surface-level variants are also missing.

## Primary gap — Missing UnitRecord kind

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The tracer's top-level switch is exhaustive on `spell | class_feature | mastery` — any attempt to feed a magic-item JSON would fail at `unit.kind`. The taxonomy lists `magic_item_root` as a source atom (v4 §1) but the TypeScript surface has never been widened to include it.

**Classification: `structural_widening`** — a new top-level kind and at least one mechanics family must be added.

---

## Secondary gaps (assuming structural gap is closed)

### 1. Activation cost: `magic_action`

```
As a Magic action, you can expend 1 charge.
```

`ClassFeatureActivationCost` covers `free | bonus_action`. Consuming the Magic action is a meaningfully distinct cost — it competes with spellcasting and other Magic-action features. A `{ kind: "magic_action" }` variant is needed.

**Classification: `surface_widening`** (new variant of existing activation-cost shape).

### 2. Effect: `grant_sense` (Truesight)

```
you have Truesight out to 120 feet when you peer through the gem
```

The v4 atom `grant_sense` is listed in TAXONOMY_atoms_graph.md §9 (Effect Atoms) but has no TypeScript surface representation in any effect union (`Effect`, `ClassFeatureEffect`, `ReactionEffect`). A shape such as:

```typescript
type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly sense: "truesight" | "darkvision" | "blindsight" | "tremorsense";
  readonly rangeFeet: number;
};
```

is needed. The Gem also imposes a usage constraint ("when you peer through the gem") which is a physical-interaction qualifier — probably foldable into description rather than a separate atom, but worth noting.

**Classification: `surface_widening`** (new variant of an existing atom family; v4 atom already named).

### 3. Recharge cadence: `daily_at_dawn` with dice amount

```
The gem regains 1d3 expended charges daily at dawn.
```

`RestResetCadence` only covers rest-based refills:

```typescript
type RestResetCadence =
  | { kind: "short_or_long_rest" }
  | { kind: "long_rest" }
  | { kind: "short_rest" }
  | { kind: "partial_short_full_long"; shortRestRefill: number };
```

Two things are missing:
- A time-of-day recharge cadence (`daily_at_dawn`)
- A dice-valued recharge amount (1d3, not a fixed integer)

Many SRD magic items use dawn recharge (Gem of Brightness, Wand of Wonder, etc.) so this is high-frequency pressure, not a one-off.

**Classification: `surface_widening`** (new variant of RestResetCadence + new dice-amount sub-shape for recharge quantity).

---

## Proposed minimal type additions

```typescript
// Activation cost widening
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "magic_action" };   // NEW

// Grant-sense effect (v4 atom already named)
export type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly sense: "truesight" | "darkvision" | "blindsight" | "tremorsense";
  readonly rangeFeet: number;
};

// Recharge cadence widening — replace RestResetCadence's
// rest-only shape with a broader reset union, or add:
export type DawnRecharge = {
  readonly kind: "daily_at_dawn";
  readonly amount: DiceExpr;  // e.g. { dice: 1, dieSize: 3 }
};

// MagicItemRecord (structural addition)
export type MagicItemMechanics = {
  readonly family: "charge_activation";
  readonly activationCost: ClassFeatureActivationCost;
  readonly chargesMax: number;
  readonly recharge: DawnRecharge | RestResetCadence;
  readonly effect: GrantSenseEffect | /* ... other magic-item effects */ never;
};

export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

// Update union
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

---

## Atoms required in the trace

Once the surface supports `MagicItemRecord`, the tracer would emit:

| Atom | Category | Notes |
|---|---|---|
| `magic_item_root` | source | v4 §1 |
| `activate` | procedure | Magic action cost |
| `action_quota` | resource | Magic action consumed |
| `charge` | resource | 3-charge pool |
| `grant_sense` | effect | Truesight 120 ft |
| `persist` | lifecycle | 10-minute duration |
| `expire` | lifecycle | after 10 min |
| `duration_window` | window | "daily at dawn" recharge event |

All of these are already in v4. No new atom is needed — only new surface variants and the structural `MagicItemRecord` wrapper.
