-- Land's Aid — SRD 5.2.1 Druid Circle of the Land level 3.
--
-- RAW (Classes / Druid / Level 3: Land's Aid):
--   As a Magic Action, expend Wild Shape and choose a point within 60
--   feet. A 10-foot-radius Sphere appears. Chosen creatures in it make
--   a Constitution Saving Throw against the Druid spell save DC, taking
--   Necrotic damage on a failure or half on a success. One chosen
--   creature in the area regains Hit Points. This Task 16 record models
--   the level-3 2d6 amount plus the Druid-level 10 and 14 scaling.
--
-- The spend references Wild Shape rather than copying its use-count
-- resource. The area membership remains caller/table supplied.

let landsAidDice =
      { kind = "threshold_tiers"
      , axis = "class"
      , base = { dice = 2, dieSize = 6 }
      , tiers =
          [ { atLevel = 10, override = { dice = 3 } }
          , { atLevel = 14, override = { dice = 4 } }
          ]
      }

let landsAid =
      { kind = "class_feature"
      , id = "druid_lands_aid"
      , name = "Land's Aid"
      , className = "druid"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Druid#Level 3: Land's Aid"
          }
      , description =
          "As a Magic Action, you can expend a use of your Wild Shape and choose a point within 60 feet of yourself. Vitality-giving flowers and life-draining thorns appear for a moment in a 10-foot-radius Sphere centered on that point. Each creature of your choice in the Sphere must make a Constitution saving throw against your spell save DC, taking 2d6 Necrotic damage on a failed save or half as much damage on a successful one. One creature of your choice in that area regains 2d6 Hit Points. The damage and healing increase by 1d6 when you reach Druid levels 10 (3d6) and 14 (4d6)."
      , mechanics =
          { family = "magic_action_area_save_damage_healing"
          , activationCost = { kind = "standard_action", action = "magic" }
          , spends = { resourceUnitId = "druid_wild_shape", amount = 1 }
          , area =
              { origin = { kind = "point_within_range", rangeFeet = 60 }
              , shape = { kind = "sphere", radiusFeet = 10 }
              }
          , save =
              { ability = "con"
              , dc = { kind = "class_spellcasting_spell_save_dc" }
              }
          , damage =
              { targetSelection =
                  { mode = "creatures_of_your_choice_in_area" }
              , damageType = "necrotic"
              , amount = landsAidDice
              , onSuccess = "half_damage"
              }
          , healing =
              { targetSelection =
                  { mode = "one_creature_of_your_choice_in_area" }
              , amount = landsAidDice
              }
          }
      }

in  landsAid
