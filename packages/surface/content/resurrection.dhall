-- Resurrection - SRD 5.2.1 Spell, level 7, Necromancy.
--
-- RAW (Spells/Descriptions-Q-R#Resurrection): a dead non-Undead creature
-- dead no more than a century returns with all Hit Points. The death-history,
-- ordeal, and body restoration boundary remain deferred.

let resurrection =
      { kind = "spell"
      , id = "resurrection"
      , name = "Resurrection"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-R#Resurrection"
          }
      , mechanics =
          { family = "activation"
          , level = 7
          , school = "necromancy"
          , castingTime = { kind = "hours", amount = 1, ritual = False }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = "a diamond worth 1,000+ GP, which the spell consumes"
              , materialCostGp = 1000
              , materialConsumed = True
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "resurrection_target"
                    , label = "dead creature"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature" ]
                            , stateFilter = [ "dead" ]
                            }
                        }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  resurrection
