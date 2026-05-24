-- Alert - SRD 5.2.1 Origin feat.
--
-- Two named benefits:
--   1. Initiative Proficiency - add Proficiency Bonus to Initiative rolls.
--      Encoded as passive modify_roll_numeric with proficiency_bonus delta.
--   2. Initiative Swap - swap your initiative with a willing ally immediately
--      after rolling, unless either creature has the Incapacitated condition.

let alert =
      { kind = "feat"
      , id = "alert"
      , name = "Alert"
      , category = "origin"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Feats.md:23-31"
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
              , { kind = "initiative_swap"
                , timing = "immediately_after_initiative_roll"
                , ally = "willing_ally_same_combat"
                , prohibitedByCondition = "incapacitated"
                }
              ]
          }
      }

in  alert
