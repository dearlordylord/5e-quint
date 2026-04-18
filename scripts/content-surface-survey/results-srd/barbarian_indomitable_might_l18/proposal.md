# Proposal: `set_roll_floor` atom

## Unit

**Barbarian L18 — Indomitable Might**

> If your total for a Strength check or Strength saving throw is less than your Strength score, you can use that score in place of the total.

## Classification

`atom_widening` — The `class_feature` kind and `passive` mechanics family both fit. The gap is at the effect-atom level.

## What the mechanic does

The rule imposes a floor on the final total of Strength checks and Strength saving throws:

```
effective_total = max(roll_total, STR_score)
```

Note: the floor is the **full ability score** (e.g., 20), not the **ability modifier** (e.g., +5). A barbarian with STR 20 who rolls a 5 (total: 5 + 5 = 10) uses 20 as the result instead.

## Why no existing atom fits

| Candidate | Why it fails |
|---|---|
| `modify_roll_numeric` | Additive delta only — adds a fixed value to every qualifying roll. Cannot express "only activate if total < threshold, and add exactly the gap." |
| `modify_roll_advantage` | Selects the higher of two independent d20 rolls before modifiers. Different math and different semantics — advantage raises the raw d20, not the final total. |
| `set_ability_score` | Modifies the score itself on the character sheet. Has no effect on roll resolution. |

Forcing this into `modify_roll_numeric` with `+ability_modifier` would be a lie: the floor is the score (20), not the modifier (+5), and the bonus is conditional, not always-on additive.

## Proposed atom

```typescript
{
  readonly kind: "set_roll_floor";
  readonly on: ReadonlyNonEmptyArray<RollKind>;
  // The floor value is the character's full ability score, not the modifier.
  readonly floor: { readonly kind: "ability_score"; readonly ability: Ability };
}
```

Usage for Indomitable Might:

```json
{
  "kind": "set_roll_floor",
  "on": ["ability_check", "saving_throw"],
  "skillFilter": { "kind": "ability", "ability": "str" },
  "floor": { "kind": "ability_score", "ability": "str" }
}
```

### Notes on `on` narrowing

The rolls are narrowed to Strength checks and Strength saving throws. The current `modify_roll_numeric` uses `skillFilter` to narrow ability checks, but there is no `saveAbilityFilter` peer on the `on` field (the save-ability filter exists only on `modify_roll_advantage`). The proposed atom would need either:

1. A `saveAbilityFilter` field (parallel to the one on `modify_roll_advantage`), or
2. A broader `abilityFilter` that constrains both checks and saves to a specific ability.

This is a secondary `surface_widening` — the `set_roll_floor` atom itself is the primary gap.

## Scope

This atom would also cover other "use score instead of total" idioms that may appear in future content (e.g., analogous features for other abilities). It is not a narrow one-off.
