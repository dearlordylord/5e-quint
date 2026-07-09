-- Contagion - SRD 5.2.1 Spell, level 5, Necromancy.

let AbilityChoice : Type =
      { kind : Text, label : Text, options : List Text }

let AbilityFilter : Type =
      { kind : Text
      , holeId : Text
      , label : Optional Text
      , value : AbilityChoice
      }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional { kind : Text, expr : { dice : Natural, dieSize : Natural } }
      , condition : Optional Text
      , mode : Optional Text
      , affects : Optional Text
      , on : Optional (List Text)
      , saveAbilityFilter : Optional AbilityFilter
      }

let damage : Effect =
      { kind = "damage"
      , damageType = Some "necrotic"
      , amount = Some { kind = "fixed", expr = { dice = 11, dieSize = 8 } }
      , condition = None Text
      , mode = None Text
      , affects = None Text
      , on = None (List Text)
      , saveAbilityFilter = None AbilityFilter
      }

let poisoned : Effect =
      { kind = "apply_condition"
      , damageType = None Text
      , amount = None { kind : Text, expr : { dice : Natural, dieSize : Natural } }
      , condition = Some "poisoned"
      , mode = None Text
      , affects = None Text
      , on = None (List Text)
      , saveAbilityFilter = None AbilityFilter
      }

let chosenAbilitySaveDisadvantage : Effect =
      { kind = "modify_roll_advantage"
      , damageType = None Text
      , amount = None { kind : Text, expr : { dice : Natural, dieSize : Natural } }
      , condition = None Text
      , mode = Some "disadvantage"
      , affects = Some "self_roll"
      , on = Some [ "saving_throw" ]
      , saveAbilityFilter =
          Some
            { kind = "hole"
            , holeId = "contagion_chosen_ability"
            , label = Some "chosen ability"
            , value =
                { kind = "choice"
                , label = "chosen ability"
                , options = [ "str", "dex", "con", "int", "wis", "cha" ]
                }
            }
      }

let contagion =
      { kind = "spell"
      , id = "contagion"
      , name = "Contagion"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Contagion"
          }
      , description =
          "Your touch inflicts a magical contagion. The target makes a Constitution saving throw. On a failed save, it takes 11d8 Necrotic damage and has the Poisoned condition. Choose one ability when you cast the spell; while Poisoned, the target has Disadvantage on saving throws with that ability. The target repeats the saving throw at the end of each turn until three successes or failures. Three successes end the spell on the target; three failures make it last for 7 days. Whenever an effect would end the Poisoned condition, the target must succeed on a Constitution saving throw or the Poisoned condition doesn't end."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "timed", value = { unit = "day", amount = 7 } }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "contagion_target"
                    , label = "target creature"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one", targetKinds = [ "creature" ] }
                        }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "composite"
                    , effects = [ damage, poisoned, chosenAbilitySaveDisadvantage ]
                    }
                , onSuccess = { kind = "none" }
                , repeatSaves =
                    [ { cadence = "end_of_target_turn"
                      , onSuccess = "ends_on_target"
                      , successesRequired = 3
                      , failuresRequired = 3
                      , onFailureThreshold = "locks_duration"
                      }
                    ]
                }
              ]
          }
      }

in  contagion
