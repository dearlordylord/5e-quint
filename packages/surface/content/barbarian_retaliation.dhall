let retaliation =
      { kind = "class_feature"
      , id = "barbarian_retaliation"
      , name = "Retaliation"
      , className = "barbarian"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Barbarian.md:186-188" }
      , description =
          "When you take damage from a creature within 5 feet of you, you can take a Reaction to make one melee attack against that creature, using a weapon or an Unarmed Strike. Surface owner need: the current reaction-action projection can model the reaction trigger and one Attack action, but needs a narrower melee weapon-or-Unarmed Strike attack target bound to the damaging creature."
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
