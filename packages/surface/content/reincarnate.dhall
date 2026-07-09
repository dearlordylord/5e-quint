-- Reincarnate - SRD 5.2.1 Spell, level 5, Necromancy.

let reincarnate =
      { kind = "spell"
      , id = "reincarnate"
      , name = "Reincarnate"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-R#Reincarnate"
          }
      , description =
          "You touch a dead Humanoid or a piece of one. If the creature has been dead no longer than 10 days, the spell forms a new body and calls the soul to enter it. Roll 1d10 for the body's species, or the GM chooses another playable species. The reincarnated creature makes any choices the species offers and recalls its former life. It retains its original capabilities except it loses previous species traits and gains the new species traits."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "necromancy"
          , castingTime = { kind = "hours", amount = 1, ritual = False }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = "rare oils worth 1,000+ GP, which the spell consumes"
              , materialCostGp = 1000
              , materialConsumed = True
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "reincarnate_target"
                    , label = "dead Humanoid or piece of one"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature" ]
                            , typeFilter = [ "humanoid" ]
                            , stateFilter = [ "dead" ]
                            }
                        }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  reincarnate
