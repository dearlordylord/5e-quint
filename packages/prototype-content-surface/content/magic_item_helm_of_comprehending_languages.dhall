let helm =
      { kind = "magic_item"
      , id = "magic_item_helm_of_comprehending_languages"
      , name = "Helm of Comprehending Languages"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#HelmOfComprehendingLanguages"
          }
      , description =
          "While wearing this helm, you can cast Comprehend Languages from it."
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
