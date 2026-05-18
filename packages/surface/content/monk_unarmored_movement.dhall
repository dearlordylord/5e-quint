-- Unarmored Movement - SRD 5.2.1 Monk level 2.
--
-- RAW (Classes / Monk / Level 2: Unarmored Movement):
--   "Your speed increases by 10 feet while you aren't wearing armor or
--    wielding a Shield. This bonus increases when you reach certain Monk
--    levels, as shown on the Monk Features table."
--
-- This level 1-2 record owns the level-2 +10 ft. Speed projection. Later
-- Monk levels own the higher table values.

let unarmoredMovement =
      { acquiredAtLevel = 2
      , className = "monk"
      , description =
          "Your Speed increases by 10 feet while you aren't wearing armor or wielding a Shield."
      , id = "monk_unarmored_movement"
      , kind = "class_feature"
      , mechanics =
          { condition =
              { kind = "all_of"
              , predicates =
                  [ { kind = "not_wearing_armor"
                    , categories = [ "light", "medium", "heavy" ]
                    }
                  , { kind = "not_wielding_shield" }
                  ]
              }
          , family = "passive"
          , grants =
              [ { kind = "modify_speed"
                , delta = 10
                , unit = "feet"
                }
              ]
          }
      , name = "Unarmored Movement"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk.md:30-33,92-94" }
      }

in  unarmoredMovement
