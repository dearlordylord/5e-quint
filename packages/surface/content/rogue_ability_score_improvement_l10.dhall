let unit =
      { kind = "class_feature"
      , id = "rogue_ability_score_improvement_l10"
      , name = "Ability Score Improvement"
      , className = "rogue"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Rogue.md:93-95" }

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

in  unit
