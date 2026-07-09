-- Awaken - SRD 5.2.1 Spell, level 5, Transmutation.

let awaken =
      { kind = "spell"
      , id = "awaken"
      , name = "Awaken"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Awaken"
          }
      , description =
          "After tracing magical pathways within a precious gemstone, you touch a Beast or Plant creature with Intelligence 3 or less or a natural plant that isn't a creature. The target gains Intelligence 10 and the ability to speak one language you know. A natural plant becomes a Plant creature with movement and senses chosen by the GM. The awakened target has the Charmed condition for 30 days or until you or your allies damage it; when the condition ends, it chooses its attitude toward you."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "transmutation"
          , castingTime = { kind = "hours", amount = 8, ritual = False }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = "an agate worth 1,000+ GP, which the spell consumes"
              , materialCostGp = 1000
              , materialConsumed = True
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "awaken_target"
                    , label = "eligible Beast, Plant creature, or natural plant"
                    , value = { kind = "target", selection = { mode = "one" } }
                    }
                , effects =
                    [ { kind = "set_ability_score"
                      , ability = "int"
                      , value = 10
                      , mode = "set"
                      }
                    ]
                }
              ]
          }
      }

in  awaken
