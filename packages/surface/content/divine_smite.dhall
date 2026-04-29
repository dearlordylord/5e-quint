-- Divine Smite — SRD 5.2.1 Spell, level 1, Evocation.
--
-- RAW (Spells/Descriptions-A-D#Divine Smite):
--   "Bonus Action, which you take immediately after hitting a target
--    with a Melee weapon or an Unarmed Strike"
--   "The target takes an extra 2d8 Radiant damage from the attack."
--   "The damage increases by 1d8 if the target is a Fiend or an
--    Undead."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d8
--    for each spell slot level above 1."

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

let CreatureTypeCondition : Type =
      { kind : Text, types : List Text }

let Effect : Type =
      { kind : Text
      , when : Optional CreatureTypeCondition
      , damageType : Text
      , amount : DiceAmount
      }

let baseDamage : Effect =
      { kind = "damage"
      , when = None CreatureTypeCondition
      , damageType = "radiant"
      , amount =
          { kind = "linear_per_level"
          , expr = None DiceExpr
          , axis = Some "slot"
          , base = Some { dice = 2, dieSize = 8 }
          , perLevel = Some { dice = 1, dieSize = Some 8 }
          , startingAtLevel = Some 1
          }
      }

let fiendUndeadBonus : Effect =
      { kind = "conditional_bonus_damage"
      , when =
          Some
            { kind = "target_creature_type"
            , types = [ "fiend", "undead" ]
            }
      , damageType = "radiant"
      , amount =
          { kind = "fixed"
          , expr = Some { dice = 1, dieSize = 8 }
          , axis = None Text
          , base = None DiceExpr
          , perLevel = None DiceExprDelta
          , startingAtLevel = None Natural
          }
      }

let divineSmite =
      { kind = "spell"
      , id = "divine_smite"
      , name = "Divine Smite"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Divine Smite"
          }
      , description =
          "Immediately after hitting a target with a Melee weapon or an Unarmed Strike, you take a Bonus Action. The target takes an extra 2d8 Radiant damage from the attack, plus 1d8 if the target is a Fiend or an Undead. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 1."
      , mechanics =
          { family = "activation"
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
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "divine_smite_hit_target"
                    , label = "hit target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects = [ baseDamage, fiendUndeadBonus ]
                }
              ]
          }
      }

in  divineSmite
