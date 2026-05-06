let abilityScoreImprovement =
      { abilityScoreIncreaseChoice =
          { maxScore = 20
          , methods =
            [ { kind = "one_score", increase = 2 }
            , { kind = "two_scores", primaryIncrease = 1, secondaryIncrease = 1 }
            ]
          }
      , category = "general"
      , description =
          "Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1. This feat can't increase an ability score above 20."
      , id = "feat_ability_score_improvement"
      , kind = "feat"
      , mechanics = { family = "passive", grants = [] : List {} }
      , name = "Ability Score Improvement"
      , provenance =
          { kind = "srd-5.2.1", section = "Feats.md:65-71" }
      }

in  abilityScoreImprovement
