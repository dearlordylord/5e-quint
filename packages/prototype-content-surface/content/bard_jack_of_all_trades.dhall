-- Jack of All Trades — SRD 5.2.1 Bard level 2.
--
-- RAW: "You can add half your Proficiency Bonus (round down) to any
--       ability check you make that doesn't already use your
--       Proficiency Bonus."
--
-- Reference encoding for DiceDelta source variants:
--   • modify_roll_numeric.delta uses the proficiency_bonus source
--     (scale = "half") instead of a literal fixed_dice delta.
--
-- The "doesn't already use your PB" clause is a filter predicate over
-- the set of ability checks; it is not a property of the delta itself.
-- It is deliberately omitted here — adding a RollFilter field would be
-- speculative widening. A subsequent pass can add it if/when a second
-- feature requires the same filter (Remarkable Athlete is close, but
-- subclass territory and not in the SRD core).

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
          "You can add half your Proficiency Bonus (round down) to any ability check you make that doesn't already use your Proficiency Bonus."
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
