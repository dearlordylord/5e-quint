-- Action Surge (fighter L2) — SRD 5.2.1.
-- The level-17 two-use upgrade should be authored as a separate supported slice
-- once the reducer has actor-level resource projection.

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
          "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action, except the Magic action. Once you use this feature, you can't do so again until you finish a Short or Long Rest."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "free" }
          , resource =
              { kind = "use_count"
              , cap =
                  { kind = "fixed", uses = 1 }
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
