let AbilityScoreIncreaseMethod : Type =
      { kind : Text
      , increase : Optional Natural
      , primaryIncrease : Optional Natural
      , secondaryIncrease : Optional Natural
      }

let oneScore =
      \(increase : Natural) ->
        { kind = "one_score"
        , increase = Some increase
        , primaryIncrease = None Natural
        , secondaryIncrease = None Natural
        }

let twoScores =
      \(primaryIncrease : Natural) ->
      \(secondaryIncrease : Natural) ->
        { kind = "two_scores"
        , increase = None Natural
        , primaryIncrease = Some primaryIncrease
        , secondaryIncrease = Some secondaryIncrease
        }

let abilityScoreImprovement =
      { abilityScoreIncreaseChoice =
          { abilityScope = { kind = "all_abilities" }
          , maxScore = 20
          , methods =
              [ oneScore 2
              , twoScores 1 1
              ] : List AbilityScoreIncreaseMethod
          }
      , category = "general"

      , id = "feat_ability_score_improvement"
      , kind = "feat"
      , mechanics = { family = "passive", grants = [] : List {} }
      , name = "Ability Score Improvement"
      , provenance =
          { kind = "srd-5.2.1", section = "Feats.md:65-71" }
      }

in  abilityScoreImprovement
