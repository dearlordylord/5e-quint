let rangerAbilityScoreImprovementL8 =
      { kind = "class_feature"
      , id = "ranger_ability_score_improvement_l8"
      , name = "Ability Score Improvement"
      , className = "ranger"
      , acquiredAtLevel = 8
      , provenance =
          { kind = "srd-5.2.1"
          , section = "classes.md:6445-6447"
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

in  rangerAbilityScoreImprovementL8
