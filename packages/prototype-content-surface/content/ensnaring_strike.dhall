-- Ensnaring Strike — SRD 5.2.1 Spell, level 1, Conjuration.
--
-- RAW (Spells/Descriptions-E-L#Ensnaring Strike):
--   "Bonus Action, which you take immediately after hitting a creature
--    with a weapon"
--   "As you hit the target, grasping vines appear on it, and it makes
--    a Strength saving throw."
--   "On a failed save, the target has the Restrained condition until
--    the spell ends. On a successful save, the vines shrivel away, and
--    the spell ends."
--   "While Restrained, the target takes 1d6 Piercing damage at the
--    start of each of its turns."
--
-- PARTIAL. A Large-or-larger target's save Advantage and the later
-- Strength (Athletics) escape action are deferred; they require
-- size-scoped save modifiers and third-party action checks.

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
      , condition : Optional Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      }

let restrained : Effect =
      { kind = "apply_condition"
      , condition = Some "restrained"
      , damageType = None Text
      , amount = None DiceAmount
      }

let endEffect : Effect =
      { kind = "end_current_effect"
      , condition = None Text
      , damageType = None Text
      , amount = None DiceAmount
      }

let piercingDamage : Effect =
      { kind = "damage"
      , condition = None Text
      , damageType = Some "piercing"
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

let hitTarget =
      { kind = "hole"
      , holeId = "ensnaring_strike_hit_target"
      , label = "hit creature"
      , value =
          { kind = "target"
          , selection = { mode = "one" }
          }
      }

let ensnaringStrike =
      { kind = "spell"
      , id = "ensnaring_strike"
      , name = "Ensnaring Strike"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Ensnaring Strike"
          }
      , description =
          "Immediately after hitting a creature with a weapon, you take a Bonus Action. As you hit the target, grasping vines appear on it, and it makes a Strength saving throw. On a failed save, the target has the Restrained condition until the spell ends. On a successful save, the vines shrivel away, and the spell ends. While Restrained, the target takes 1d6 Piercing damage at the start of each of its turns. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1."
      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "conjuration"
          , castingTime =
              { kind = "bonus_action"
              , trigger =
                  { kind = "after_hit_with"
                  , attack = "weapon"
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
              { kind = "save_gate"
              , attachment = hitTarget
              , ability = "str"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail = restrained
              , onSuccess = endEffect
              }
          , operations =
              [ { trigger = { kind = "on_attached_turn_start" }
                , effect = piercingDamage
                }
              ]
          }
      }

in  ensnaringStrike
