-- Armor, +1, +2, or +3 — SRD 5.2.1 magic item.

let armor =
      { kind = "magic_item"
      , id = "magic_item_armor_1_2_or_3"
      , name = "Armor, +1, +2, or +3"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Armor+1+2or+3"
          }
      , description =
          "While wearing this armor, you have a bonus to Armor Class determined by the armor's rarity."
      , defaultAttunement = { requiresAttunement = False }
      , variants =
          [ { id = "magic_item_armor_plus_1"
            , name = "Armor, +1"
            , rarity = "rare"
            , mechanics =
                { family = "passive"
                , condition = { kind = "wearing_item" }
                , grants =
                    [ { kind = "modify_ac"
                      , delta =
                          { kind = "fixed_dice"
                          , dice = 1
                          , dieSize = 1
                          , sign = "+"
                          }
                      }
                    ]
                }
            , destruction = { kind = "none" }
            }
          , { id = "magic_item_armor_plus_2"
            , name = "Armor, +2"
            , rarity = "very_rare"
            , mechanics =
                { family = "passive"
                , condition = { kind = "wearing_item" }
                , grants =
                    [ { kind = "modify_ac"
                      , delta =
                          { kind = "fixed_dice"
                          , dice = 2
                          , dieSize = 1
                          , sign = "+"
                          }
                      }
                    ]
                }
            , destruction = { kind = "none" }
            }
          , { id = "magic_item_armor_plus_3"
            , name = "Armor, +3"
            , rarity = "legendary"
            , mechanics =
                { family = "passive"
                , condition = { kind = "wearing_item" }
                , grants =
                    [ { kind = "modify_ac"
                      , delta =
                          { kind = "fixed_dice"
                          , dice = 3
                          , dieSize = 1
                          , sign = "+"
                          }
                      }
                    ]
                }
            , destruction = { kind = "none" }
            }
          ]
      }

in  armor
