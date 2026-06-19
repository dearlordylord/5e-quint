-- Magic Circle - SRD 5.2.1 Spell, Level 3, Abjuration.
--
-- RAW (Spells/Descriptions-M-P#Magic Circle):
--   "You create a 10-foot-radius, 20-foot-tall Cylinder of magical energy
--    centered on a point on the ground that you can see within range."
--   "Choose one or more of the following types of creatures: Celestials,
--    Elementals, Fey, Fiends, or Undead."
--   The chosen creatures can't willingly enter the Cylinder by nonmagical
--   means. If a chosen creature tries to use teleportation or interplanar
--   travel to enter, it must first succeed on a Charisma saving throw.
--   Chosen creatures have Disadvantage on attack rolls against targets within
--   the Cylinder and can't possess or give the Charmed or Frightened condition
--   to those targets.
--   "When you cast this spell, you can cause its magic to operate in the
--    reverse direction..."
--   Higher-level slots increase the duration by 1 hour for each slot level
--   above 3.
--
-- Surface ownership: this record owns the Spell Definition, affected creature
-- type choice, ward direction, crossing gates, protected-target facts, and
-- table/spatial witness names. Runtime owners must consume these typed facts
-- rather than branch on spell id or name.

let casterSpellSaveDc = { kind = "caster_spell_save_dc" }

let affectedCreatureTypes =
      { kind = "one_or_more_creature_type_choice"
      , chooser = "caster"
      , label = "affected creature types"
      , selection = "one_or_more"
      , options = [ "celestial", "elemental", "fey", "fiend", "undead" ]
      }

let protectedTargetEffects =
      { attackRollDisadvantage =
          { attacker = "affected_creature"
          , target = "protected_target"
          , on = [ "attack_roll" ]
          }
      , sourceScopedPrevention =
          { source = "affected_creature"
          , possession = "prevented"
          , conditions = [ "charmed", "frightened" ]
          }
      }

let magicalCrossingGate =
      { methods = [ "teleportation", "interplanar_travel" ]
      , ability = "cha"
      , dc = casterSpellSaveDc
      }

let normalDirection =
      { kind = "normal"
      , affectedCreatureCrossing =
          { blockedCrossing = "willingly_enter_cylinder"
          , nonmagicalMeans = "prevented"
          , magicalMeans = magicalCrossingGate
          }
      , protectedTargets =
          { location = "inside_cylinder"
          , effects = protectedTargetEffects
          }
      }

let reversedDirection =
      { kind = "reversed"
      , affectedCreatureCrossing =
          { blockedCrossing = "leave_cylinder"
          , nonmagicalMeans = "prevented"
          , magicalMeans = magicalCrossingGate
          }
      , protectedTargets =
          { location = "outside_cylinder"
          , effects = protectedTargetEffects
          }
      }

let magicCircle =
      { kind = "spell"
      , id = "magic_circle"
      , name = "Magic Circle"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Magic Circle"
          }
      , description =
          "You create a 10-foot-radius, 20-foot-tall Cylinder of magical energy centered on a point on the ground that you can see within range. Glowing runes appear wherever the Cylinder intersects with the floor or other surface. Choose one or more of the following types of creatures when you cast the spell: Celestials, Elementals, Fey, Fiends, or Undead. The chosen creatures can't willingly enter the Cylinder by nonmagical means. If a chosen creature tries to use teleportation or interplanar travel to enter the Cylinder, it must first succeed on a Charisma saving throw. The chosen creatures have Disadvantage on attack rolls against targets within the Cylinder and can't possess those targets or give those targets the Charmed or Frightened condition. When you cast the spell, you can cause the magic to operate in the reverse direction, preventing a chosen creature from leaving the Cylinder and protecting targets outside it. Using a Higher-Level Spell Slot increases the duration by 1 hour for each slot level above 3."
      , mechanics =
          { family = "magic_circle_ward"
          , level = 3
          , school = "abjuration"
          , castingTime = { kind = "minutes", amount = 1, ritual = False }
          , range = { kind = "point", feet = 10 }
          , components =
              { v = True
              , s = True
              , m =
                  "salt and powdered silver worth 100+ GP, which the spell consumes"
              , materialCostGp = 100
              , materialConsumed = True
              }
          , duration =
              { kind = "timed"
              , value =
                  { unit = "hour"
                  , amount = 1
                  , upcastTiers =
                      [ { atSlot = 4, amount = 2 }
                      , { atSlot = 5, amount = 3 }
                      , { atSlot = 6, amount = 4 }
                      , { atSlot = 7, amount = 5 }
                      , { atSlot = 8, amount = 6 }
                      , { atSlot = 9, amount = 7 }
                      ]
                  }
              }
          , occurrence =
              { kind = "warded_cylinder_occurrence"
              , area =
                  { shape =
                      { kind = "cylinder", radiusFeet = 10, heightFeet = 20 }
                  , origin =
                      { kind =
                          "visible_point_on_ground_within_spell_range"
                      , chooser = "caster"
                      }
                  }
              , runes =
                  { appearWhere =
                      "cylinder_intersects_floor_or_other_surface"
                  }
              , tableSpatial =
                  { placement = "table_witnessed_visible_ground_point"
                  , cylinderMembership =
                      "table_witnessed_cylinder_membership"
                  , insideProtectedTargets =
                      "table_witnessed_targets_inside_cylinder"
                  , outsideProtectedTargets =
                      "table_witnessed_targets_outside_cylinder"
                  , willingNonmagicalEntryAttempt =
                      "table_witnessed_willing_nonmagical_entry_attempt"
                  , nonmagicalExitAttempt =
                      "table_witnessed_nonmagical_exit_attempt"
                  , teleportationCrossing =
                      "table_witnessed_teleportation_crossing"
                  , interplanarTravelCrossing =
                      "table_witnessed_interplanar_travel_crossing"
                  }
              }
          , affectedCreatureTypes = affectedCreatureTypes
          , direction =
              { chooser = "caster"
              , defaultDirection = normalDirection
              , reversedDirection = reversedDirection
              }
          }
      }

in  magicCircle
