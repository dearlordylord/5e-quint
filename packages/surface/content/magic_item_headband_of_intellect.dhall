-- Headband of Intellect — SRD 5.2.1 Magic Item (uncommon, requires
-- attunement).
-- Rules: "Your Intelligence is 19 while you wear this headband. It has
-- no effect on you if your Intelligence is 19 or higher without it."
--
-- This is the same passive floor-to-19 pattern as Amulet of Health and
-- Gauntlets of Ogre Power, on Intelligence instead of Constitution or
-- Strength.

let headband =
      { kind = "magic_item"
      , id = "magic_item_headband_of_intellect"
      , name = "Headband of Intellect"
      , rarity = "uncommon"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#HeadbandOfIntellect"
          }
      , description =
          "Your Intelligence is 19 while you wear this headband. It has no effect on you if your Intelligence is 19 or higher without it."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "set_ability_score"
                , ability = "int"
                , value = +19
                , mode = "floor"
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  headband
