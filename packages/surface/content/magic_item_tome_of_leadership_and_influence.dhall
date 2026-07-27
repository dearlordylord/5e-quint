let tome =
      { kind = "magic_item"
      , id = "magic_item_tome_of_leadership_and_influence"
      , name = "Tome of Leadership and Influence"
      , rarity = "very_rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Magic-Items/Items-Q-Z.md#Tome of Leadership and Influence"
          }

      , mechanics =
          { family = "activation"
          , activationCost = { kind = "study", hours = 48, withinDays = 6 }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "century" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "modify_ability_score"
                      , ability = "cha"
                      , delta = 2
                      , maximum = 30
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  tome
