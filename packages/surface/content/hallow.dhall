-- Hallow - SRD 5.2.1 Spell, level 5, Abjuration.

let hallow =
      { kind = "spell"
      , id = "hallow"
      , name = "Hallow"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Hallow"
          }
      , description =
          "You touch a point and infuse an area around it with holy or unholy power. The radius can be up to 60 feet, and the spell fails if the radius includes an area already under Hallow. Choose Aberration, Celestial, Elemental, Fey, Fiend, or Undead creature types for Hallowed Ward; chosen types can't willingly enter, and creatures possessed by or Charmed or Frightened by them aren't possessed, Charmed, or Frightened by them while in the area. You also bind one extra effect: Courage, Darkness, Daylight, Peaceful Rest, Extradimensional Interference, Fear, Resistance, Silence, Tongues, or Vulnerability."
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
