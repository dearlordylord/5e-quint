-- Crystal Ball of Mind Reading — SRD 5.2.1 magic item (legendary, attunement).
--
-- Honest fit to the current passive magic-item surface:
--   • while touching the orb -> holding_item predicate
--   • at-will granted Scrying with fixed DC 17
--   • at-will granted Detect Thoughts with fixed DC 17
--   • Detect Thoughts target restriction anchored to the Scrying sensor
--   • Detect Thoughts duration override: no concentration, ends when
--     the granted Scrying ends

let FixedDc = { kind : Text, dc : Natural }

let VisibleTargetWithinFeet =
      { kind : Text, feet : Natural, origin : Text }

let GrantedSpellDurationOverride =
      { removeConcentration : Optional Bool
      , endsWhenGrantedSpellEnds : Optional Text
      }

let GrantSpellAccess =
      { kind : Text
      , spellId : Text
      , mode : Text
      , dcOverride : Optional FixedDc
      , targetRestriction : Optional VisibleTargetWithinFeet
      , durationOverride : Optional GrantedSpellDurationOverride
      }

let orb =
      { kind = "magic_item"
      , id = "magic_item_crystal_ball_of_mind_reading"
      , name = "Crystal Ball of Mind Reading"
      , rarity = "legendary"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#CrystalBallOfMindReading"
          }
      , description =
          "While touching this crystal orb, you can cast Scrying (save DC 17) with it. In addition, you can cast Detect Thoughts (save DC 17) targeting creatures you can see within 30 feet of the spell's sensor. You don't need to concentrate on this Detect Thoughts spell to maintain it during its duration, but it ends if the Scrying spell ends."
      , mechanics =
          { family = "passive"
          , condition = Some { kind = "holding_item" }
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "scrying"
                , mode = "at_will"
                , dcOverride = Some { kind = "fixed", dc = 17 }
                , targetRestriction = None VisibleTargetWithinFeet
                , durationOverride = None GrantedSpellDurationOverride
                }
              , { kind = "grant_spell_access"
                , spellId = "detect_thoughts"
                , mode = "at_will"
                , dcOverride = Some { kind = "fixed", dc = 17 }
                , targetRestriction =
                    Some
                      { kind = "visible_target_within_feet"
                      , feet = 30
                      , origin = "spell_sensor"
                      }
                , durationOverride =
                    Some
                      { removeConcentration = Some True
                      , endsWhenGrantedSpellEnds = Some "scrying"
                      }
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  orb
