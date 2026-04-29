let druidAbilityScoreImprovementL4 =
      { kind = "class_feature"
      , id = "druid_ability_score_improvement_l4"
      , name = "Ability Score Improvement"
      , className = "druid"
      , acquiredAtLevel = 4
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Druid#Ability Score Improvement"
          }
      , description =
          "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Druid levels 8, 12, and 16."
      , mechanics =
          { family = "passive"
          , grants = [ { kind = "grant_feat", category = "general" } ]
          }
      }

in  druidAbilityScoreImprovementL4
