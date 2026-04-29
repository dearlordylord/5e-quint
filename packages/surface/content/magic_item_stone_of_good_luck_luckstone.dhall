-- Stone of Good Luck (Luckstone) — SRD 5.2.1 magic item.
-- RAW: "While this polished agate is on your person, you gain a +1
-- bonus to ability checks and saving throws."

let luckstone =
      { kind = "magic_item"
      , id = "magic_item_stone_of_good_luck_luckstone"
      , name = "Stone of Good Luck (Luckstone)"
      , rarity = "uncommon"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#StoneOfGoodLuckLuckstone"
          }
      , description =
          "While this polished agate is on your person, you gain a +1 bonus to ability checks and saving throws."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "modify_roll_numeric"
                , delta =
                    { kind = "fixed_dice"
                    , dice = 1
                    , dieSize = 1
                    , sign = "+"
                    }
                , on = [ "ability_check", "initiative", "saving_throw" ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  luckstone
