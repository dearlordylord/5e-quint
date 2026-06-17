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
      , description =
          "Increase your Strength or Dexterity by 1, to a maximum of 20. When you hit with an Unarmed Strike as part of the Attack action on your turn, you can use both the Damage and Grapple option once per turn. You have Advantage on attack rolls against a creature Grappled by you. You don't spend extra movement to move a creature Grappled by you if it is your size or smaller."
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
