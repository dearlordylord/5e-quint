# Proposal: surface_widening for Indomitable (fighter L9)

## Unit

**Name**: Indomitable (fighter L9)  
**Kind**: `class_feature`  
**Source**: SRD 5.2.1 — `Classes/Fighter#Level 9: Indomitable`

## Rule text

> If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level. You must use the new roll, and you can't use this feature again until you finish a Long Rest.
>
> You can use this feature twice before a Long Rest starting at level 13 and three times before a Long Rest starting at level 17.

## What fits

The resource and reset machinery fits cleanly with existing types:

- **Use-count cap**: `ThresholdTiers<number>` with `axis: "class"`, `base: 1`, tiers `[{ atLevel: 13, value: 2 }, { atLevel: 17, value: 3 }]`
- **Reset**: `RestResetCadence` — `{ kind: "long_rest" }` ✓

## What does not fit

### Gap 1 — `ClassFeatureActivationCost` lacks a triggered/reactive variant

Indomitable fires **in response to a specific game event** (failing a saving throw). It is not freely activated on the fighter's turn. The current type:

```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" };
```

Using `{ kind: "free" }` would silently drop the trigger constraint — the feature would appear to be usable at any time, which misrepresents the rule. A new variant is needed, e.g.:

```typescript
| {
    readonly kind: "triggered";
    readonly trigger: "fail_saving_throw";
  }
```

The SRD phrase "if you fail a saving throw, you **can** reroll it" confirms optionality (player chooses) and event-gating (only on save failure).

### Gap 2 — `ClassFeatureEffect` lacks a roll-modification variant

The core effect is:
1. Reroll the failed saving throw (v4 atom: `modify_roll_reroll`)
2. Add a flat bonus equal to Fighter level to the new roll (v4 atom: `modify_roll_numeric`, scaling via `scale_numeric_bonus` with `axis: "class"`)
3. The new result is mandatory (the forced-use semantic is encoded in `modify_roll_reroll`)

Current type:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Neither member is applicable. A new variant is needed, e.g.:

```typescript
export type ModifyRollRerollEffect = {
  readonly kind: "modify_roll_reroll";
  readonly on: ReadonlyArray<RollKind>;  // ["saving_throw"]
  readonly bonus?: DiceAmount;           // Fighter level (linear_per_level, axis=class)
};
```

Or, if the reroll and numeric bonus are modeled as two separate effect atoms in the trace graph, two new variants could be introduced — but a single composite variant is cleaner for this pattern and matches the SRD's single-sentence description.

## All required v4 atoms exist

No atom-level widening is needed. All atoms composing this mechanic are already in the v4 taxonomy:

| Atom | Category | Role |
|---|---|---|
| `class_feature_root` | source | root |
| `activate` | procedure | activation procedure |
| `use_count` | resource | use cap (tiered) |
| `scale_numeric_bonus` | scaling | 1→2→3 uses by class level |
| `rest_window` | window | long rest refill |
| `modify_roll_reroll` | effect | reroll the failed save |
| `modify_roll_numeric` | effect | add Fighter level as bonus |
| `scale_numeric_bonus` | scaling | Fighter level scaling on bonus |

## Proposed surface changes

```typescript
// 1. Widen ClassFeatureActivationCost
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "triggered"; readonly trigger: ClassFeatureTrigger };  // NEW

export type ClassFeatureTrigger =
  | { readonly kind: "fail_saving_throw" };                                 // NEW (start closed)

// 2. Widen ClassFeatureEffect
export type ClassFeatureEffect =
  | GrantExtraActionEffect
  | HealHpEffect
  | ModifyRollRerollEffect;   // NEW

export type ModifyRollRerollEffect = {
  readonly kind: "modify_roll_reroll";
  readonly on: ReadonlyArray<RollKind>;
  readonly bonus?: DiceAmount;    // optional level-scaled numeric bonus
};
```

## Why not structural_widening?

The `activation` family for class features can accommodate this mechanic once the two surface variants are added. No new family is required — the existing `ClassFeatureActivationMechanics` structure (activationCost + resource + resetCadence + effect) maps correctly. The gaps are in the union types at specific fields, not in the family shape.

## Encoding sketch (blocked pending widening)

```dhall
{ kind = "class_feature"
, id = "fighter_indomitable_l9"
, name = "Indomitable"
, className = "fighter"
, acquiredAtLevel = 9
, provenance = { kind = "srd-5.2.1", section = "Classes/Fighter#Level 9: Indomitable" }
, description = "..."
, mechanics =
    { family = "activation"
    , activationCost = { kind = "triggered", trigger = { kind = "fail_saving_throw" } }
    , resource =
        { kind = "use_count"
        , cap =
            { kind = "threshold_tiers"
            , axis = "class"
            , base = 1
            , tiers = [ { atLevel = 13, value = 2 }, { atLevel = 17, value = 3 } ]
            }
        }
    , resetCadence = { kind = "long_rest" }
    , effect =
        { kind = "modify_roll_reroll"
        , on = [ "saving_throw" ]
        , bonus =
            { kind = "linear_per_level"
            , axis = "class"
            , base = { dice = 0, dieSize = 1, flat = 9 }   -- Fighter level 9 baseline
            , perLevel = { flat = 1 }
            , startingAtLevel = 9
            }
        }
    }
}
```
