-- Meld into Stone - SRD 5.2.1 Spell, Level 3, Transmutation.
--
-- RAW (Spells/Descriptions-M-P#Meld into Stone):
--   "You step into a stone object or surface large enough to fully contain
--    your body, merging yourself and your equipment with the stone for the
--    duration. You must touch the stone to do so."
--   "Nothing of your presence remains visible or otherwise detectable by
--    nonmagical senses."
--   While merged, outside sight is blocked, hearing outside sounds uses Wisdom
--   (Perception) with Disadvantage, the caster remains time-aware, can cast
--   spells on themself, can spend 5 feet of Movement to leave where they
--   entered, and otherwise cannot move.
--   Minor stone damage is harmless. Partial destruction or shape change that
--   makes the caster no longer fit expels them with 6d6 Force damage. Complete
--   destruction or transmutation expels them with 50 Force damage. Expulsion
--   places the caster in the closest unoccupied space to the entry location
--   and gives the Prone condition.
--
-- Surface ownership: this record owns the Spell Definition and typed
-- stone-merge source facts. Stone size, shape, material, entry location,
-- damage/destruction/transmutation events, fit-after-shape-change predicates,
-- and closest-unoccupied placement are table terrain/object witnesses for a
-- future merged-state Spell Effect owner.
let anchor =
      { chooser = "caster"
      , object = { kind = "stone_object", material = "stone" }
      , surface = { kind = "stone_surface", material = "stone" }
      }

let expulsion =
      { kind = "stone_merge_expulsion"
      , placement =
        { kind = "closest_unoccupied_space_to_entry_location"
        , owner = "table_witnessed_closest_unoccupied_space"
        }
      , condition = "prone"
      }

let meldIntoStone =
      { kind = "spell"
      , id = "meld_into_stone"
      , name = "Meld into Stone"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Spells/Descriptions-M-P#Meld into Stone"
        }
      , description =
          "You step into a stone object or surface large enough to fully contain your body, merging yourself and your equipment with the stone for the duration. You must touch the stone to do so. Nothing of your presence remains visible or otherwise detectable by nonmagical senses. While merged, you can't see outside the stone, Wisdom (Perception) checks you make to hear sounds outside it have Disadvantage, you remain aware of time, and you can cast spells on yourself. You can use 5 feet of Movement to leave where you entered, ending the spell; otherwise, you can't move. Minor physical damage to the stone doesn't harm you. Partial destruction or a shape change that makes you no longer fit expels you and deals 6d6 Force damage. Complete destruction or transmutation into a different substance expels you and deals 50 Force damage. If expelled, you move into the closest unoccupied space to where you entered and have the Prone condition."
      , mechanics =
        { family = "stone_merge"
        , level = 3
        , school = "transmutation"
        , castingTime = { kind = "action", ritual = True }
        , range.kind = "touch"
        , components = { v = True, s = True, m = False }
        , duration = { kind = "timed", value = { unit = "hour", amount = 8 } }
        , target =
          { kind = "stone_object_or_surface"
          , anchor
          , contact = "caster_must_touch_stone"
          , containment =
            { subject = "caster_body_and_equipment"
            , requirement = "large_enough_to_fully_contain_subject"
            }
          , tableTerrainObject =
            { stoneSize = "table_witnessed_stone_size"
            , stoneShape = "table_witnessed_stone_shape"
            , stoneMaterial = "table_witnessed_stone_material"
            , entryLocation = "table_witnessed_entry_location"
            }
          }
        , occupancy =
          { kind = "hidden_merged_occupancy"
          , subject = "caster_and_equipment"
          , state = "merged_with_stone"
          , detection =
            { visiblePresence = "none", nonmagicalSenses = "not_detectable" }
          , outsidePerception =
            { sight = "cannot_see_outside_stone"
            , hearing =
              { kind = "wisdom_perception_check_disadvantage"
              , ability = "wis"
              , skill = "perception"
              , stimulus = "sounds_outside_stone"
              , mode = "disadvantage"
              }
            }
          , timeAwareness = "aware_of_passage_of_time"
          , selfSpellcasting =
            { target = "self", permission = "can_cast_spells_on_self" }
          , movement =
            { voluntaryExit =
              { cost = { kind = "movement", feet = 5 }
              , location = "entry_location"
              , outcome = "spell_ends"
              }
            , otherwise = "cannot_move"
            }
          }
        , stoneEventResponses =
          { tableTerrainObject =
            { stoneDamageEvents =
                "table_witnessed_stone_damage_destruction_transmutation_events"
            , fitAfterShapeChange = "table_witnessed_fit_after_shape_change"
            , closestUnoccupiedSpace =
                "table_witnessed_closest_unoccupied_space_to_entry_location"
            }
          , minorPhysicalDamage =
            { trigger = "minor_physical_damage"
            , outcome = "no_harm_to_merged_creature"
            }
          , partialDestructionOrShapeChange =
            { triggers =
              [ "partial_destruction", "shape_change_no_longer_fits" ]
            , damage =
              { damageType = "force"
              , amount = { kind = "fixed", expr = { dice = 6, dieSize = 6 } }
              }
            , expulsion
            }
          , completeDestructionOrTransmutation =
            { triggers =
              [ "complete_destruction", "transmutation_to_different_substance" ]
            , damage =
              { damageType = "force"
              , amount =
                { kind = "fixed", expr = { dice = 0, dieSize = 1, flat = 50 } }
              }
            , expulsion
            }
          }
        }
      }

in  meldIntoStone
