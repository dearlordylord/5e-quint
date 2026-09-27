let druidAbilityScoreImprovementL4 =
      { kind = "class_feature"
      , id = "druid_ability_score_improvement_l4"
      , name = "Ability Score Improvement"
      , className = "druid"
      , acquiredAtLevel = 4
      , provenance =
          { kind = "srd-5.2.1"
          , section = "classes.md:3596-3598"
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

in  druidAbilityScoreImprovementL4
