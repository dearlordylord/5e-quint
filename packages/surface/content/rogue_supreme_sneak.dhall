-- Supreme Sneak — SRD 5.2.1 Rogue level 9.
--
-- RAW (Classes / Rogue / Thief / Level 9: Supreme Sneak):
--   You gain the Stealth Attack Cunning Strike option. It costs 1d6.
--   If you have the Hide action's Invisible condition, the attack does
--   not end that condition if you end the turn behind Three-Quarters
--   Cover or Total Cover.

let supremeSneak =
      { kind = "class_feature"
      , id = "rogue_supreme_sneak"
      , name = "Supreme Sneak"
      , className = "rogue"
      , acquiredAtLevel = 9
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Rogue.md:175-179" }

      , mechanics =
          { family = "cunning_strike_option_grant"
          , sourceUnitId = "rogue_cunning_strike"
          , option =
              { id = "stealth_attack"
              , displayName = "Stealth Attack"
              , cost =
                  { kind = "sneak_attack_damage_dice"
                  , dice = 1
                  , dieSize = 6
                  }
              , prerequisite = { kind = "hide_action_invisible_condition" }
              , effect =
                  { kind = "suppress_attack_end_of_invisible_condition"
                  , conditionSource = "hide_action"
                  , ifTurnEndsBehindCover = [ "three_quarters", "total" ]
                  }
              }
          }
      }

in  supremeSneak
