-- Control Water - SRD 5.2.1 Spell, level 4, Transmutation.
--
-- RAW (Spells/Descriptions-A-D#Control Water): control a Cube up to 100
-- feet on a side for up to 10 minutes, with a later-turn Magic Action menu
-- of Flood, Part Water, Redirect Flow, or Whirlpool. The water-state menu is
-- deferred to the table/spatial owner; this record preserves its boundary.

let controlWater =
      { kind = "spell"
      , id = "control_water"
      , name = "Control Water"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Control Water"
          }
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 300 }
          , components =
              { v = True, s = True, m = "a mixture of water and dust" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "cube", sideFeet = 100 }
                    , origin = { kind = "point_within_range" }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  controlWater
