let sorcererAbilityScoreImprovementL4 =
      { kind = "class_feature"
      , id = "sorcerer_ability_score_improvement_l4"
      , name = "Ability Score Improvement"
      , className = "sorcerer"
      , acquiredAtLevel = 4
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Sorcerer#Ability Score Improvement"
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

in  sorcererAbilityScoreImprovementL4
