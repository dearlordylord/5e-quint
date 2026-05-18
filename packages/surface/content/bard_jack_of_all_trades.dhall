-- Jack of All Trades - SRD 5.2.1 Bard level 2.
--
-- RAW: "You can add half your Proficiency Bonus (round down) to any
--       ability check you make that uses a skill proficiency you lack
--       and that doesn't otherwise use your Proficiency Bonus."
-- The "uses a skill proficiency you lack" and "doesn't otherwise use
-- your Proficiency Bonus" clauses are predicates over an Ability Check
-- and the character's existing proficiency facts. Keep this as a
-- Jack-specific atom so the authored Surface record cannot masquerade
-- as a generic Ability Check roll modifier.

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
              [ { kind = "jack_of_all_trades_ability_check_bonus" } ]
          }
      }

in  jackOfAllTrades
