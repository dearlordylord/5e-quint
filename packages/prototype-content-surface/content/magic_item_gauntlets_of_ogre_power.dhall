-- Gauntlets of Ogre Power — SRD 5.2.1 Magic Item (uncommon, requires
-- attunement).
-- Rules: "Your Strength score is 19 while you wear these gauntlets.
-- They have no effect on you if your Strength without them is already
-- 19 or higher."
--
-- Second set_ability_score reference — pairs with magic_item_amulet
-- _of_health (con = 19 floor) to validate the shape across different
-- abilities and rarities.

let gauntlets =
      { kind = "magic_item"
      , id = "magic_item_gauntlets_of_ogre_power"
      , name = "Gauntlets of Ogre Power"
      , rarity = "uncommon"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#GauntletsOfOgrePower"
          }
      , description =
          "Your Strength score is 19 while you wear these gauntlets. They have no effect on you if your Strength without them is already 19 or higher."
      , mechanics =
          { family = "passive"
          , condition = { kind = "wearing_item" }
          , grants =
              [ { kind = "set_ability_score"
                , ability = "str"
                , value = +19
                , mode = "floor"
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  gauntlets
