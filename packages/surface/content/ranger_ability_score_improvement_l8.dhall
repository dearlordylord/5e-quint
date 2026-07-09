let rangerAbilityScoreImprovementL8 =
      { kind = "class_feature"
      , id = "ranger_ability_score_improvement_l8"
      , name = "Ability Score Improvement"
      , className = "ranger"
      , acquiredAtLevel = 8
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Ranger.md:106-108"
          }
      , description =
          "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify."
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
