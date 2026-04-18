# Proposal: `upgrade_save_damage_outcome` atom

## Unit

**Rogue — Evasion (L7)** · `class_feature` · SRD 5.2.1

## RAW text

> When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail. You can't use this feature if you have the Incapacitated condition.

## Fit assessment

| Layer | Fit |
|---|---|
| `class_feature` kind | ✓ exists |
| `passive` family | ✓ exists |
| `suppressedBy: [{kind: "condition_active", conditions: ["incapacitated"]}]` | ✓ exists |
| Core mechanic atom | ✗ **missing** |

The `passive` family with `suppressedBy` handles all structural and lifecycle aspects of this feature. The sole blocker is the effect atom.

## Missing atom: `upgrade_save_damage_outcome`

### What it models

Evasion remaps the two damage tiers of a Dexterity-save-for-half-damage effect:

| Save result | Without Evasion | With Evasion |
|---|---|---|
| Success | ½ damage | **0 damage** |
| Failure | Full damage | **½ damage** |

This is a passive, always-on (while not Incapacitated) remap of save outcome tiers.

### Why no existing atom covers it

- **`grant_resistance`** — halves all incoming damage of a type unconditionally. Does not preserve the save-gated structure; it would halve damage on both success and failure, which is wrong.
- **`modify_roll_advantage`** — changes the d20 roll, not the outcome mapping. Would give advantage on the save, not remap what the outcomes mean.
- **`reduce_damage_taken`** — subtracts a fixed amount from incoming damage regardless of save outcome. Cannot represent "success = zero" without knowing the damage total at authoring time.
- **`modify_roll_numeric`** — adds a bonus to the roll, not to the outcome tiers.

None of these express "for qualifying effects, shift both outcome tiers one level toward zero."

### Proposed shape

```typescript
| {
    readonly kind: "upgrade_save_damage_outcome";
    // Narrows to saves of a specific ability. SRD Evasion is Dex only.
    readonly saveAbility: Ability;
    // Qualifier: only applies when the triggering effect's success
    // outcome would normally be half damage. This scopes the atom to
    // the "Dex save for half" family and avoids accidentally applying
    // to e.g. a Dex save that deals full damage on success.
    readonly qualifier: "half_damage_on_success";
    // Result mapping (both are implied by the qualifier + atom semantics
    // but made explicit for the tracer):
    //   success: no_damage  (was: half)
    //   failure: half_damage (was: full)
  }
```

### Encoding (if atom existed)

```dhall
{ kind = "class_feature"
, id = "rogue_evasion_l7"
, name = "Evasion"
, className = "rogue"
, acquiredAtLevel = 7
, provenance = { kind = "srd-5.2.1", section = "Classes/Rogue#Evasion" }
, description = "..."
, mechanics =
    { family = "passive"
    , suppressedBy =
        [ { kind = "condition_active", conditions = [ "incapacitated" ] } ]
    , grants =
        [ { kind = "upgrade_save_damage_outcome"
          , saveAbility = "dex"
          , qualifier = "half_damage_on_success"
          }
        ]
    }
}
```

### Reuse surface

The same atom shape covers every SRD "Evasion-parity" feature:

- **Rogue Evasion (L7)** — the primary case.
- **Monk Evasion (L13)** — identical text, different class/level.
- Future subclass features that grant the same tier-remap (e.g. certain Ranger subclass abilities).

All three share `saveAbility = "dex"` and `qualifier = "half_damage_on_success"`. The atom is not Rogue-specific.

## Classification

`atom_widening` — the `passive` family and `class_feature` kind are fully adequate; the missing concept is a new effect atom not present in the v4 taxonomy.
