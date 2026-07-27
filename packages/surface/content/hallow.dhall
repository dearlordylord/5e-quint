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
          "You touch a point and infuse an area around it with holy or unholy power. The radius can be up to 60 feet, and the spell fails if the radius includes an area already under Hallow. Choose any of these creature types: Aberration, Celestial, Elemental, Fey, Fiend, or Undead. Chosen types can't willingly enter, and any creature possessed by or Charmed or Frightened by them isn't possessed, Charmed, or Frightened by them while in the area. You bind one extra effect: Courage; Darkness; Daylight; Peaceful Rest; Extradimensional Interference; Fear; Resistance; Silence; Tongues; Vulnerability."
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
