# Proposal: Nature's Veil (ranger L14)

**Outcome:** `surface_widening`  
**Slug:** `ranger_natures_veil_l14`

## Summary

The unit fits the `activation` class-feature family. The activation cost (`bonus_action`), reset cadence (`long_rest`), and record shape all match existing surface types. Three surface variants are missing that block honest encoding.

---

## Gap 1: `UseCountCap` — ability-modifier-derived cap

**Evidence:** _"You can use this feature a number of times equal to your Wisdom modifier (minimum of once)"_

The existing `UseCountCap` union is:

```typescript
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>;        // class-level threshold tiers
```

Neither variant can represent a cap derived from an ability score at runtime. This pattern recurs across many SRD features (Bardic Inspiration uses Cha mod, Lay on Hands uses Cha mod at L14, etc.), so the pressure is not narrow.

**Proposed addition:**

```typescript
| {
    readonly kind: "ability_modifier";
    readonly ability: Ability;
    readonly minimum: number;       // "minimum of once" = 1
  }
```

This is a `new_variant` of the existing `UseCountCap` surface type. No new v4 atom is required — `use_count` already exists.

---

## Gap 2: `ClassFeatureEffect` — `apply_condition` variant

**Evidence:** _"you can give yourself the Invisible condition until the end of your next turn"_

The existing `ClassFeatureEffect` union is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Granting a condition to self (or a target) is mechanically distinct from extra actions and healing. The v4 taxonomy already includes `apply_condition` as an effect atom. The gap is purely at the surface encoding layer.

**Proposed addition:**

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
  readonly target: "self" | "target_creature";
  readonly duration: ConditionDuration;
};

export type ConditionDuration =
  | { readonly kind: "end_of_next_turn" }      // Nature's Veil, many others
  | { readonly kind: "timed"; readonly value: DurationValue }
  | { readonly kind: "until_broken" };          // for future pressure cases
```

Add `ApplyConditionEffect` to `ClassFeatureEffect`. The tracer would emit `apply_condition` → `turn_end_window` (via `persists_until`) — both v4 atoms.

---

## Gap 3: `Condition` — `"invisible"` value

**Evidence:** _"you can give yourself the Invisible condition"_

The existing `Condition` type is:

```typescript
export type Condition = "prone";
```

This was defined narrowly for Topple mastery. Invisible is a standard SRD condition (Rules Glossary) that will appear in many features (Greater Invisibility, Nature's Veil, certain rogue features, etc.). Extend to:

```typescript
export type Condition =
  | "blinded"
  | "charmed"
  | "deafened"
  | "exhaustion"
  | "frightened"
  | "grappled"
  | "incapacitated"
  | "invisible"
  | "paralyzed"
  | "petrified"
  | "poisoned"
  | "prone"
  | "restrained"
  | "stunned"
  | "unconscious";
```

Or add narrowly just `"invisible"` if the project prefers demand-driven widening.

---

## No atom widening

All required v4 atoms are present:
- `apply_condition` — effect atom (§9)
- `use_count` — resource atom (§7)
- `turn_end_window` — window atom (§4)
- `bonus_action_quota` — resource atom (used for activation cost)
- `rest_window` — window atom (for long rest reset)

---

## Tracer graph (if widenings land)

Expected atom path after widenings:

```
class_feature_root
  └─roots─► activate
               ├─consumes─► bonus_action_quota
               ├─consumes─► use_count [cap: wis_mod, min 1]
               │                └─persists_until─► rest_window [long, refill all]
               └─grants──► apply_condition [invisible, self]
                               └─persists_until─► turn_end_window [end of next turn]
```

All nodes are v4 atoms. No new relation types needed.
