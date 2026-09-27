let warlockAbilityScoreImprovementL4 =
      { kind = "class_feature"
      , id = "warlock_ability_score_improvement_l4"
      , name = "Ability Score Improvement"
      , className = "warlock"
      , acquiredAtLevel = 4
      , provenance =
          { kind = "srd-5.2.1"
          , section = "classes.md:9006-9008"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_feat"
                , category = "general"
                , openFallback = Some "any_qualifying_feat"
                }
              ]
          }
      }

in  warlockAbilityScoreImprovementL4
