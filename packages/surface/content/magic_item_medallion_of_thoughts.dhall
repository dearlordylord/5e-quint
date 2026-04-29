let medallionOfThoughts =
      { kind = "magic_item"
      , id = "magic_item_medallion_of_thoughts"
      , name = "Medallion of Thoughts"
      , rarity = "uncommon"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Medallion of Thoughts"
          }
      , description =
          "The medallion has 5 charges. While wearing it, you can expend 1 charge to cast Detect Thoughts (save DC 13) from it. The medallion regains 1d4 expended charges daily at dawn."
      , mechanics =
          { family = "activation"
          , condition = { kind = "wearing_item" }
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "charge_pool"
              , cap = { kind = "fixed", uses = 5 }
              }
          , resetCadence =
              { kind = "dawn"
              , regain =
                  { kind = "fixed"
                  , expr = { dice = 1, dieSize = 4 }
                  }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_spell_access"
                      , spellId = "detect_thoughts"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 1
                          , perLevelCharges = 0
                          , minLevel = 2
                          , maxLevel = 2
                          }
                      , dcOverride = { kind = "fixed", dc = 13 }
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  medallionOfThoughts
