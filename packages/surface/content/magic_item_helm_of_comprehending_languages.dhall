let helm =
      { kind = "magic_item"
      , id = "magic_item_helm_of_comprehending_languages"
      , name = "Helm of Comprehending Languages"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Magic-Items/Items-A-H.md#Helm of Comprehending Languages"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "comprehend_languages"
                , mode = "at_will"
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  helm
