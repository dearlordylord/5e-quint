-- Action Surge — SRD 5.2.1 Fighter level 2.
-- Encodes the threshold_tiers use-count cap (1 use L2-L16, 2 uses L17+).
-- NOTE: The "only once on a turn" restriction at L17 is not expressible in
-- ClassFeatureActivationMechanics — ClassFeatureActivationMechanics lacks a
-- usageLimit / perTurnLimit field (only MasteryMechanics has one). That
-- secondary constraint is flagged as a surface_widening in the result.

let actionSurge =
      { kind = "class_feature"
      , id = "fighter_action_surge"
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
          , effect =
              { kind = "grant_extra_action"
              , restriction =
                  { kind = "exclude", actions = [ "magic" ] }
              }
          }
      }

in  actionSurge
