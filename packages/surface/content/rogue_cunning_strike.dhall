-- Cunning Strike -- SRD 5.2.1 Rogue level 5.
--
-- RAW (Classes / Rogue / Level 5: Cunning Strike):
--   When Sneak Attack damage is dealt, forgo one Sneak Attack die before
--   rolling damage to add one Cunning Strike effect. The available level-5
--   effects are Poison, Trip, and Withdraw.

let CunningStrikeOption : Type =
      { id : Text
      , cost : { kind : Text, dice : Natural, dieSize : Natural }
      , requires :
          Optional
            { kind : Text, equipment : { kind : Text, toolId : Text } }
      , save : Optional { ability : Text }
      , onFail :
          Optional
            { kind : Text
            , condition : Text
            , duration : Optional { amount : Natural, unit : Text }
            , repeatSave : Optional { cadence : Text, onSuccess : Text }
            }
      , target : Optional { maxSize : Text }
      , movement :
          Optional
            { timing : Text
            , distance : { kind : Text }
            , opportunityAttacks : Text
            }
      }

let cunningStrike =
      { kind = "class_feature"
      , id = "rogue_cunning_strike"
      , name = "Cunning Strike"
      , className = "rogue"
      , acquiredAtLevel = 5
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Rogue.md:95-150"
          }
      , description =
          "You've developed cunning ways to use your Sneak Attack. When you deal Sneak Attack damage, you can add one of the following Cunning Strike effects. Each effect has a die cost, which is the number of Sneak Attack damage dice you must forgo to add the effect. You remove the die before rolling, and the effect occurs immediately after the attack's damage is dealt."
      , mechanics =
          { family = "cunning_strike"
          , trigger =
              { kind = "deal_sneak_attack_damage"
              , sourceUnitId = "rogue_sneak_attack"
              }
          , choice = { kind = "choose_one", maxOptions = 1 }
          , effectSaveDc =
              { kind = "class_feature_ability_save_dc"
              , base = 8
              , ability = "dex"
              }
          , options =
              [ { id = "poison"
                , cost =
                    { kind = "sneak_attack_damage_dice"
                    , dice = 1
                    , dieSize = 6
                    }
                , requires =
                    Some
                      { kind = "equipment_on_person"
                      , equipment =
                          { kind = "tool", toolId = "poisoners_kit" }
                      }
                , save = Some { ability = "con" }
                , onFail =
                    Some
                      { kind = "apply_condition"
                      , condition = "poisoned"
                      , duration = Some { amount = 1, unit = "minute" }
                      , repeatSave =
                          Some
                            { cadence = "end_of_target_turn"
                            , onSuccess = "end_condition"
                            }
                      }
                , target = None { maxSize : Text }
                , movement =
                    None
                      { timing : Text
                      , distance : { kind : Text }
                      , opportunityAttacks : Text
                      }
                }
              , { id = "trip"
                , cost =
                    { kind = "sneak_attack_damage_dice"
                    , dice = 1
                    , dieSize = 6
                    }
                , requires =
                    None
                      { kind : Text
                      , equipment : { kind : Text, toolId : Text }
                      }
                , save = Some { ability = "dex" }
                , onFail =
                    Some
                      { kind = "apply_condition"
                      , condition = "prone"
                      , duration = None { amount : Natural, unit : Text }
                      , repeatSave =
                          None { cadence : Text, onSuccess : Text }
                      }
                , target = Some { maxSize = "large" }
                , movement =
                    None
                      { timing : Text
                      , distance : { kind : Text }
                      , opportunityAttacks : Text
                      }
                }
              , { id = "withdraw"
                , cost =
                    { kind = "sneak_attack_damage_dice"
                    , dice = 1
                    , dieSize = 6
                    }
                , requires =
                    None
                      { kind : Text
                      , equipment : { kind : Text, toolId : Text }
                      }
                , save = None { ability : Text }
                , onFail =
                    None
                      { kind : Text
                      , condition : Text
                      , duration :
                          Optional { amount : Natural, unit : Text }
                      , repeatSave :
                          Optional { cadence : Text, onSuccess : Text }
                      }
                , target = None { maxSize : Text }
                , movement =
                    Some
                      { timing = "immediately_after_attack"
                      , distance = { kind = "half_speed" }
                      , opportunityAttacks = "does_not_provoke"
                      }
                }
              ] : List CunningStrikeOption
          }
      }

in  cunningStrike
