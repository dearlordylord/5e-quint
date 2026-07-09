-- Indomitable — SRD 5.2.1 Fighter level 9.
--
-- RAW (Classes / Fighter / Level 9: Indomitable):
--   If you fail a saving throw, reroll it with a bonus equal to your
--   Fighter level. You must use the new roll. Uses reset on Long Rest
--   and scale at Fighter levels 13 and 17.

let indomitable =
      { kind = "class_feature"
      , id = "fighter_indomitable"
      , name = "Indomitable"
      , className = "fighter"
      , acquiredAtLevel = 9
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Fighter.md:102-106" }
      , description =
          "If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level. You must use the new roll. You can't use this feature again until you finish a Long Rest; the uses increase at Fighter levels 13 and 17."
      , mechanics =
          { family = "failed_saving_throw_reroll"
          , trigger = { kind = "failed_saving_throw" }
          , reroll =
              { mustUseNewRoll = True
              , bonus = { kind = "class_level", className = "fighter" }
              }
          , resource =
              { kind = "use_count"
              , cap =
                  { kind = "threshold_tiers"
                  , axis = "class"
                  , base = 1
                  , tiers =
                    [ { atLevel = 13, value = 2 }
                    , { atLevel = 17, value = 3 }
                    ]
                  }
              }
          , resetCadence = { kind = "long_rest" }
          }
      }

in  indomitable
