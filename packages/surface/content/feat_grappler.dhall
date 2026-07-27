-- Grappler - SRD 5.2.1 General feat.
--
-- Runtime ownership note: this authored Surface row intentionally records the
-- typed Grappler source facts without claiming battle execution. Generic
-- grapple state remains owned by the battle grapple/movement reducers.

let grappler =
      { abilityScoreIncreaseChoice =
          { abilityScope =
              { abilities = [ "str", "dex" ], kind = "specific_abilities" }
          , maxScore = 20
          , methods = [ { kind = "one_score", increase = 1 } ]
          }
      , category = "general"

      , id = "feat_grappler"
      , kind = "feat"
      , mechanics =
          { family = "grappler"
          , punchAndGrab =
              { trigger = "attack_action_unarmed_strike_hit_on_turn"
              , options = [ "damage", "grapple" ]
              , usageLimit = { kind = "once_per_turn" }
              }
          , attackAdvantage =
              { mode = "advantage"
              , on = [ "attack_roll" ]
              , target = "creature_grappled_by_you"
              }
          , fastWrestler =
              { movementCost = "no_extra_grapple_drag_cost"
              , targetSize = "your_size_or_smaller"
              }
          }
      , name = "Grappler"
      , provenance = { kind = "srd-5.2.1", section = "Feats.md:73-85" }
      }

in  grappler
