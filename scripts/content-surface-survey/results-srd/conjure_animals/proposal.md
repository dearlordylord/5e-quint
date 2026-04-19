# Proposal: Conjure Animals — surface_widening

## Unit

**Spell**: Conjure Animals (SRD 5.2.1, Level 3 Conjuration, Concentration 10 min)

## Summary

The damage mechanics (area save-gate, 3d10 Slashing, +1d10/slot upcast, `on_creature_enters_area`, `on_creature_ends_turn_in_area`) all fit cleanly with existing atoms. Four surface gaps prevent honest encoding:

1. Caster-proximity predicate for the Str-save advantage
2. `on_caster_moves` trigger for free pack repositioning
3. Symmetric `on_area_repositioned_to_include_creature` trigger
4. Once-per-turn-per-creature cap on save triggers

## Mechanics Overview

The spell creates a Large spectral pack at a fixed point within 60 ft. Three distinct mechanical payloads:

### A. Caster Strength-save advantage (passive, proximity-gated)

> "You have Advantage on Strength saving throws while you're within 5 feet of the pack."

The caster gains `modify_roll_advantage` (Str saves) but only while positioned within 5 ft of the pack's current location. This is a spatial proximity gate on the caster, not a condition on the target creature.

**Gap**: `OngoingPredicate` has only one variant (`at_hp_threshold`). A `caster_within_feet_of_attachment` predicate variant is needed to gate the passive rider on caster proximity to the area attachment.

### B. Pack repositioning when caster moves (free, caster-turn-scoped)

> "when you move on your turn, you can also move the pack up to 30 feet to an unoccupied space you can see"

The pack can be repositioned during the caster's movement, at no action-economy cost. `reposition_attachment` is the correct effect atom, but it requires `on_caster_spends_action` as its trigger — which implies spending a Bonus Action or Magic action. Here the repositioning piggybacks on ordinary movement with no action quota consumed.

**Gap**: A new `OngoingTrigger` variant `on_caster_moves` (or `on_caster_uses_movement`) is needed to express "caster expends movement, may simultaneously reposition the attachment up to N feet."

### C. Save triggered by pack-moves-to-creature (symmetric to on_creature_enters_area)

> "Whenever the pack moves within 10 feet of a creature you can see"

When the pack is repositioned (via B above) such that a creature is now within 10 ft who was not previously, that creature must make the Dex save. This is the reverse direction of `on_creature_enters_area` (creature moves into area). The surface has no symmetric "area moves to include creature" trigger.

**Gap**: A new `OngoingTrigger` variant `on_area_repositioned_to_include_creature` (or parameterize existing `on_creature_enters_area` to also fire on area movement) is needed.

### D. Once-per-turn-per-creature cap

> "A creature makes this save only once per turn."

All three trigger events (pack moves to creature, creature enters, creature ends turn there) could fire for the same creature in the same turn. RAW caps at one save per creature per turn. The current `OngoingOperation` has no per-turn-per-target frequency fence. The existing `count` field on `modify_roll_numeric` / `modify_roll_advantage` is a lifetime count, not a per-turn-per-creature cap.

**Gap**: A new field `maxOncePerTurnPerCreature: true` (or similar) on `OngoingOperation` is needed to express this once-per-turn-per-creature firing constraint.

## What Does Fit

- `ongoing_effect` family, concentration up to 10 minutes ✓
- Area attachment (emanation 10 ft around pack origin) ✓
- `on_creature_enters_area` trigger for creature-enters direction ✓
- `on_creature_ends_turn_in_area` trigger ✓
- `save_gate` with `dex`, `caster_spell_save_dc` ✓
- `damage { kind: "damage", damageType: "slashing", amount: { kind: "linear_per_level", axis: "slot", base: { dice: 3, dieSize: 10 }, perLevel: { dice: 1 }, startingAtLevel: 3 } }` ✓

## Proposed Surface Changes

### 1. New `OngoingTrigger` variant: `on_caster_moves`

```typescript
| {
    readonly kind: "on_caster_moves";
    // Optional: also fires a reposition on the operation's attachment
    readonly repositionAttachmentFeet?: number;
  }
```

### 2. New `OngoingTrigger` variant: `on_area_repositioned_to_include_creature`

```typescript
| { readonly kind: "on_area_repositioned_to_include_creature" }
```

This fires when the area attachment is repositioned (via `on_caster_moves` or `on_caster_spends_action`) such that a creature who was outside the area boundary is now inside it.

### 3. New `OngoingPredicate` variant: `caster_within_feet_of_attachment`

```typescript
| {
    readonly kind: "caster_within_feet_of_attachment";
    readonly feet: number;
  }
```

Allows passive operation riders to be gated on the caster's distance to the spell's own area/mark attachment.

### 4. New `OngoingOperation` field: `maxOncePerTurnPerCreature`

```typescript
type OngoingOperation = {
  readonly trigger: OngoingTrigger;
  readonly predicate?: OngoingPredicate;
  readonly effect: OngoingEffect;
  readonly maxOncePerTurnPerCreature?: true;   // NEW
};
```

Caps the trigger to firing at most once per (turn, creature) pair regardless of how many triggering events occur.

## Encoding sketch (pending surface changes)

```dhall
{ family = "ongoing_effect"
, level = 3
, school = "conjuration"
, castingTime = { kind = "action" }
, range = { kind = "point", feet = 60 }
, components = { v = True, s = True, m = False }
, duration = { kind = "concentration", upTo = { unit = "minute", amount = 10 } }
, attachment = { kind = "area"
               , shape = { kind = "emanation", radiusFeet = 10 }
               , origin = { kind = "point_within_range" }  -- the pack
               }
, operations =
    [ -- A. Caster Str-save advantage while within 5 ft of pack
      { trigger = { kind = "passive" }
      , predicate = { kind = "caster_within_feet_of_attachment", feet = 5 }  -- NEW
      , effect = { kind = "modify_roll_advantage"
                 , mode = "advantage"
                 , on = [ "saving_throw" ]
                 , saveAbilityFilter = [ "str" ]
                 }
      }
      -- B+C. Pack repositioning + save on pack-moves-to-creature
    , { trigger = { kind = "on_caster_moves", repositionAttachmentFeet = 30 }  -- NEW
      , effect = -- save gate on creatures newly included
      }
      -- C (partial). Creature enters area
    , { trigger = { kind = "on_creature_enters_area" }
      , maxOncePerTurnPerCreature = True  -- NEW
      , effect = { kind = "save_gate", ability = "dex", dc = { kind = "caster_spell_save_dc" }
                 , onFail = { kind = "damage", damageType = "slashing"
                            , amount = { kind = "linear_per_level", axis = "slot"
                                       , base = { dice = 3, dieSize = 10 }
                                       , perLevel = { dice = 1 }
                                       , startingAtLevel = 3
                                       }
                            }
                 , onSuccess = { kind = "none" }
                 }
      }
      -- D. Creature ends turn in area
    , { trigger = { kind = "on_creature_ends_turn_in_area" }
      , maxOncePerTurnPerCreature = True  -- NEW
      , effect = { kind = "save_gate" ... }
      }
    ]
}
```
