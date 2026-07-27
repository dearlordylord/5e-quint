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
