-- Alert — SRD 5.2.1 Origin feat (2024 PHB version).
--
-- Two named benefits:
--   1. Initiative Proficiency — add Proficiency Bonus to Initiative rolls.
--      Encoded as passive modify_roll_numeric with proficiency_bonus delta.
--   2. Initiative Swap — swap your initiative with a willing ally immediately
--      after rolling. No v4 atom covers initiative-value exchange between
--      creatures. Omitted — recorded in proposal-feat_alert.md.

let alert =
      { kind = "feat"
      , id = "alert"
      , name = "Alert"
      , category = "origin"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Feats/Origin#Alert"
          }
      , description =
          "Initiative Proficiency: When you roll Initiative, you can add your Proficiency Bonus to the roll. Initiative Swap: Immediately after you roll Initiative, you can swap your Initiative with the Initiative of one willing ally in the same combat. You can't make this swap if you or the ally has the Incapacitated condition."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "modify_roll_numeric"
                , on = [ "initiative" ]
                , delta =
                    { kind = "proficiency_bonus"
                    , sign = "+"
                    }
                }
              ]
          }
      }

in  alert
