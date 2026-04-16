# Proposal: structural_widening for Font of Magic (sorcerer L2)

## Unit

- **Slug:** `sorcerer_font_of_magic_l2`
- **Kind:** class_feature / sorcerer L2
- **Outcome:** `structural_widening`

## Why the current surface cannot encode this unit honestly

Font of Magic's only available target family is `activation` (`ClassFeatureActivationMechanics`). That family models:

1. A single activation event (free or bonus_action cost)
2. A discrete use-count resource consumed per activation
3. A reset cadence
4. A single effect from `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`

Font of Magic does not fit this shape on any axis:

| Axis | activation family | Font of Magic |
|---|---|---|
| Activation model | single event | establishes a persistent pool; no single "activation" |
| Resource kind | discrete use_count (used / not used) | bidirectional spendable currency (0…max in any increment) |
| Effect | grant_extra_action or heal_hp | slot→SP conversion + SP→slot creation |
| External refill | none | mid-session refill by consuming spell slots |
| Created resource expiry | n/a | created slots vanish on Long Rest |

Forcing this into `activation` would require fabricating a `ClassFeatureEffect` variant that doesn't exist, and using `UseCountResource` for a resource that is semantically different (fractionally spendable, cross-feature, bidirectional). That trace would be dishonest.

## What the feature actually does (mechanical decomposition)

### 1. Resource pool establishment

Font of Magic grants a named, level-scaled point pool:

- **Name:** Sorcery Points
- **Cap schedule:** starts at 2 (L2), increases each sorcerer level per the Sorcerer Features table
- **Reset:** all points restored on Long Rest
- **Cross-feature:** the same pool is consumed by Metamagic and other sorcerer features — it must be nameable so other features can reference it

### 2. Slot → SP conversion (no action)

- **Cost to invoke:** none (no action required)
- **Source resource:** one expended spell slot of level N
- **Effect:** gain N Sorcery Points (up to the pool's current cap)
- **Direction:** spell_slot → named_point_pool

### 3. SP → Slot creation (Bonus Action)

- **Cost to invoke:** bonus_action
- **Source resource:** Sorcery Points, amount determined by a cost table keyed on target slot level:

| Slot Level | SP Cost | Min Sorcerer Level |
|---|---|---|
| 1 | 2 | 2 |
| 2 | 3 | 3 |
| 3 | 5 | 5 |
| 4 | 6 | 7 |
| 5 | 7 | 9 |

- **Effect:** create one temporary spell slot of the chosen level
- **Expiry on created resource:** the created slot vanishes at next Long Rest
- **Direction:** named_point_pool → spell_slot (temporary, expires on long rest)

## Proposed widenings (narrowest honest set)

### W1 — New class-feature mechanics family: `resource_pool`

A new family for features whose primary purpose is establishing a named, spendable point pool. Distinct from `activation` because there is no single trigger-and-effect event; the pool exists continuously and is consumed by external operations.

Minimum shape:

```typescript
export type ResourcePoolMechanics = {
  readonly family: "resource_pool";
  readonly poolName: string;               // e.g. "sorcery_points"
  readonly maxCap: UseCountCap;            // ThresholdTiers<number> by class level
  readonly resetCadence: RestResetCadence;
  readonly operations: ReadonlyArray<ResourcePoolOperation>;
};
```

### W2 — New effect/operation type: `resource_conversion`

Models a conversion between two resource types. Two variants are needed for Font of Magic:

**Variant A: External → pool (slot→SP)**

```typescript
{
  readonly kind: "external_to_pool";
  readonly activationCost: { readonly kind: "free" };
  readonly source: { readonly kind: "spell_slot"; readonly levelEqualsGain: true };
  readonly poolGain: "equal_to_source_level";
}
```

**Variant B: Pool → created resource (SP→slot)**

```typescript
{
  readonly kind: "pool_to_created_resource";
  readonly activationCost: { readonly kind: "bonus_action" };
  readonly costTable: ReadonlyArray<{
    readonly targetSlotLevel: SpellLevel;
    readonly spCost: number;
    readonly minClassLevel: number;
  }>;
  readonly creates: { readonly kind: "spell_slot"; readonly maxLevel: 5 };
  readonly createdExpiry: { readonly kind: "long_rest" };  // W3 below
}
```

### W3 — New expiry shape: created-resource long-rest expiry

The slot created by SP→slot conversion carries an expiry condition not representable by existing Duration atoms. Current Duration variants (`instantaneous`, `concentration`, `timed`) describe how long a spell's *effect* lasts, not when a *created resource instance* expires.

A new shape is needed for "this resource was created temporarily and is destroyed at the next Long Rest regardless of whether it was used":

```typescript
export type CreatedResourceExpiry =
  | { readonly kind: "long_rest" }
  | { readonly kind: "short_or_long_rest" };
```

### W4 — Possibly: point_pool resource type (or rename use_count)

`UseCountResource` with `ThresholdTiers<number>` is structurally similar to a point pool but semantically distinct. If the tracer or schema uses `use_count` to represent the SP pool, it will mislead: use_count implies discrete binary uses, not partial expenditure. The cleanest fix is a parallel `point_pool` resource type with a `poolName` field so cross-feature references work.

Alternatively, `UseCountResource` could be extended with a `kind: "point_pool"` discriminant and `name` field. Either way, the current `use_count` label on a Sorcery Points node would be a false trace.

## Comparison to Monk Focus Points

Monk Focus Points (`monk_monks_focus_l2`) will present the same structural gap:
- Named spendable pool (Focus Points = proficiency bonus per Long Rest)
- Multiple operations that spend Focus Points (Flurry of Blows, Patient Defense, etc.)
- No single activation event

The `resource_pool` family proposed here would serve both. The Warlock's Pact Magic might be partially representable as `spell_slot` resources but the short-rest full refill and the "one slot at a time" mechanic may also press the same boundary.

## Impact on atom inventory

No new v4 atoms are strictly required. The widenings are at the **surface type layer** (new family + new operation/effect shapes). The tracer could then emit existing v4 atoms (`use_count`, `bonus_action_quota`, `spell_slot`, `rest_window`, `activate`, `grant`) for the graph nodes — but only after the surface types are widened to admit an honest encoding.
