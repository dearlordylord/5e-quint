-- Bracers of Defense — SRD 5.2.1 magic item.

let SimplePredicate = { kind : Text }

let bracers =
      { kind = "magic_item"
      , id = "magic_item_bracers_of_defense"
      , name = "Bracers of Defense"
      , rarity = "rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#BracersOfDefense"
          }
      , description =
          "While wearing these bracers, you gain a +2 bonus to Armor Class if you are wearing no armor and using no Shield."
      , mechanics =
          { family = "passive"
          , condition =
              { kind = "all_of"
              , predicates =
                  [ { kind = "wearing_item" }
                  , { kind = "unarmored" }
                  , { kind = "not_wielding_shield" }
                  ] : List SimplePredicate
              }
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

in  bracers
