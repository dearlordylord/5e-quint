-- Searing Smite — SRD 5.2.1 Spell, level 1, Evocation.
--
-- RAW (Spells/Descriptions-S-Z#Searing Smite):
--   "Bonus Action, which you take immediately after hitting a target
--    with a Melee weapon or an Unarmed Strike"
--   "As you hit the target, it takes an extra 1d6 Fire damage from
--    the attack."
--   "At the start of each of its turns until the spell ends, the
--    target takes 1d6 Fire damage and then makes a Constitution saving
--    throw. On a failed save, the spell continues. On a successful
--    save, the spell ends."

let DiceExpr : Type = { dice : Natural, dieSize : Natural }

let DiceExprDelta : Type = { dice : Natural, dieSize : Optional Natural }

let DiceAmount : Type =
      { kind : Text
      , expr : Optional DiceExpr
      , axis : Optional Text
      , base : Optional DiceExpr
      , perLevel : Optional DiceExprDelta
      , startingAtLevel : Optional Natural
      }

let EffectAtom : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      }

let fireDamage : EffectAtom =
      { kind = "damage"
      , damageType = Some "fire"
      , amount =
          Some
            { kind = "linear_per_level"
            , expr = None DiceExpr
            , axis = Some "slot"
            , base = Some { dice = 1, dieSize = 6 }
            , perLevel = Some { dice = 1, dieSize = Some 6 }
            , startingAtLevel = Some 1
            }
      }

let noEffect : EffectAtom =
      { kind = "none"
      , damageType = None Text
      , amount = None DiceAmount
      }

let endEffect : EffectAtom =
      { kind = "end_current_effect"
      , damageType = None Text
      , amount = None DiceAmount
      }

let OngoingChild : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional EffectAtom
      , onSuccess : Optional EffectAtom
      }

let ongoingDamage : OngoingChild =
      { kind = "damage"
      , damageType = Some "fire"
      , amount = fireDamage.amount
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None EffectAtom
      , onSuccess = None EffectAtom
      }

let endSave : OngoingChild =
      { kind = "save_gate"
      , damageType = None Text
      , amount = None DiceAmount
      , ability = Some "con"
      , dc = Some { kind = "caster_spell_save_dc" }
      , onFail = Some noEffect
      , onSuccess = Some endEffect
      }

let turnStartEffect =
      { kind = "composite_ongoing"
      , effects = [ ongoingDamage, endSave ]
      }

let hitTarget =
      { kind = "hole"
      , holeId = "searing_smite_hit_target"
      , label = "hit target"
      , value =
          { kind = "target"
          , selection = { mode = "one" }
          }
      }

let searingSmite =
      { kind = "spell"
      , id = "searing_smite"
      , name = "Searing Smite"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Searing Smite"
          }
      , description =
          "Immediately after hitting a target with a Melee weapon or an Unarmed Strike, you take a Bonus Action. As you hit the target, it takes an extra 1d6 Fire damage from the attack. At the start of each of its turns until the spell ends, the target takes 1d6 Fire damage and then makes a Constitution saving throw. On a failed save, the spell continues. On a successful save, the spell ends. Using a Higher-Level Spell Slot. All the damage increases by 1d6 for each spell slot level above 1."
      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "evocation"
          , castingTime =
              { kind = "bonus_action"
              , trigger =
                  { kind = "after_hit_with"
                  , attack = "melee_weapon_or_unarmed_strike"
                  }
              }
          , range = { kind = "self" }
          , components = { v = True, s = False, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 1 }
              }
          , attachment = hitTarget
          , initialPhase =
              { kind = "direct"
              , attachment = hitTarget
              , effects = [ fireDamage ]
              }
          , operations =
              [ { trigger = { kind = "on_attached_turn_start" }
                , effect = turnStartEffect
                }
              ]
          }
      }

in  searingSmite
