let remarkableAthlete =
      { kind = "class_feature"
      , id = "fighter_remarkable_athlete"
      , name = "Remarkable Athlete"
      , className = "fighter"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Fighter.md:139-144"
          }

      , mechanics =
          { family = "remarkable_athlete"
          , initiative = { kind = "roll_advantage", roll = "initiative" }
          , abilityCheck =
              { kind = "roll_advantage"
              , ability = "str"
              , skill = "athletics"
              }
          , criticalHitMovement =
              { trigger = { kind = "score_critical_hit" }
              , timing = "immediately_after_trigger"
              , distance = { kind = "half_speed" }
              , opportunityAttacks = "does_not_provoke"
              }
          }
      }

in  remarkableAthlete
