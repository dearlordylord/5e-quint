# Proposal: `grant_environmental_adaptation` atom

**Unit:** Potion of Water Breathing  
**Outcome:** `atom_widening`

## What fits

The `MagicItemRecord` kind and `ActivatedAbilityMechanics` family encode the potion cleanly:

```
activationCost: action          (drinking a potion uses your Action)
resource: use_count, fixed=1    (single-use consumable)
resetCadence: never             (potion is consumed; does not refill)
duration: timed, 24 hours       (effect lasts until 24 hours elapse)
```

All of this is representable today.

## What is missing

The effect "you can breathe underwater" has no v4 atom:

- **Not `grant_sense`** — `SenseKind` is darkvision | blindsight | tremorsense | truesight. Water breathing is not a sense.
- **Not `grant_speed`** — grants a new movement mode (fly/swim/climb/burrow). Swim speed and water breathing are distinct: a creature with swim speed still drowns underwater unless it can breathe there.
- **Not `grant_condition_immunity`** — "suffocating" is not in the SRD 5.2.1 CONDITIONS list (blinded, charmed, deafened, exhaustion, frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned, unconscious). The hazard exists in the SRD rules but is not a named condition.
- **Not `grant_resistance`** — no damage type is involved.

## Proposed widening

Add a new effect atom:

```typescript
| {
    readonly kind: "grant_environmental_adaptation";
    readonly adaptation: "water_breathing";
  }
```

`adaptation` is a closed enum, widened per unit as more environmental adaptations surface (e.g., `lava_immunity` for Efreeti Bottle-style effects). The atom is passive in semantics — while the effect is active, the bearer ignores the underwater suffocation hazard.

### Why `atom_widening` and not `surface_widening`

Environmental adaptations are not a variant of any existing surface shape — they are a conceptually distinct atom class. No existing `EffectAtom` variant can be extended (via a new `kind` value or a new field) to cover "can breathe underwater" without misrepresenting the atom's semantic contract.

### Survey evidence

SRD 5.2.1 potions with similar single-adaptation grants:
- Potion of Water Breathing (this unit)
- Potion of Climbing (climb speed — fits `grant_speed`, already covered)

The climb variant is covered by `grant_speed`; the water-breathing variant is not covered by any existing atom.

## Encoding path once widened

With `grant_environmental_adaptation` added to `EffectAtom`, the full encoding is:

```dhall
{ kind = "magic_item"
, id = "magic_item_potion_of_water_breathing"
, name = "Potion of Water Breathing"
, rarity = "uncommon"
, requiresAttunement = False
, provenance = { kind = "srd-5.2.1", section = "MagicItems#Potion of Water Breathing" }
, description = "You can breathe underwater for 24 hours after drinking this potion."
, mechanics =
    { family = "activation"
    , activationCost = { kind = "action" }
    , resource = { kind = "use_count", cap = { kind = "fixed", uses = 1 } }
    , resetCadence = { kind = "never" }
    , duration =
        { kind = "timed"
        , value = { unit = "hour", amount = 24 }
        }
    , phases =
        [ { kind = "direct"
          , attachment = { kind = "self" }
          , effects =
              [ { kind = "grant_environmental_adaptation"
                , adaptation = "water_breathing"
                }
              ]
          }
        ]
    }
, destruction = { kind = "permanent_on_empty" }
}
```

The `destruction = permanent_on_empty` reflects that a consumed potion is gone; the `use_count fixed=1 + never reset` handles the single-use resource side.
