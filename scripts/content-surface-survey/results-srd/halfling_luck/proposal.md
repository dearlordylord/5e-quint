# Proposal: `modify_roll_reroll` atom for Halfling Luck

## Unit

**Halfling Luck** (`halfling_luck`) — `species_trait`, SRD 5.2.1

> When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll.

## Problem

The surface has no atom for conditional rerolls. The v4 taxonomy lists `modify_roll_reroll` under Effect Atoms, but it is absent from `types.ts`. The two available roll-modifier atoms do not cover this mechanic:

- `modify_roll_advantage` — rolls 2d20 and takes the higher result before resolution. This fires on every roll, not on natural 1 specifically.
- `modify_roll_numeric` — adds a fixed/scaled delta to the d20 result. Has no reroll concept.

Using either to represent Luck would produce a dishonest trace.

## Proposed widening

Add `modify_roll_reroll` to `EffectAtom` in `types.ts`:

```typescript
| {
    readonly kind: "modify_roll_reroll";
    // Which D20 Test kinds the reroll applies to.
    // Halfling Luck: all D20 Tests (attack_roll, saving_throw,
    // ability_check, initiative, death_saving_throw).
    readonly on: ReadonlyNonEmptyArray<RollKind>;
    // The die-face result that triggers the reroll.
    // Halfling Luck: trigger = 1 (natural 1 only).
    readonly trigger: { readonly kind: "roll_value"; readonly value: number };
    // Whether the reroller chooses which to keep, or must use the new roll.
    // Halfling Luck: "must_use_new" (no choice — the reroll replaces the 1).
    readonly keepPolicy: "must_use_new" | "choose_higher" | "choose_either";
  }
```

### Usage for Halfling Luck (passive species trait)

```dhall
{ kind = "species_trait"
, id = "halfling_luck"
, name = "Luck"
, species = "halfling"
, provenance = { kind = "srd-5.2.1", section = "Species/Halfling#Luck" }
, description = "When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll."
, mechanics =
    { family = "passive"
    , grants =
        [ { kind = "modify_roll_reroll"
          , on = [ "attack_roll", "saving_throw", "ability_check"
                 , "initiative", "death_saving_throw" ]
          , trigger = { kind = "roll_value", value = 1 }
          , keepPolicy = "must_use_new"
          }
        ]
    }
}
```

## Classification

`atom_widening` — `modify_roll_reroll` exists in the v4 taxonomy (TAXONOMY_atoms_graph.md §9 Effect Atoms) but is not present in the authored surface (`types.ts`).

## Related pressure

Other SRD units that share the reroll family include Lucky feat (more complex: 3 uses/long rest, can reroll any D20 Test or force a reroll on an attacker's roll) and Bless of Corellon / Silver Tongue (reroll certain checks). All would benefit from the same atom with different `trigger` and `keepPolicy` values, confirming this is not single-unit pressure.
