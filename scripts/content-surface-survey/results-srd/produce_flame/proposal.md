# Widening Proposal: `OngoingEffect.attack_roll` variant

## Unit
Produce Flame (SRD 5.2.1, Cantrip, Conjuration)

## Gap

`OngoingEffect` currently admits three shapes:

```typescript
export type OngoingEffect =
  | EffectAtom
  | { readonly kind: "save_gate"; ... }
  | ModifyAcSetFloorEffect;
```

Produce Flame's offensive use — "you can take a Magic action to hurl fire at a creature or an object within 60 feet of you. Make a ranged spell attack." — requires an `attack_roll` resolution variant in `OngoingEffect`. The trigger (`on_caster_spends_action` with `standard_action / magic`) is already present in the grammar. The missing piece is the resolution node for the attack itself and its onHit/onMiss branches.

## What already fits

| Mechanic | Atom / type | Status |
|---|---|---|
| Bonus action cast | `castingTime: { kind: "bonus_action" }` | ✓ |
| Self range | `range: { kind: "self" }` | ✓ |
| V/S components | `components: { v: true, s: true, m: false }` | ✓ |
| 10-minute timed duration | `duration: { kind: "timed", value: { unit: "minute", amount: 10 } }` | ✓ |
| Ends if recast | `earlyEnd: [{ kind: "caster_recasts_spell" }]` | ✓ |
| Persistent light emission | `emit_light { brightRadiusFeet: 20, dimAdditionalFeet: 20 }` via passive trigger | ✓ |
| Optional Magic-action spend | `on_caster_spends_action { cost: { kind: "standard_action", action: "magic" } }` | ✓ |
| Cantrip die-count scaling | `threshold_tiers, axis: "character"` → `scale_die_count` | ✓ |
| Attack target range (60 ft) | Would attach to a `target` attachment | ✓ |

## What is missing

**`attack_roll` variant in `OngoingEffect`:**

```typescript
export type OngoingEffect =
  | EffectAtom
  | {
      readonly kind: "save_gate";
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly onFail: EffectAtom;
      readonly onSuccess: SaveSuccessOutcome;
    }
  | ModifyAcSetFloorEffect
  // PROPOSED:
  | {
      readonly kind: "attack_roll";
      readonly attachment: Attachment;           // target within 60 ft
      readonly attackKind: AttackKind;           // "ranged_spell_attack"
      readonly onHit: ReadonlyNonEmptyArray<EffectAtom>;
      readonly onMiss: ReadonlyNonEmptyArray<EffectAtom>;
    };
```

This mirrors the existing `attack_roll` `ActivationPhase` shape exactly. The tracer already knows how to walk `attack_roll` phases; the gap is only that `OngoingEffect` doesn't admit it.

## Pressure evidence

Produce Flame is the first SRD unit that combines:
1. A persistent passive effect (light emission), AND
2. An optional per-turn attack-roll action from an ongoing spell

Heat Metal and similar units use `on_caster_spends_action` with damage EffectAtoms (no attack roll), so they didn't expose this gap. Produce Flame is unique in requiring attack roll resolution within the ongoing trigger grammar.

## Proposed encoding (once widening is applied)

```dhall
{ kind = "spell"
, id = "produce_flame"
, name = "Produce Flame"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-P-R#Produce Flame" }
, description = "..."
, mechanics =
    { family = "ongoing_effect"
    , level = 0
    , school = "conjuration"
    , castingTime = { kind = "bonus_action" }
    , range = { kind = "self" }
    , components = { v = True, s = True, m = False }
    , duration =
        { kind = "timed"
        , value = { unit = "minute", amount = 10 }
        , earlyEnd = [ { kind = "caster_recasts_spell" } ]
        }
    , attachment = { kind = "self" }
    , operations =
        [ { trigger = { kind = "passive" }
          , effect = { kind = "emit_light", brightRadiusFeet = 20, dimAdditionalFeet = 20 }
          }
        , { trigger =
              { kind = "on_caster_spends_action"
              , cost = { kind = "standard_action", action = "magic" }
              }
          , effect =
              -- PROPOSED shape (not yet in OngoingEffect):
              { kind = "attack_roll"
              , attachment =
                  { kind = "target"
                  , selection = { mode = "one" }
                  , rangeOrigin = "caster"   -- within 60 ft (range on attachment)
                  }
              , attackKind = "ranged_spell_attack"
              , onHit =
                  [ { kind = "damage"
                    , damageType = "fire"
                    , amount =
                        { kind = "threshold_tiers"
                        , axis = "character"
                        , base = { dice = 1, dieSize = 8 }
                        , tiers =
                            [ { atLevel = 5,  override = { dice = 2 } }
                            , { atLevel = 11, override = { dice = 3 } }
                            , { atLevel = 17, override = { dice = 4 } }
                            ]
                        }
                    }
                  ]
              , onMiss = [ { kind = "none" } ]
              }
          }
        ]
    }
}
```

## Classification

`surface_widening` — the `ongoing_effect` family, all needed atoms, and all needed triggers exist. Only `OngoingEffect` needs one new variant to admit attack-roll resolutions inside ongoing operation effects.
