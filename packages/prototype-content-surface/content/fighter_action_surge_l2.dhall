-- Action Surge (fighter L2) — SRD 5.2.1, tier-2 encoding.
-- Captures the threshold_tiers use-count cap (1 use L2–L16, 2 uses
-- L17+) plus the shared UsageLimit { once_per_turn }.

let actionSurgeL2 =
      { kind = "class_feature"
      , id = "fighter_action_surge_l2"
      , name = "Action Surge"
      , className = "fighter"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Fighter#Action Surge"
          }
      , description =
          "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action, except the Magic action. Once you use this feature, you can't do so again until you finish a Short or Long Rest. Starting at level 17, you can use it twice before a rest but only once on a turn."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "free" }
          , resource =
              { kind = "use_count"
              , cap =
                  { kind = "threshold_tiers"
                  , axis = "class"
                  , base = 1
                  , tiers = [ { atLevel = 17, value = 2 } ]
                  }
              }
          , resetCadence = { kind = "short_or_long_rest" }
          , usageLimit = { kind = "once_per_turn" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_extra_action"
                      , restriction =
                          { kind = "exclude", actions = [ "magic" ] }
                      }
                    ]
                }
              ]
          }
      }

in  actionSurgeL2
