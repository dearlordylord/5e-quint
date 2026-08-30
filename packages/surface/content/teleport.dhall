-- Teleport - SRD 5.2.1 Spell, level 7, Conjuration.
--
-- RAW (Spells/Descriptions-S-Z#Teleport): self, up to eight willing
-- creatures, or one eligible object travel instantly. Destination familiarity
-- and the Teleportation Outcome table remain table-owned.

let teleport =
      { kind = "spell"
      , id = "teleport"
      , name = "Teleport"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Teleport"
          }
      , mechanics =
          { family = "activation"
          , level = 7
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 10 }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  teleport
