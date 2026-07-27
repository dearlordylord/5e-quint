-- Alert - SRD 5.2.1 Origin feat.
--
-- Two named benefits:
--   1. Initiative Proficiency - add Proficiency Bonus to Initiative rolls.
--      Encoded as passive modify_roll_numeric with proficiency_bonus delta.
--   2. Initiative Swap - swap your initiative with a willing ally immediately
--      after rolling, unless either creature has the Incapacitated condition.

let Grant =
      { kind : Text
      , on : Optional (List Text)
      , delta : Optional { kind : Text, sign : Text }
      , timing : Optional Text
      , ally : Optional Text
      , prohibitedByCondition : Optional Text
      }

let defaultGrant : Grant =
      { kind = ""
      , on = None (List Text)
      , delta = None { kind : Text, sign : Text }
      , timing = None Text
      , ally = None Text
      , prohibitedByCondition = None Text
      }

let alert =
      { kind = "feat"
      , id = "alert"
      , name = "Alert"
      , category = "origin"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Feats.md:23-31"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ defaultGrant // { kind = "modify_roll_numeric"
                , on = Some [ "initiative" ]
                , delta =
                    Some
                      { kind = "proficiency_bonus"
                      , sign = "+"
                      }
                }
              , defaultGrant // { kind = "initiative_swap"
                , timing = Some "immediately_after_initiative_roll"
                , ally = Some "willing_ally_same_combat"
                , prohibitedByCondition = Some "incapacitated"
                }
              ]
          }
      }

in  alert
