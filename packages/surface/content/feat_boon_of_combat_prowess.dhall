let boonOfCombatProwess =
      { abilityScoreIncreaseChoice =
          { abilityScope = { kind = "all_abilities" }
          , maxScore = 30
          , methods = [ { kind = "one_score", increase = 1 } ]
          }
      , category = "epic_boon"

      , id = "feat_boon_of_combat_prowess"
      , kind = "feat"
      , mechanics =
        { effect.kind = "replace_miss_with_hit"
        , family = "triggered_replacement"
        , optional = True
        , resetCadence.kind = "start_of_next_turn"
        , trigger.kind = "miss_with_attack_roll"
        }
      , name = "Boon of Combat Prowess"
      , provenance =
          { kind = "srd-5.2.1", section = "Feats.md:121-129" }
      }

in  boonOfCombatProwess
