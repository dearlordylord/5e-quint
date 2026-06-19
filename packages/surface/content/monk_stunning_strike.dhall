-- Stunning Strike -- SRD 5.2.1 Monk level 5.
--
-- RAW (Classes / Monk / Level 5: Stunning Strike):
--   Once per turn, after hitting a creature with a Monk weapon or Unarmed
--   Strike, expend 1 Focus Point. The target makes a Constitution saving
--   throw. A failed save applies Stunned until the start of the Monk's next
--   turn. A successful save halves Speed until then and grants Advantage on
--   the next attack roll made against the target before then.

let stunningStrike =
      { kind = "class_feature"
      , id = "monk_stunning_strike"
      , name = "Stunning Strike"
      , className = "monk"
      , acquiredAtLevel = 5
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Monk#Stunning Strike"
          }
      , description =
          "Once per turn when you hit a creature with a Monk weapon or an Unarmed Strike, you can expend 1 Focus Point to force a Constitution saving throw."
      , mechanics =
          { family = "stunning_strike"
          , trigger =
              { kind =
                  "hit_creature_with_monk_weapon_or_unarmed_strike"
              , usageLimit = "once_per_turn"
              }
          , optional = True
          , spends = { resourceUnitId = "monk_monks_focus", amount = 1 }
          , savingThrow = { ability = "con" }
          , onFail =
              { kind = "apply_condition"
              , condition = "stunned"
              , expires = "start_of_source_next_turn"
              }
          , onSuccess =
              { speed =
                  { kind = "halve"
                  , expires = "start_of_source_next_turn"
                  }
              , attackRoll =
                  { mode = "advantage"
                  , appliesTo =
                      "next_attack_roll_against_target_before_expiration"
                  }
              }
          }
      }

in  stunningStrike
