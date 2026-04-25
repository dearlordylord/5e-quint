-- Ray of Enfeeblement — SRD 5.2.1 Spell, level 2, Necromancy.
--
-- RAW (Spells/Descriptions-Q-R#Ray of Enfeeblement):
--   "The target must make a Constitution saving throw."
--   "On a successful save, the target has Disadvantage on the next
--    attack roll it makes until the start of your next turn."
--   "On a failed save, the target has Disadvantage on Strength-based
--    D20 Tests for the duration. During that time, it also subtracts
--    1d8 from all its damage rolls. The target repeats the save at
--    the end of each of its turns, ending the spell on a success."

let ChildEffect : Type =
      { kind : Text
      , mode : Optional Text
      , on : Optional (List Text)
      , count : Optional Natural
      , expiresOn : Optional { kind : Text }
      , abilityFilter : Optional (List Text)
      , delta :
          Optional
            { kind : Text
            , dice : Natural
            , dieSize : Natural
            , sign : Text
            }
      }

let Effect : Type =
      { kind : Text
      , mode : Optional Text
      , on : Optional (List Text)
      , count : Optional Natural
      , expiresOn : Optional { kind : Text }
      , abilityFilter : Optional (List Text)
      , delta :
          Optional
            { kind : Text
            , dice : Natural
            , dieSize : Natural
            , sign : Text
            }
      , effects : Optional (List ChildEffect)
      }

let nextAttackDisadvantage : Effect =
      { kind = "modify_roll_advantage"
      , mode = Some "disadvantage"
      , on = Some [ "attack_roll" ]
      , count = Some 1
      , expiresOn = Some { kind = "caster_turn_start" }
      , abilityFilter = None (List Text)
      , delta =
          None
            { kind : Text
            , dice : Natural
            , dieSize : Natural
            , sign : Text
            }
      , effects = None (List ChildEffect)
      }

let strengthD20Disadvantage : ChildEffect =
      { kind = "modify_roll_advantage"
      , mode = Some "disadvantage"
      , on = Some [ "attack_roll", "ability_check", "saving_throw" ]
      , count = None Natural
      , expiresOn = None { kind : Text }
      , abilityFilter = Some [ "str" ]
      , delta =
          None
            { kind : Text
            , dice : Natural
            , dieSize : Natural
            , sign : Text
            }
      }

let damagePenalty : ChildEffect =
      { kind = "modify_damage_numeric"
      , mode = None Text
      , on = None (List Text)
      , count = None Natural
      , expiresOn = None { kind : Text }
      , abilityFilter = None (List Text)
      , delta =
          Some
            { kind = "fixed_dice"
            , dice = 1
            , dieSize = 8
            , sign = "-"
            }
      }

let failedSave : Effect =
      { kind = "composite"
      , mode = None Text
      , on = None (List Text)
      , count = None Natural
      , expiresOn = None { kind : Text }
      , abilityFilter = None (List Text)
      , delta =
          None
            { kind : Text
            , dice : Natural
            , dieSize : Natural
            , sign : Text
            }
      , effects = Some [ strengthD20Disadvantage, damagePenalty ]
      }

let rayOfEnfeeblement =
      { kind = "spell"
      , id = "ray_of_enfeeblement"
      , name = "Ray of Enfeeblement"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-R#Ray of Enfeeblement"
          }
      , description =
          "A beam of enervating energy shoots from you toward a creature within range. The target makes a Constitution saving throw. On a successful save, it has Disadvantage on the next attack roll it makes until the start of your next turn. On a failed save, it has Disadvantage on Strength-based D20 Tests for the duration and subtracts 1d8 from all its damage rolls. The target repeats the save at the end of each of its turns, ending the spell on a success."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "ray_of_enfeeblement_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail = failedSave
                , onSuccess = nextAttackDisadvantage
                , repeatSave =
                    { cadence = "end_of_target_turn"
                    , onSuccess = "ends_on_target"
                    }
                }
              ]
          }
      }

in  rayOfEnfeeblement
