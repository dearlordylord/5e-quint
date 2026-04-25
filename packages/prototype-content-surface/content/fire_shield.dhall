-- Fire Shield — SRD 5.2.1 Spell, level 4, Evocation.
--
-- RAW (Spells/Descriptions-E-L#Fire Shield):
--   "Wispy flames wreathe your body for the duration, shedding Bright
--    Light in a 10-foot radius and Dim Light for an additional 10 feet."
--   "The warm shield grants you Resistance to Cold damage, and the
--    chill shield grants you Resistance to Fire damage."
--   "Whenever a creature within 5 feet of you hits you with a melee
--    attack roll, the attacker takes 2d8 Fire damage from a warm
--    shield or 2d8 Cold damage from a chill shield."

let DamageTypeOption : Type =
      { id : Text, displayName : Text, damageType : Text }

let DamageTypeRef : Type =
      { kind : Text
      , holeId : Optional Text
      , label : Optional Text
      , options : Optional (List DamageTypeOption)
      }

let resistanceChoice : DamageTypeRef =
      { kind = "choice_table"
      , holeId = Some "fire_shield_mode"
      , label = Some "shield mode resistance"
      , options =
          Some
            [ { id = "warm", displayName = "warm shield", damageType = "cold" }
            , { id = "chill", displayName = "chill shield", damageType = "fire" }
            ]
      }

let retaliationChoice : DamageTypeRef =
      { kind = "same_table_choice_as"
      , holeId = Some "fire_shield_mode"
      , label = None Text
      , options =
          Some
            [ { id = "warm", displayName = "warm shield", damageType = "fire" }
            , { id = "chill", displayName = "chill shield", damageType = "cold" }
            ]
      }

let DiceAmount : Type =
      { kind : Text, expr : { dice : Natural, dieSize : Natural } }

let Effect : Type =
      { kind : Text
      , brightRadiusFeet : Optional Natural
      , dimAdditionalFeet : Optional Natural
      , damageType : Optional DamageTypeRef
      , amount : Optional DiceAmount
      , target : Optional Text
      }

let light : Effect =
      { kind = "emit_light"
      , brightRadiusFeet = Some 10
      , dimAdditionalFeet = Some 10
      , damageType = None DamageTypeRef
      , amount = None DiceAmount
      , target = None Text
      }

let resistance : Effect =
      { kind = "grant_resistance"
      , brightRadiusFeet = None Natural
      , dimAdditionalFeet = None Natural
      , damageType = Some resistanceChoice
      , amount = None DiceAmount
      , target = None Text
      }

let retaliation : Effect =
      { kind = "retaliatory_damage"
      , brightRadiusFeet = None Natural
      , dimAdditionalFeet = None Natural
      , damageType = Some retaliationChoice
      , amount = Some { kind = "fixed", expr = { dice = 2, dieSize = 8 } }
      , target = Some "triggering_attacker"
      }

let Trigger : Type =
      { kind : Text
      , attackKind : Optional Text
      , attackerWithinFeet : Optional Natural
      }

let passive : Trigger =
      { kind = "passive"
      , attackKind = None Text
      , attackerWithinFeet = None Natural
      }

let hitByMeleeWithinFive : Trigger =
      { kind = "on_attached_hit_by_attack_roll"
      , attackKind = Some "melee"
      , attackerWithinFeet = Some 5
      }

let fireShield =
      { kind = "spell"
      , id = "fire_shield"
      , name = "Fire Shield"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Fire Shield"
          }
      , description =
          "Wispy flames wreathe your body for the duration, shedding Bright Light in a 10-foot radius and Dim Light for an additional 10 feet. Choose a warm shield or a chill shield. The warm shield grants Resistance to Cold damage; the chill shield grants Resistance to Fire damage. Whenever a creature within 5 feet of you hits you with a melee attack roll, the attacker takes 2d8 Fire damage from a warm shield or 2d8 Cold damage from a chill shield."
      , mechanics =
          { family = "ongoing_effect"
          , level = 4
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "a bit of phosphorus or a firefly"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 10 }
              }
          , attachment = { kind = "self" }
          , operations =
              [ { trigger = passive
                , effect = light
                }
              , { trigger = passive
                , effect = resistance
                }
              , { trigger = hitByMeleeWithinFive
                , effect = retaliation
                }
              ]
          }
      }

in  fireShield
