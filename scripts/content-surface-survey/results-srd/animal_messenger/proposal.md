# Proposal: Animal Messenger widening

## Classification

`atom_widening`

## What fits

The spell maps cleanly onto the `activation` family with a `save_gate` phase:

- **CastingTime**: `{ kind: "action", ritual: true }` — SRD text reads "Action or Ritual"
- **Range**: `{ kind: "point", feet: 30 }`
- **Components**: V, S, M ("a morsel of food")
- **Duration**: `{ kind: "timed", value: { unit: "hour", amount: 24 }, upcastTiers: [{ atSlot: 3, amount: 72 }, { atSlot: 4, amount: 120 }, ...] }` — "+48 hours for each spell slot level above 2" encodes cleanly via `DurationValue.upcastTiers`
- **Target**: one Tiny Beast (`selection: { mode: "one", typeFilter: ["beast"] }`)
- **Save gate**: CHA save, caster spell save DC

## What's missing

### 1. `assign_courier_task` EffectAtom (blocking)

The `onFail` outcome of the save gate is: the target beast is bound to a courier task for the spell's duration. It will:
- Travel toward a caster-specified location (previously visited by the caster)
- Find a recipient matching a caster-provided general description
- Deliver a verbal message of up to 25 words, mimicking the caster's communication

This is a **deterministic mechanical commitment** — the beast will attempt the task until the spell expires or it succeeds. It is not a condition (`charmed`, `paralyzed`, etc.), not a stat modification, and not any existing EffectAtom in the surface.

Proposed atom shape:
```typescript
{
  readonly kind: "assign_courier_task";
  // destination and recipient description are caster-specified at cast time;
  // their resolution is DM-adjudicated, but the task assignment itself is deterministic.
}
```

Compare to Geas (which applies `charmed` — a real mechanical condition) and Animal Friendship (also `charmed`). Animal Messenger applies *no* condition; the beast is behaviorally compelled without any modeled condition.

### 2. `saveAppliesIf: "cr_equals_zero"` variant (secondary)

The SRD text includes: "if the target's Challenge Rating isn't 0, it automatically succeeds." This indicates the CHA saving throw is only made by CR 0 beasts; CR > 0 beasts cooperate automatically (skip the save).

The existing `saveAppliesIf` field accepts only `"unwilling_target"` (True Polymorph pattern). A CR-based predicate is a new variant of that surface field:

```typescript
readonly saveAppliesIf?: "unwilling_target" | { readonly kind: "cr_equals"; readonly cr: 0 };
```

## DM agenda boundary

The following elements are DM-adjudicated and correctly excluded from the mechanical surface:
- Whether the specified location exists and is reachable within the spell duration
- Whether the beast finds a creature matching the description ("a person dressed in the uniform of the town guard")
- The 25/50 miles-per-day travel speed (narrative travel pacing, not combat movement)
- What happens if the message is delivered but the recipient doesn't respond

These are in the same category as Geas's compliance behavior (noted as DM agenda in that unit's encoding).

## Encoding path once widened

With `assign_courier_task` added to `EffectAtom`:

```dhall
{ kind = "spell"
, id = "animal_messenger"
, name = "Animal Messenger"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-A-D#Animal Messenger" }
, mechanics =
    { family = "activation"
    , level = 2
    , school = "enchantment"
    , castingTime = { kind = "action", ritual = True }
    , range = { kind = "point", feet = 30 }
    , components = { v = True, s = True, m = Some "a morsel of food" }
    , duration =
        { kind = "timed"
        , value =
            { unit = "hour"
            , amount = 24
            , upcastTiers =
                [ { atSlot = 3, amount = 72 }
                , { atSlot = 4, amount = 120 }
                , { atSlot = 5, amount = 168 }
                -- +48h per slot; full tier list omitted for brevity
                ]
            }
        }
    , phases =
        [ { kind = "save_gate"
          , attachment =
              { kind = "target"
              , selection = { mode = "one", typeFilter = [ "beast" ] }
              }
          , ability = "cha"
          , dc = { kind = "caster_spell_save_dc" }
          , saveAppliesIf = Some { kind = "cr_equals", cr = 0 }  -- secondary widening
          , onFail = { kind = "assign_courier_task" }             -- primary widening
          , onSuccess = { kind = "none" }
          }
        ]
    }
}
```
