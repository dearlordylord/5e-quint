-- Wall of Fire — SRD 5.2.1 Spell, Level 4, Evocation.
-- Family: ongoing_effect.
--
-- RAW (Spells/Descriptions-W#Wall of Fire):
--   "You create a wall of fire on a solid surface within range. You can
--    make the wall up to 60 feet long, 20 feet high, and 1 foot thick,
--    or a ringed wall up to 20 feet in diameter, 20 feet high, and 1
--    foot thick. The wall is opaque and lasts for the duration."
--   "When the wall appears, each creature in its area makes a Dexterity
--    saving throw, taking 5d8 Fire damage on a failed save or half as
--    much damage on a successful one."
--   "One side of the wall, selected by you when you cast this spell,
--    deals 5d8 Fire damage to each creature that ends its turn within
--    10 feet of that side or inside the wall. A creature takes the same
--    damage when it enters the wall for the first time on a turn or
--    ends its turn there. The other side of the wall deals no damage."
--
-- PARTIAL — surface_widening (see proposal-wall_of_fire.md):
--   • "One side" selector: the hot face is chosen at cast time; only
--     creatures on that face's side (≤10 ft) or inside the wall are
--     damaged. The cold side deals no damage. No directional/half-space
--     area concept exists in the surface. Omitted.
--   • "Within 10 feet of the hot side": the ongoing damage zone extends
--     10 ft beyond the hot face. The `on_creature_ends_turn_in_area`
--     trigger only covers creatures inside the 1-ft wall footprint,
--     not the extended 10-ft proximity zone. Omitted.
--   • Wall height (20 ft): the `line` AreaShapeDescriptor has no
--     heightFeet field. Height is cosmetically omitted; it does not
--     affect the footprint for damage computation on a standard grid.
--
-- Encoded:
--   • Initial appearance: Dex save_gate, 5d8 fire, half on success.
--   • Ongoing enter: creature entering wall takes 5d8 fire.
--   • Ongoing end-turn: creature ending turn inside wall takes 5d8 fire.
--   • Slot scaling: +1d8 per slot above 4 on all three damage instances.
--   • Area choice: line (60 ft long, 1 ft wide) OR cylinder (ring,
--     radius 10 ft, height 20 ft).

-- Dhall requires homogeneous list element types. `line` and `cylinder`
-- have different fields, so both records are normalized with Optional
-- for non-shared dimensions. `dhall-to-json --omit-empty` drops the
-- None fields, yielding the correct discriminated-union JSON.
let ShapeOption : Type =
      { kind : Text
      , lengthFeet : Optional Natural
      , widthFeet : Optional Natural
      , radiusFeet : Optional Natural
      , heightFeet : Optional Natural
      }

let lineOption : ShapeOption =
      { kind = "line"
      , lengthFeet = Some 60
      , widthFeet = Some 1
      , radiusFeet = None Natural
      , heightFeet = None Natural
      }

let cylinderOption : ShapeOption =
      { kind = "cylinder"
      , lengthFeet = None Natural
      , widthFeet = None Natural
      , radiusFeet = Some 10
      , heightFeet = Some 20
      }

let areaShape =
      { kind = "choice"
      , options = [ lineOption, cylinderOption ]
      }

let fireAmount =
      { kind = "linear_per_level"
      , axis = "slot"
      , base = { dice = 5, dieSize = 8 }
      , perLevel = { dice = 1 }
      , startingAtLevel = 4
      }

let wallOfFire =
      { kind = "spell"
      , id = "wall_of_fire"
      , name = "Wall of Fire"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-W#Wall of Fire"
          }
      , description =
          "You create a wall of fire on a solid surface within range. You can make the wall up to 60 feet long, 20 feet high, and 1 foot thick, or a ringed wall up to 20 feet in diameter, 20 feet high, and 1 foot thick. The wall is opaque and lasts for the duration. When the wall appears, each creature in its area makes a Dexterity saving throw, taking 5d8 Fire damage on a failed save or half as much damage on a successful one. One side of the wall, selected by you when you cast this spell, deals 5d8 Fire damage to each creature that ends its turn within 10 feet of that side or inside the wall. A creature takes the same damage when it enters the wall for the first time on a turn or ends its turn there. The other side of the wall deals no damage. Using a Higher-Level Spell Slot: The damage increases by 1d8 for each spell slot level above 4."
      , mechanics =
          { family = "ongoing_effect"
          , level = 4
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = Some "a piece of charcoal" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "wall_of_fire_point"
              , label = "spell origin point"
              , value =
                  { kind = "area"
                  , shape = areaShape
                  , origin = { kind = "point_within_range" }
                  }
              }
          , initialPhase =
              { kind = "save_gate"
              , attachment =
                  { kind = "hole"
                  , holeId = "wall_of_fire_point"
                  , label = "spell origin point"
                  , value =
                      { kind = "area"
                      , shape = areaShape
                      , origin = { kind = "point_within_range" }
                      }
                  }
              , ability = "dex"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail =
                  { kind = "damage"
                  , damageType = "fire"
                  , amount = fireAmount
                  }
              , onSuccess = { kind = "half_damage" }
              }
          , operations =
              [ { trigger = { kind = "on_creature_enters_area" }
                , effect =
                    { kind = "damage"
                    , damageType = "fire"
                    , amount = fireAmount
                    }
                }
              , { trigger = { kind = "on_creature_ends_turn_in_area" }
                , effect =
                    { kind = "damage"
                    , damageType = "fire"
                    , amount = fireAmount
                    }
                }
              ]
          }
      }

in  wallOfFire
