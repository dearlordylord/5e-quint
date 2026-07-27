let paladinAbilityScoreImprovementL4 =
      { kind = "class_feature"
      , id = "paladin_ability_score_improvement_l4"
      , name = "Ability Score Improvement"
      , className = "paladin"
      , acquiredAtLevel = 4
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Paladin#Ability Score Improvement"
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

in  paladinAbilityScoreImprovementL4
