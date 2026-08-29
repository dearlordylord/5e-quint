-- Confusion - SRD 5.2.1 Spell, level 4, Enchantment.
--
-- RAW (Spells/Descriptions-A-D#Confusion): a 10-foot-radius Sphere uses a
-- Wisdom save, then applies the authored behavior table for up to 1 minute.
-- The behavior table and repeat-save lifecycle remain outside this partial
-- definition; the typed header and cast boundary are preserved here.

let confusion =
      { kind = "spell"
      , id = "confusion"
      , name = "Confusion"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Confusion"
          }
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 90 }
          , components = { v = True, s = True, m = "three nut shells" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "sphere", radiusFeet = 10 }
                    , origin = { kind = "point_within_range" }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  confusion
