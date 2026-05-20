-- Monk's Focus - SRD 5.2.1 Monk level 2.
--
-- Focus Points: equal to Monk level starting at level 2.
-- Reset: regain all expended Focus Points on Short or Long Rest.
-- Save DC: 8 + Wisdom modifier + Proficiency Bonus.
-- Initial Focus Point features: Flurry of Blows, Patient Defense,
-- and Step of the Wind.

let jumpDistanceMultiplierType = { multiplier : Natural, expires : Text }

let battleExecutionType =
      { kind : Text
      , focusPointCost : Natural
      , strikeCount : Optional Natural
      , freeAction : Optional Text
      , focusActions : Optional (List Text)
      , jumpDistanceMultiplier : Optional jumpDistanceMultiplierType
      }

let focusOption =
      { id : Text, displayName : Text, battleExecution : battleExecutionType }

let monksFocus =
      { acquiredAtLevel = 2
      , className = "monk"
      , description =
          "SRD Monk level 2 Focus Point resource container. A Monk's Focus Points equal Monk level, return after a Short or Long Rest, and can fuel Flurry of Blows, Patient Defense, and Step of the Wind."
      , id = "monk_monks_focus"
      , kind = "class_feature"
      , mechanics =
          { family = "resource_container"
          , resource =
              { kind = "use_count"
              , cap =
                  { kind = "linear_per_level"
                  , axis = "class"
                  , base = 2
                  , perLevel = 1
                  , startingAtLevel = 2
                  }
              }
          , resetCadence = { kind = "short_or_long_rest" }
          , effectSaveDc =
              { kind = "class_feature_ability_save_dc"
              , base = 8
              , ability = "wis"
              }
          , optionSet =
              { choiceKey = "monk_focus_point_feature"
              , timing = "resource_use"
              , initialOptions =
                  [ { id = "monk_flurry_of_blows"
                    , displayName = "Flurry of Blows"
                    , battleExecution =
                        { kind = "bonus_action_unarmed_strike_sequence"
                        , focusPointCost = 1
                        , strikeCount = Some 2
                        , freeAction = None Text
                        , focusActions = None (List Text)
                        , jumpDistanceMultiplier =
                            None jumpDistanceMultiplierType
                        }
                    }
                  , { id = "monk_patient_defense"
                    , displayName = "Patient Defense"
                    , battleExecution =
                        { kind = "bonus_action_defensive_modes"
                        , focusPointCost = 1
                        , strikeCount = None Natural
                        , freeAction = Some "disengage"
                        , focusActions = Some [ "disengage", "dodge" ]
                        , jumpDistanceMultiplier =
                            None jumpDistanceMultiplierType
                        }
                    }
                  , { id = "monk_step_of_the_wind"
                    , displayName = "Step of the Wind"
                    , battleExecution =
                        { kind = "bonus_action_mobility_modes"
                        , focusPointCost = 1
                        , strikeCount = None Natural
                        , freeAction = Some "dash"
                        , focusActions = Some [ "disengage", "dash" ]
                        , jumpDistanceMultiplier =
                            Some { multiplier = 2, expires = "end_of_turn" }
                        }
                    }
                  ] : List focusOption
              }
          }
      , name = "Monk's Focus"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk.md:30-33,76-90" }
      }

in  monksFocus
