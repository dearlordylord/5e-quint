-- Slow Fall — SRD 5.2.1 Monk level 4.
--
-- RAW (Classes / Monk / Level 4: Slow Fall):
--   When you fall, you can take a Reaction to reduce any damage you take from
--   the fall by an amount equal to five times your Monk level.

let slowFall =
      { id = "monk_slow_fall"
      , kind = "class_feature"
      , name = "Slow Fall"
      , className = "monk"
      , acquiredAtLevel = 4
      , description =
          "When you fall, take a Reaction to reduce any damage you take from the fall by five times your Monk level."
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk#Slow Fall" }
      , mechanics =
          { family = "reaction_roll_or_damage_reduction"
          , modifiers =
              [ { kind = "fall_damage_reduction"
                , trigger = { kind = "creature_falls" }
                , reduction =
                    { kind = "class_level_multiplier", multiplier = 5 }
                }
              ]
          }
      }

in  slowFall
