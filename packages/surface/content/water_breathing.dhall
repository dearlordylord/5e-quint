-- Water Breathing — SRD 5.2.1 spell.
--
-- RAW (Spells/Descriptions-S-Z#WaterBreathing):
--   "This spell grants up to ten willing creatures of your choice within
--    range the ability to breathe underwater until the spell ends.
--    Affected creatures also retain their normal mode of respiration."

let waterBreathing =
      { kind = "spell"
      , id = "water_breathing"
      , name = "Water Breathing"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Water Breathing"
          }
      , description =
          "This spell grants up to ten willing creatures of your choice within range the ability to breathe underwater until the spell ends. Affected creatures also retain their normal mode of respiration."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "transmutation"
          , castingTime = { kind = "action", ritual = True }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True
              , s = True
              , m = Some "a short reed"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 24 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "water_breathing_targets"
                    , label = "targets"
                    , value =
                        { kind = "target"
                        , selection = { mode = "choose_up_to", count = 10 }
                        }
                    }
                , effects = [ { kind = "water_breathing" } ]
                }
              ]
          }
      }

in  waterBreathing
