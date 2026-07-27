let retaliation =
      { kind = "class_feature"
      , id = "barbarian_retaliation"
      , name = "Retaliation"
      , className = "barbarian"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Barbarian.md:186-188" }

      , mechanics =
          { family = "activation"
          , activationCost =
              { kind = "reaction"
              , trigger =
                  { kind = "takes_damage_from_creature", rangeFeet = 5 }
              }
          , resource = { kind = "use_count", cap = { kind = "unlimited" } }
          , resetCadence = { kind = "long_rest" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_extra_action"
                      , restriction =
                          { kind = "allow_only"
                          , actions =
                              [ { action = "attack"
                                , attackLimit =
                                    { kind = "attack_count", count = 1 }
                                }
                              ]
                          }
                      }
                    ]
                }
              ]
          }
      }

in  retaliation
