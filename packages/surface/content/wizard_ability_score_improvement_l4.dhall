let wizardAbilityScoreImprovementL4 =
      { kind = "class_feature"
      , id = "wizard_ability_score_improvement_l4"
      , name = "Ability Score Improvement"
      , className = "wizard"
      , acquiredAtLevel = 4
      , provenance =
          { kind = "srd-5.2.1"
          , section = "classes.md:10265-10267"
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

in  wizardAbilityScoreImprovementL4
