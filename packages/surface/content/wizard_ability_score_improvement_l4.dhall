let wizardAbilityScoreImprovementL4 =
      { kind = "class_feature"
      , id = "wizard_ability_score_improvement_l4"
      , name = "Ability Score Improvement"
      , className = "wizard"
      , acquiredAtLevel = 4
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Wizard#Ability Score Improvement"
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
