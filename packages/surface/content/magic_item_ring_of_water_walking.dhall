let ring =
      { kind = "magic_item"
      , id = "magic_item_ring_of_water_walking"
      , name = "Ring of Water Walking"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Magic-Items/Items-Q-Z.md#Ring of Water Walking"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "water_walk"
                , mode = "at_will"
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  ring
