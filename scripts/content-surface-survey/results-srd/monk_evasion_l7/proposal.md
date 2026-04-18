# Proposal: Monk Evasion L7

## Outcome: `atom_widening`

## Unit

**Evasion (Monk Level 7)**

> When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail.
>
> You don't benefit from this feature if you have the Incapacitated condition.

## What fits

- **Family**: `passive` — correct. Evasion is always-on while active, no activation cost, no resource.
- **`suppressedBy`**: `[{ kind: "condition_active", conditions: ["incapacitated"] }]` — fits exactly; same pattern as Barbarian Danger Sense.

## What's missing

The core mechanic has no atom. Evasion modifies the **outcome semantics** of a specific class of save effects:

| Context | Normal | With Evasion |
|---|---|---|
| Succeed Dex save (half-damage effect) | ½ damage | 0 damage |
| Fail Dex save (half-damage effect) | full damage | ½ damage |

No existing atom captures this. The closest candidates, and why they fail:

- **`modify_roll_advantage`** — grants advantage/disadvantage on the roll itself. Evasion doesn't touch the roll; it changes what the result *means*.
- **`grant_resistance`** — halves all incoming damage of a type, unconditionally. Evasion is conditional on succeeding a specific class of save, and additionally zeroes damage on success rather than halving.
- **`grant_damage_immunity`** — immunity to a damage type. Evasion is not blanket immunity; failure still deals half damage.
- **`modify_roll_numeric`** — numeric bonus to a roll. Same issue as `modify_roll_advantage`.

## Proposed atom

**`evasion_save_outcome`** — modifies save outcome tiers for Dex-save-for-half-damage effects:

```typescript
{
  readonly kind: "evasion_save_outcome";
  readonly saveAbility: "dex";
  // Implicit semantics:
  //   on success: 0 damage (instead of the default half)
  //   on failure: half damage (instead of the default full)
}
```

This atom is scoped to the "Dex save, succeed = half" save family. It is distinct from `grant_resistance` (which is passive and type-scoped, not outcome-scoped) and from `modify_roll_advantage` (which affects the roll, not the outcome).

### Alternate framing

If the surface prefers a more general atom, this could be expressed as a `modify_save_outcome` atom with a scope discriminant:

```typescript
{
  readonly kind: "modify_save_outcome";
  readonly scope: { readonly kind: "dex_save_for_half_damage" };
  // on success: onSuccessOutcome = "none" (no damage)
  // on failure: onFailOutcome = "half" (half damage)
}
```

This alternate form would also cover future units like Rogue's Evasion (identical text) and any other "evasion-style" feature without inventing separate atoms per class.

## Encoding sketch (not authored — missing atom)

```dhall
{ kind = "class_feature"
, id = "monk_evasion_l7"
, name = "Evasion"
, className = "monk"
, acquiredAtLevel = 7
, provenance = { kind = "srd-5.2.1", section = "Classes/Monk#Evasion" }
, description = "..."
, mechanics =
    { family = "passive"
    , suppressedBy =
        [ { kind = "condition_active"
          , conditions = [ "incapacitated" ]
          }
        ]
    , grants =
        [ { kind = "evasion_save_outcome"  -- MISSING ATOM
          , saveAbility = "dex"
          }
        ]
    }
}
```

## Notes

- Rogue also has Evasion (identical text, same level 7). The proposed atom would cover both without duplication.
- The `suppressedBy` mechanism already handles the Incapacitated suppressor cleanly.
- No new family or structural widening is needed — only this one atom is missing.
