let boonOfCombatProwess =
      { abilityScoreIncreaseChoice =
          { maxScore = 30
          , methods = [ { kind = "one_score", increase = 1 } ]
          }
      , category = "epic_boon"
      , description =
          "Increase one ability score of your choice by 1, to a maximum of 30. Peerless Aim battle behavior is modeled separately."
      , id = "feat_boon_of_combat_prowess"
      , kind = "feat"
      , mechanics = { family = "passive", grants = [] : List {} }
      , name = "Boon of Combat Prowess"
      , provenance =
          { kind = "srd-5.2.1", section = "Feats.md:121-129" }
      }

in  boonOfCombatProwess
