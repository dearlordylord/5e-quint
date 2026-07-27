-- Hallow - SRD 5.2.1 Spell, level 5, Abjuration.

let hallow =
      { kind = "spell"
      , id = "hallow"
      , name = "Hallow"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Hallow"
          }

      , mechanics =
          { family = "activation"
          , level = 5
          , school = "abjuration"
          , castingTime = { kind = "hours", amount = 24, ritual = False }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = "incense worth 1,000+ GP, which the spell consumes"
              , materialCostGp = 1000
              , materialConsumed = True
              }
          , duration = { kind = "permanent", endsOn = [ "dispel" ] }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "sphere", radiusFeet = 60 }
                    , origin = { kind = "point_within_range" }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  hallow
