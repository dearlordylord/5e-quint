let hat =
      { kind = "magic_item"
      , id = "magic_item_hat_of_disguise"
      , name = "Hat of Disguise"
      , rarity = "uncommon"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Magic-Items/Items-A-H.md#Hat of Disguise"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "disguise_self"
                , mode = "at_will"
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  hat
