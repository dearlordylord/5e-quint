let bardicInspiration =
      { kind = "class_feature"
      , id = "bard_bardic_inspiration"
      , name = "Bardic Inspiration"
      , className = "bard"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Bard#Bardic Inspiration"
          }
      , description =
          "As a Bonus Action, inspire another creature within 60 feet who can see or hear you. The creature gains one Bardic Inspiration die for the next hour."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "bonus_action" }
          , range = { kind = "point", feet = 60 }
          , resource =
              { kind = "use_count"
              , cap = { kind = "ability_modifier", ability = "cha", minimum = 1 }
              }
          , resetCadence = { kind = "long_rest" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "target", selection = { mode = "one" } }
                , effects =
                    [ { kind = "grant_die_token"
                      , die =
                          { kind = "threshold_tiers"
                          , axis = "class"
                          , base = { dice = 1, dieSize = 6 }
                          , tiers =
                              [ { atLevel = 5, override = { dieSize = 8 } }
                              , { atLevel = 10, override = { dieSize = 10 } }
                              , { atLevel = 15, override = { dieSize = 12 } }
                              ]
                          }
                      , duration = { unit = "hour", amount = 1 }
                      , maxHeld = 1
                      , trigger = "failed_d20_test"
                      }
                    ]
                }
              ]
          }
      }

in  bardicInspiration
