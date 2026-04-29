let tome =
      { kind = "magic_item"
      , id = "magic_item_tome_of_leadership_and_influence"
      , name = "Tome of Leadership and Influence"
      , rarity = "very_rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Tome of Leadership and Influence"
          }
      , description =
          "This book contains guidelines for influencing and charming others, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book's contents and practicing its guidelines, your Charisma increases by 2, to a maximum of 30. The manual then loses its magic but regains it in a century."
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
