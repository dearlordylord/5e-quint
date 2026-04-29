let ringOfTelekinesis =
      { kind = "magic_item"
      , id = "ring_of_telekinesis"
      , name = "Ring of Telekinesis"
      , rarity = "very_rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Ring of Telekinesis"
          }
      , description =
          "While wearing this ring, you can cast Telekinesis from it."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "telekinesis"
                , mode = "at_will"
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  ringOfTelekinesis
