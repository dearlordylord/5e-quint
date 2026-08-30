-- Druidcraft - SRD 5.2.1 Spell, Transmutation Cantrip.
--
-- RAW (Spells/Descriptions-A-D#Druidcraft): a choice of harmless weather,
-- bloom, sensory, or fire-play effects within range. The menu is retained in
-- the source note while the typed effect owner remains deferred.

let druidcraft =
      { kind = "spell"
      , id = "druidcraft"
      , name = "Druidcraft"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Druidcraft"
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

in  druidcraft
