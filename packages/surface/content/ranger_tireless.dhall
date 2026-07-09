let rangerTireless =
      { kind = "class_feature"
      , id = "ranger_tireless"
      , name = "Tireless"
      , className = "ranger"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Ranger#Tireless"
          }
      , description =
          "Primal forces now help fuel you on your journeys. Temporary Hit Points: As a Magic action, you can give yourself a number of Temporary Hit Points equal to 1d8 plus your Wisdom modifier (minimum of 1). You can use this action a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest. Decrease Exhaustion: Whenever you finish a Short Rest, your Exhaustion level, if any, decreases by 1. Surface owner need: the Temporary Hit Points activation is modeled except for the rolled-total minimum floor; rest/session state must add a Short Rest trigger that decreases leveled Exhaustion by 1 without treating Exhaustion as a binary condition."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "ability_modifier", ability = "wis", minimum = 1 }
              }
          , resetCadence = { kind = "long_rest" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_temp_hp"
                      , amount =
                          { kind = "fixed"
                          , expr =
                              { dice = 1
                              , dieSize = 8
                              , abilityModifier = "wis"
                              }
                          }
                      }
                    ]
                }
              ]
          }
      }

in  rangerTireless
