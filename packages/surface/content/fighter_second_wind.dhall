-- Second Wind — SRD 5.2.1 Fighter level 1.
-- Bonus Action: regain 1d10 + Fighter level HP.
-- Uses: 2@L1 → 3@L4 → 4@L10 (per Fighter Features table).
-- Reset: 1 use on Short Rest, all on Long Rest.

let secondWind =
      { kind = "class_feature"
      , id = "fighter_second_wind"
      , name = "Second Wind"
      , className = "fighter"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Fighter#Second Wind"
          }

      , mechanics =
          { family = "activation"
          , activationCost = { kind = "bonus_action" }
          , resource =
              { kind = "use_count"
              , cap =
                  { kind = "threshold_tiers"
                  , axis = "class"
                  , base = 2
                  , tiers =
                      [ { atLevel = 4, value = 3 }
                      , { atLevel = 10, value = 4 }
                      ]
                  }
              }
          , resetCadence =
              { kind = "partial_short_full_long"
              , shortRestRefill = 1
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "heal_hp"
                      , target = "self"
                      , amount =
                          { kind = "linear_per_level"
                          , axis = "class"
                          , base = { dice = 1, dieSize = 10, flat = 1 }
                          , perLevel = { flat = 1 }
                          , startingAtLevel = 1
                          }
                      }
                    ]
                }
              ]
          }
      }

in  secondWind
