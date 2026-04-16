# Proposal: Thief's Reflexes (rogue L17) — structural_widening

## Unit

**Name:** Thief's Reflexes (rogue L17)  
**Slug:** `rogue_thiefs_reflexes_l17`  
**Kind:** `class_feature`  
**Provenance:** `srd-5.2.1`, section `Classes/Rogue#Level 17: Thief's Reflexes`

**Source text:**
> You are adept at laying ambushes and quickly escaping danger. You can take two turns during the first round of any combat. You take your first turn at your normal Initiative and your second turn at your Initiative minus 10.

---

## Why it does not fit

### Gap 1 — No passive family for class features

`ClassFeatureMechanics` is a union with a single member:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
// where ClassFeatureActivationMechanics = { family: "activation"; activationCost; resource; resetCadence; effect }
```

The `activation` family requires:
- `activationCost` — the player must spend something (free or bonus action)
- `resource` — a `use_count` pool that depletes
- `resetCadence` — a rest-based refill schedule

Thief's Reflexes has **none of these**. The feature is passive and permanent: it fires automatically at the start of every combat with no decision, no expenditure, and no pool to track. There is no `passive` or `always_on` family in `ClassFeatureMechanics`.

Encoding this as `activation` with `activationCost: { kind: "free" }` and any `use_count` cap would be a lie — the feature is not activated and has no cap. The tracer would emit a `use_count` node and a `rest_window` node that have no basis in the rules.

### Gap 2 — No `grant_extra_turn` effect

`ClassFeatureEffect` is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

The mechanic grants a second **turn** — a full participation in the initiative sequence with the creature's complete action economy (action, bonus action, movement). This is categorically different from `GrantExtraActionEffect`, which grants one additional **action** within an existing turn (the Action Surge pattern).

The distinction matters mechanically:
- `grant_extra_action`: the fighter takes their normal turn, then uses Action Surge to get one more action before the turn ends. They do not appear again in the initiative order.
- `grant_extra_turn`: the rogue takes their normal turn at Initiative N, then takes a second full turn at Initiative N−10. Two discrete entries in the initiative sequence.

Encoding this as `grant_extra_action` would produce a false trace — the atom `grant_extra_action` in the tracer emits "1 additional action" and maps to Action Surge-style semantics.

### Gap 3 — Initiative offset has no representation

The second turn fires at "Initiative minus 10" — a numerical offset from the creature's rolled initiative. There is no surface type, atom, or relation in v4 that models assignment of a creature to a secondary initiative slot with an arithmetic offset. The `initiative_window` atom exists in v4's window inventory but:
- It is not exposed in `src/surface/types.ts`
- Even if it were, it would need to carry the offset value and the first-round-only scope

### Gap 4 — "First round of combat only" scope has no representation

All currently modeled per-turn or per-combat scoping is implicit in the activation structure (a feature you activate, optionally constrained by `usageLimit: once_per_turn`). There is no surface type that restricts an effect to the first round of combat.

---

## Proposed widenings

### W1 — New family: `passive` for `ClassFeatureMechanics`

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveMechanics;
```

Scope: features that apply automatically in all relevant contexts with no player decision, no resource, and no rest reset. Other pressure cases from the class-feature corpus that may also require this: Evasion, Reliable Talent, Elusive, Uncanny Dodge (reaction-triggered but no use count), Sneak Attack (passive rider on attack).

### W2 — New effect atom: `grant_extra_turn`

```typescript
export type GrantExtraTurnEffect = {
  readonly kind: "grant_extra_turn";
  readonly count: number;
  readonly initiativeOffset?: number;   // negative = later; e.g. -10 for Thief's Reflexes
  readonly scope?: "first_round_of_combat";
};
```

This atom represents a second (or more) entry in the initiative order for the creature. It must be distinguished from `grant_extra_action` because the full action economy is available on the extra turn, and the turn appears at a separate point in the round's initiative sequence.

In v4 taxonomy terms, this maps to a new effect atom `grant_extra_turn` (currently absent from the §9 effect inventory).

### W3 — Corresponding `ClassFeaturePassiveEffect` union

```typescript
export type ClassFeaturePassiveEffect =
  | GrantExtraTurnEffect
  // ... other passive effects as pressure cases are encoded
```

### W4 — New surface variant: `scope: "first_round_of_combat"`

A closed enum of scope restrictions for effects that do not apply every turn but rather once per combat encounter, once per round, or only in the first round. At minimum:

```typescript
export type CombatScope =
  | { readonly kind: "first_round_of_combat" }
  | { readonly kind: "once_per_turn" };  // already exists informally as MasteryUsageLimit
```

---

## Dhall sketch (not authored — for design reference only)

If the above widenings were implemented, the honest encoding would be:

```dhall
{ kind = "class_feature"
, id = "rogue_thiefs_reflexes_l17"
, name = "Thief's Reflexes"
, className = "rogue"
, acquiredAtLevel = 17
, provenance = { kind = "srd-5.2.1", section = "Classes/Rogue#Level 17: Thief's Reflexes" }
, description = "..."
, mechanics =
    { family = "passive"
    , effect =
        { kind = "grant_extra_turn"
        , count = 1
        , initiativeOffset = -10
        , scope = { kind = "first_round_of_combat" }
        }
    }
}
```

---

## Classification

| Dimension | Assessment |
|---|---|
| Outcome | `structural_widening` |
| Primary gap | No `passive` family for `ClassFeatureMechanics` |
| Secondary gap | No `grant_extra_turn` effect atom (v4 §9 missing) |
| Tertiary gap | No initiative-offset or first-round-scope surface types |
| Confidence | High |

The three gaps are independent and all required simultaneously. Even resolving any two would leave the encoding incomplete. This is a clean structural widening case — not a borderline surface_widening, and not dm_agenda (the mechanic is fully deterministic and runtime-relevant).
