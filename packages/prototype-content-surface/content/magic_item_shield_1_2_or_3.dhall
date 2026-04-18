let shield =
      { kind = "magic_item"
      , id = "magic_item_shield_1_2_or_3"
      , name = "Shield, +1, +2, or +3"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Shield+1+2or+3"
          }
      , description =
          "While holding this Shield, you have a bonus to Armor Class determined by the Shield's rarity, in addition to the Shield's normal bonus to AC."
      , defaultAttunement = { requiresAttunement = False }
      , variants =
          [ { id = "magic_item_shield_plus_1"
            , name = "Shield, +1"
            , rarity = "uncommon"
            , mechanics =
                { family = "passive"
                , condition = { kind = "holding_item" }
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
          , { id = "magic_item_shield_plus_2"
            , name = "Shield, +2"
            , rarity = "rare"
            , mechanics =
                { family = "passive"
                , condition = { kind = "holding_item" }
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
          , { id = "magic_item_shield_plus_3"
            , name = "Shield, +3"
            , rarity = "very_rare"
            , mechanics =
                { family = "passive"
                , condition = { kind = "holding_item" }
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

in  shield
