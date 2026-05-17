-- Jack of All Trades - SRD 5.2.1 Bard level 2.
--
-- RAW: "You can add half your Proficiency Bonus (round down) to any
--       ability check you make that uses a skill proficiency you lack
--       and that doesn't otherwise use your Proficiency Bonus."
--
-- Reference encoding for DiceDelta source variants:
--   • modify_roll_numeric.delta uses the proficiency_bonus source
--     (scale = "half") instead of a literal fixed_dice delta.
--
-- The "uses a skill proficiency you lack" and "doesn't otherwise use
-- your Proficiency Bonus" clauses are predicates over an Ability Check
-- and the character's existing proficiency facts. The generic
-- modify_roll_numeric atom below is retained as authored pressure only;
-- it is not a supported Unit profile until the owning Ability Check
-- proficiency projection can execute those gates.

let jackOfAllTrades =
      { kind = "class_feature"
      , id = "bard_jack_of_all_trades"
      , name = "Jack of All Trades"
      , className = "bard"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Bard#Jack of All Trades"
          }
      , description =
          "You can add half your Proficiency Bonus (round down) to any ability check you make that uses a skill proficiency you lack and that doesn't otherwise use your Proficiency Bonus."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "modify_roll_numeric"
                , on = [ "ability_check" ]
                , delta =
                    { kind = "proficiency_bonus"
                    , sign = "+"
                    , scale = Some "half"
                    }
                }
              ]
          }
      }

in  jackOfAllTrades
