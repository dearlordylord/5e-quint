-- Greater Restoration - SRD 5.2.1 Spell, level 5, Abjuration.

let greaterRestoration =
      { kind = "spell"
      , id = "greater_restoration"
      , name = "Greater Restoration"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Greater Restoration"
          }
      , description =
          "You touch a creature and magically remove one of these effects from it: 1 Exhaustion level, the Charmed or Petrified condition, a curse including the target's Attunement to a cursed magic item, any reduction to one of the target's ability scores, or any reduction to the target's Hit Point maximum."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = "diamond dust worth 100+ GP, which the spell consumes"
              , materialCostGp = 100
              , materialConsumed = True
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "greater_restoration_target"
                    , label = "target creature"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one", targetKinds = [ "creature" ] }
                        }
                    }
                , effects =
                    [ { kind = "remove_condition"
                      , condition = { kind = "choose", from = [ "charmed", "petrified" ] }
                      }
                    ]
                }
              ]
          }
      }

in  greaterRestoration
