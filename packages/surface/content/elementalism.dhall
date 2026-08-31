-- Elementalism - SRD 5.2.1 Spell, Transmutation Cantrip.
--
-- RAW (Spells/Descriptions-E-L#Elementalism): choose a harmless air, earth,
-- fire, water, or sculpt-element effect within range. The menu is deferred to
-- the appropriate generic minor-magic effect owner.

let elementalism =
      { kind = "spell"
      , id = "elementalism"
      , name = "Elementalism"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Elementalism"
          }
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "cube", sideFeet = 5 }
                    , origin = { kind = "point_within_range" }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  elementalism
