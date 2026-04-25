-- Sunbeam — SRD 5.2.1 Spell, level 6, Evocation.
--
-- RAW (Spells/Descriptions-S-Z#Sunbeam):
--   "You launch a sunbeam in a 5-foot-wide, 60-foot-long Line."
--   "On a failed save, a creature takes 6d8 Radiant damage and has
--    the Blinded condition until the start of your next turn. On a
--    successful save, it takes half as much damage only."
--   "Until the spell ends, you can take a Magic action to create a new
--    Line of radiance."
--   "For the duration, a mote of brilliant radiance shines above you.
--    It sheds Bright Light in a 30-foot radius and Dim Light for an
--    additional 30 feet. This light is sunlight."
--
-- PARTIAL. `apply_condition` does not currently carry the
-- until-start-of-next-turn expiry; the timing is preserved in the RAW
-- description and should become executable when condition expiry is
-- promoted into the atom.

let DiceExpr : Type = { dice : Natural, dieSize : Natural }

let DiceExprDelta : Type = { dice : Natural, dieSize : Optional Natural }

let DiceAmount : Type =
      { kind : Text
      , axis : Optional Text
      , base : Optional DiceExpr
      , perLevel : Optional DiceExprDelta
      , startingAtLevel : Optional Natural
      , expr : Optional DiceExpr
      }

let ChildEffect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , condition : Optional Text
      }

let EffectResult : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , condition : Optional Text
      , effects : Optional (List ChildEffect)
      , brightRadiusFeet : Optional Natural
      , dimAdditionalFeet : Optional Natural
      }

let radiantDamage : ChildEffect =
      { kind = "damage"
      , damageType = Some "radiant"
      , amount =
          Some
            { kind = "linear_per_level"
            , axis = Some "slot"
            , base = Some { dice = 6, dieSize = 8 }
            , perLevel = Some { dice = 1, dieSize = Some 8 }
            , startingAtLevel = Some 1
            , expr = None DiceExpr
            }
      , condition = None Text
      }

let blinded : ChildEffect =
      { kind = "apply_condition"
      , damageType = None Text
      , amount = None DiceAmount
      , condition = Some "blinded"
      }

let OngoingEffect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , condition : Optional Text
      , effects : Optional (List ChildEffect)
      , brightRadiusFeet : Optional Natural
      , dimAdditionalFeet : Optional Natural
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional
          { kind : Text
          , damageType : Optional Text
          , amount : Optional DiceAmount
          , condition : Optional Text
          , effects : Optional (List ChildEffect)
          , brightRadiusFeet : Optional Natural
          , dimAdditionalFeet : Optional Natural
          }
      , onSuccess : Optional
          { kind : Text
          , damageType : Optional Text
          , amount : Optional DiceAmount
          , condition : Optional Text
          , effects : Optional (List ChildEffect)
          , brightRadiusFeet : Optional Natural
          , dimAdditionalFeet : Optional Natural
          }
      }

let failedSave : EffectResult =
      { kind = "composite"
      , damageType = None Text
      , amount = None DiceAmount
      , condition = None Text
      , effects = Some [ radiantDamage, blinded ]
      , brightRadiusFeet = None Natural
      , dimAdditionalFeet = None Natural
      }

let halfDamage : EffectResult =
      { kind = "half_damage"
      , damageType = None Text
      , amount = None DiceAmount
      , condition = None Text
      , effects = None (List ChildEffect)
      , brightRadiusFeet = None Natural
      , dimAdditionalFeet = None Natural
      }

let sunlight : OngoingEffect =
      { kind = "emit_light"
      , damageType = None Text
      , amount = None DiceAmount
      , condition = None Text
      , effects = None (List ChildEffect)
      , brightRadiusFeet = Some 30
      , dimAdditionalFeet = Some 30
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None EffectResult
      , onSuccess = None EffectResult
      }

let lineAttachment =
      { kind = "hole"
      , holeId = "sunbeam_line"
      , label = "line of radiance"
      , value =
          { kind = "area"
          , shape = { kind = "line", lengthFeet = 60, widthFeet = 5 }
          , origin = { kind = "self" }
          }
      }

let saveGate =
      { kind = "save_gate"
      , ability = "con"
      , dc = { kind = "caster_spell_save_dc" }
      , onFail = failedSave
      , onSuccess = halfDamage
      }

let saveGateEffect : OngoingEffect =
      { kind = "save_gate"
      , damageType = None Text
      , amount = None DiceAmount
      , condition = None Text
      , effects = None (List ChildEffect)
      , brightRadiusFeet = None Natural
      , dimAdditionalFeet = None Natural
      , ability = Some "con"
      , dc = Some { kind = "caster_spell_save_dc" }
      , onFail = Some failedSave
      , onSuccess = Some halfDamage
      }

let Trigger : Type =
      { kind : Text
      , cost : Optional { kind : Text, action : Optional Text }
      }

let passive : Trigger =
      { kind = "passive"
      , cost = None { kind : Text, action : Optional Text }
      }

let magicAction : Trigger =
      { kind = "on_caster_spends_action"
      , cost =
          Some
            { kind = "standard_action"
            , action = Some "magic"
            }
      }

let sunbeam =
      { kind = "spell"
      , id = "sunbeam"
      , name = "Sunbeam"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Sunbeam"
          }
      , description =
          "You launch a sunbeam in a 5-foot-wide, 60-foot-long Line. Each creature in the Line makes a Constitution saving throw. On a failed save, a creature takes 6d8 Radiant damage and has the Blinded condition until the start of your next turn. On a successful save, it takes half as much damage only. Until the spell ends, you can take a Magic action to create a new Line of radiance. For the duration, a mote of brilliant radiance shines above you, shedding Bright Light in a 30-foot radius and Dim Light for an additional 30 feet. This light is sunlight. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 1."
      , mechanics =
          { family = "ongoing_effect"
          , level = 6
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "a magnifying glass"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = lineAttachment
          , initialPhase =
              saveGate // { attachment = lineAttachment }
          , operations =
              [ { trigger = passive
                , effect = sunlight
                }
              , { trigger = magicAction
                , effect = saveGateEffect
                }
              ]
          }
      }

in  sunbeam
