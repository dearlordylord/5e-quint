-- Shining Smite — SRD 5.2.1 Spell, level 2, Transmutation.
--
-- RAW (Spells/Descriptions-S-Z#Shining Smite):
--   "Bonus Action, which you take immediately after hitting a creature
--    with a Melee weapon or an Unarmed Strike"
--   "The target hit by the strike takes an extra 2d6 Radiant damage
--    from the attack."
--   "Until the spell ends, the target sheds Bright Light in a 5-foot
--    radius, attack rolls against it have Advantage, and it can't
--    benefit from the Invisible condition."

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

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , brightRadiusFeet : Optional Natural
      , mode : Optional Text
      , on : Optional (List Text)
      , affects : Optional Text
      , condition : Optional Text
      }

let smiteDamage : Effect =
      { kind = "damage"
      , damageType = Some "radiant"
      , amount =
          Some
            { kind = "linear_per_level"
            , expr = None DiceExpr
            , axis = Some "slot"
            , base = Some { dice = 2, dieSize = 6 }
            , perLevel = Some { dice = 1, dieSize = Some 6 }
            , startingAtLevel = Some 2
            }
      , brightRadiusFeet = None Natural
      , mode = None Text
      , on = None (List Text)
      , affects = None Text
      , condition = None Text
      }

let brightLight : Effect =
      { kind = "emit_light"
      , damageType = None Text
      , amount = None DiceAmount
      , brightRadiusFeet = Some 5
      , mode = None Text
      , on = None (List Text)
      , affects = None Text
      , condition = None Text
      }

let attackAdvantage : Effect =
      { kind = "modify_roll_advantage"
      , damageType = None Text
      , amount = None DiceAmount
      , brightRadiusFeet = None Natural
      , mode = Some "advantage"
      , on = Some [ "attack_roll" ]
      , affects = Some "rolls_against_self"
      , condition = None Text
      }

let suppressInvisible : Effect =
      { kind = "suppress_condition_benefit"
      , damageType = None Text
      , amount = None DiceAmount
      , brightRadiusFeet = None Natural
      , mode = None Text
      , on = None (List Text)
      , affects = None Text
      , condition = Some "invisible"
      }

let hitTarget =
      { kind = "hole"
      , holeId = "shining_smite_hit_target"
      , label = "hit creature"
      , value =
          { kind = "target"
          , selection = { mode = "one" }
          }
      }

let shiningSmite =
      { kind = "spell"
      , id = "shining_smite"
      , name = "Shining Smite"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Shining Smite"
          }
      , description =
          "Immediately after hitting a creature with a Melee weapon or an Unarmed Strike, you take a Bonus Action. The target takes an extra 2d6 Radiant damage from the attack. Until the spell ends, the target sheds Bright Light in a 5-foot radius, attack rolls against it have Advantage, and it can't benefit from the Invisible condition. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 2."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "transmutation"
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
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = hitTarget
          , initialPhase =
              { kind = "direct"
              , attachment = hitTarget
              , effects = [ smiteDamage ]
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect = brightLight
                }
              , { trigger = { kind = "passive" }
                , effect = attackAdvantage
                }
              , { trigger = { kind = "passive" }
                , effect = suppressInvisible
                }
              ]
          }
      }

in  shiningSmite
