# Proposal: Supreme Sneak (rogue L9)

**Outcome:** `structural_widening`

## Why no honest encoding is possible

Supreme Sneak is a **Cunning Strike option** — a sub-category of Rogue class features that are choices made inside the Sneak Attack resolution, not standalone activatable features. The current `ClassFeatureMechanics` surface has exactly one family:

```typescript
type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  family: "activation";
  effect: ClassFeatureEffect;
};
```

This family requires `activationCost + resource (use_count) + resetCadence + effect`. Supreme Sneak has none of these:

| Dimension | activation family | Supreme Sneak |
|---|---|---|
| Activation cost | `free` or `bonus_action` | **1d6 Sneak Attack dice** |
| Resource | `use_count` with a cap | **none** — unlimited while dice available |
| Reset cadence | short/long rest | **none** |
| Trigger | player decision on own turn | **embedded in attack resolution, conditional on Invisible** |
| Effect | `grant_extra_action` or `heal_hp` | **suppress condition removal** |

Every column is wrong. Coercing this into `activation` would produce a trace that lies about all five dimensions.

## Structural gap: Cunning Strike family

Cunning Strike options share a common grammar:

- **Selection point:** chosen at the moment of Sneak Attack resolution (not a separate action)
- **Cost:** N dice removed from the Sneak Attack pool (reducing the damage dealt)
- **Precondition:** varies per option (Supreme Sneak: must have Invisible from Hide)
- **Effect:** varies per option (Supreme Sneak: suppress Invisible removal under cover condition)
- **Availability:** unlimited — no use_count, no rest reset

This family would look roughly like:

```typescript
type CunningStrikeOption = {
  readonly family: "cunning_strike_option";
  readonly diceCost: number;           // dice removed from Sneak Attack pool
  readonly precondition?: ...;         // optional gate (Invisible, prone target, etc.)
  readonly effect: CunningStrikeEffect;
};
```

## Missing surface types

### 1. `ClassFeatureActivationCost`: `sneak_attack_dice`

The cost `1d6 Sneak Attack dice` has no place in the current closed union:
```typescript
type ClassFeatureActivationCost =
  | { kind: "free" }
  | { kind: "bonus_action" };
```
Needed: `{ kind: "sneak_attack_dice"; count: number }` or a more general `die_pool` cost variant.

### 2. `ClassFeatureEffect`: `suppress_condition_removal`

The effect is: "this attack doesn't end the Invisible condition if you end the turn behind Three-Quarters Cover or Total Cover."

This is a conditional suppression of a condition lifecycle event. The v4 taxonomy has a `suppress` procedure atom, but there is no `ClassFeatureEffect` variant that maps to it. `grant_extra_action` and `heal_hp` are both wrong.

Needed: something like:
```typescript
type SuppressConditionRemovalEffect = {
  readonly kind: "suppress_condition_removal";
  readonly condition: Condition;
  readonly endOfTurnGate: "three_quarters_cover" | "total_cover" | ...; // position check
};
```

Note: `Condition` type currently only covers `"prone"` (mastery domain). It would need to include `"invisible"` (and by extension, Hide's Invisible variant if those are distinguished).

### 3. Missing cover-position gate in surface

The "end the turn behind Three-Quarters Cover or Total Cover" gate is a positional end-of-turn check. This is a new kind of expiry/gate predicate not present anywhere in the current surface or tracer.

## Precedents from the same Cunning Strike system

Other Cunning Strike options from the Rogue class (Poison, Trip, Withdraw, Daze, Knock Out, Obscure) would all need this same family. Supreme Sneak is the first one surfaced in this survey, but the full Cunning Strike system appears at Rogue L5 (basic options) and again at L9 (Supreme Sneak), L11, and L14. Planning the family shape should account for the full option set.

## What this survey run produces

- No `.dhall` file (structural_widening — no honest encoding)
- No `.json` file
- No `.trace.md` file
- `result-rogue_supreme_sneak_l9.json` — self-report
- `proposal-rogue_supreme_sneak_l9.md` — this document
