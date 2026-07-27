-- Raise Dead - SRD 5.2.1 Spell, level 5, Necromancy.

let raiseDead =
      { kind = "spell"
      , id = "raise_dead"
      , name = "Raise Dead"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-R#Raise Dead"
          }
      , description =
          "With a touch, you revive a dead creature if it has been dead no longer than 10 days and wasn't Undead when it died. The creature returns to life with 1 Hit Point. The spell neutralizes poisons that affected it at death. The spell closes mortal wounds but doesn't restore missing body parts; if the creature lacks body parts or organs integral for survival, the spell fails. The target takes a -4 penalty to D20 Tests; every time it finishes a Long Rest, the penalty is reduced by 1 until it becomes 0."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "necromancy"
          , castingTime = { kind = "hours", amount = 1, ritual = False }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = "a diamond worth 500+ GP, which the spell consumes"
              , materialCostGp = 500
              , materialConsumed = True
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "raise_dead_target"
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
                , effects =
                    [ { kind = "revive_dead_creature"
                      , deathWindow = { unit = "day", amount = 10 }
                      , hitPoints = 1
                      , spiritConsent = "can_refuse"
                      , excludedDeathCauses = [ "old_age" ]
                      , missingBodyParts = "not_restored"
                      , returningOngoingEffects =
                          { conditions = "preserve_if_duration_ongoing"
                          , magicalContagions =
                              "preserve_if_duration_ongoing"
                          , curses = "preserve_if_duration_ongoing"
                          , exhaustion = { kind = "reduce_by", amount = 1 }
                          , attunement = "ends"
                          }
                      }
                    ]
                }
              ]
          }
      }

in  raiseDead
