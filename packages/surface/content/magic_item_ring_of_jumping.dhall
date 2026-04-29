let ring =
      { kind = "magic_item"
      , id = "magic_item_ring_of_jumping"
      , name = "Ring of Jumping"
      , rarity = "uncommon"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#RingOfJumping"
          }
      , description =
          "While wearing this ring, you can cast Jump from it, but can target only yourself when you do so."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "jump"
                , mode = "at_will"
                , targetRestriction = Some { kind = "self_only" }
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  ring
