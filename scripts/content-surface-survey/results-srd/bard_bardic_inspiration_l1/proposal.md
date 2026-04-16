# Proposal: surface_widening for `bard_bardic_inspiration_l1`

## Outcome

`surface_widening` — the `class_feature` / `activation` family exists and the outer
shell fits, but two variants of existing surface types are missing.

---

## What fits

| Surface shape | Status |
|---|---|
| `kind: "class_feature"` | ✓ exists |
| `mechanics.family: "activation"` | ✓ exists |
| `activationCost: { kind: "bonus_action" }` | ✓ exists |
| `resetCadence: { kind: "long_rest" }` | ✓ exists |
| `resource.kind: "use_count"` | ✓ exists |
| Die-size scaling via `DiceAmount.threshold_tiers` + `axis: "class"` | ✓ atoms exist in v4 |

---

## Gap 1 — `ClassFeatureEffect` missing a "grant_inspiration_die" variant

### Rule text

> That creature gains one of your Bardic Inspiration dice. Once within the next hour
> when the creature fails a D20 Test, the creature can roll the Bardic Inspiration die
> and add the number rolled to the d20, potentially turning the failure into a success.
> A Bardic Inspiration die is expended when it's rolled.

### What the current union offers

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Neither variant is honest here:
- `GrantExtraActionEffect` — grants an extra Action on the caster's turn. Wrong direction entirely.
- `HealHpEffect` — restores HP to self or target. Also wrong.

### What is needed

A new variant representing "grant a die to a target creature that they may spend
reactively after a failed D20 Test to add to the result." Schematically:

```typescript
export type GrantInspirationDieEffect = {
  readonly kind: "grant_inspiration_die";
  // the die size can scale by class level (d6→d8→d10→d12)
  readonly dieAmount: DiceAmount;
  // the target that receives the die (always a non-self creature)
  readonly target: "target_creature";
  // the trigger window in which the die may be spent
  readonly useTrigger: "post_roll_on_failed_d20_test";
  // the die expires at this duration if unused
  readonly expiry: DurationValue;
};
```

This new effect emits two v4 atoms already in the taxonomy:
- `post_roll_window` — the window that opens when the recipient fails a D20 Test
- `modify_roll_numeric` — the die add applied to the d20 result
- `scale_die_size` — the d6→d8→d10→d12 progression at class levels 5/10/15

All three atoms are already v4-inventory. The gap is purely at the surface-type
encoding level (a missing `ClassFeatureEffect` variant), not at the atom level.

---

## Gap 2 — `UseCountCap` missing an ability-modifier variant

### Rule text

> You can confer a Bardic Inspiration die a number of times equal to your Charisma
> modifier (minimum of once).

### What the current union offers

```typescript
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>;
```

`fixed` cannot be used without hardcoding a specific number (which is character-sheet
state, not authored data). `ThresholdTiers` is level-indexed, not ability-score-indexed.

### What is needed

A new variant for ability-modifier-derived caps:

```typescript
export type AbilityModifierCap = {
  readonly kind: "ability_modifier";
  readonly ability: Ability;
  readonly minimum: number;   // "minimum of once" → 1
};
```

This does not require a new v4 atom — `use_count` already handles it. The change
is entirely at the surface authoring level: a new `UseCountCap` variant so the cap
can be expressed without lying.

---

## Proposed dhall shape (once both widenings land)

```dhall
let bardicInspiration =
  { kind = "class_feature"
  , id = "bard_bardic_inspiration_l1"
  , name = "Bardic Inspiration"
  , className = "bard"
  , acquiredAtLevel = 1
  , provenance =
      { kind = "srd-5.2.1"
      , section = "Classes/Bard#Level 1: Bardic Inspiration"
      }
  , description = "..."
  , mechanics =
      { family = "activation"
      , activationCost = { kind = "bonus_action" }
      , resource =
          { kind = "use_count"
          , cap =
              { kind = "ability_modifier"
              , ability = "cha"
              , minimum = 1
              }
          }
      , resetCadence = { kind = "long_rest" }
      , effect =
          { kind = "grant_inspiration_die"
          , dieAmount =
              { kind = "threshold_tiers"
              , axis = "class"
              , base = { dice = 1, dieSize = 6 }
              , tiers =
                  [ { atLevel = 5,  override = { dieSize = 8  } }
                  , { atLevel = 10, override = { dieSize = 10 } }
                  , { atLevel = 15, override = { dieSize = 12 } }
                  ]
              }
          , target = "target_creature"
          , useTrigger = "post_roll_on_failed_d20_test"
          , expiry = { unit = "hour", amount = 1 }
          }
      }
  }
in bardicInspiration
```

---

## v4 atom coverage

All atoms needed to trace this unit are already in v4:

| Atom | Category | Status |
|---|---|---|
| `class_feature_root` | source | ✓ v4 |
| `activate` | procedure | ✓ v4 |
| `bonus_action_quota` | resource | ✓ v4 |
| `use_count` | resource | ✓ v4 |
| `rest_window` | window | ✓ v4 |
| `target` | attachment | ✓ v4 |
| `post_roll_window` | window | ✓ v4 |
| `modify_roll_numeric` | effect | ✓ v4 |
| `scale_die_size` | scaling | ✓ v4 |

No new atoms required — this is a pure surface gap.

---

## Summary

Two new surface type variants are needed before Bardic Inspiration can be honestly
encoded:

1. `ClassFeatureEffect.grant_inspiration_die` — for the transferred post-roll die
2. `UseCountCap.ability_modifier` — for CHA-modifier-derived use counts

Both widenings are narrow and well-motivated by the rule text. No v4 atom additions
are needed.
