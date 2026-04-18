let hat =
      { kind = "magic_item"
      , id = "magic_item_hat_of_disguise"
      , name = "Hat of Disguise"
      , rarity = "uncommon"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#HatOfDisguise"
          }
      , description =
          "While wearing this hat, you can cast the Disguise Self spell. The spell ends if the hat is removed."
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
