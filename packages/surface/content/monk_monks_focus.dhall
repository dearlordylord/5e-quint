-- Monk's Focus - SRD 5.2.1 Monk level 2.
--
-- Focus Points: equal to Monk level starting at level 2.
-- Reset: regain all expended Focus Points on Short or Long Rest.
-- Save DC: 8 + Wisdom modifier + Proficiency Bonus.
-- Initial Focus Point features: Flurry of Blows, Patient Defense,
-- and Step of the Wind.
--
-- This record owns the Focus Point pool and names the initial resource-use
-- option set. Option execution remains a separate battle/runtime owner.

let focusOption = { id : Text, displayName : Text }

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
                    }
                  , { id = "monk_patient_defense"
                    , displayName = "Patient Defense"
                    }
                  , { id = "monk_step_of_the_wind"
                    , displayName = "Step of the Wind"
                    }
                  ] : List focusOption
              }
          }
      , name = "Monk's Focus"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk.md:30-33,76-90" }
      }

in  monksFocus
