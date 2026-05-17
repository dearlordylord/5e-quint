-- Faerie Fire — SRD 5.2.1 Spell, level 1, Evocation.
--
-- RAW (Spells / Descriptions E-L / Faerie Fire):
--   "Objects in a 20-foot Cube within range are outlined in blue,
--    green, or violet light (your choice). Each creature in the Cube
--    is also outlined if it fails a Dexterity saving throw. For the
--    duration, objects and affected creatures shed Dim Light in a
--    10-foot radius and can't benefit from the Invisible condition."
--   "Attack rolls against an affected creature or object have
--    Advantage if the attacker can see it."
--
-- Runtime boundary:
--   The promoted battle-runtime profile owns the point-origin Cube Saving
--   Throw boundary, failed-save creature outline, object outline projections
--   from caller/table-supplied object ids, sight-gated Attack Roll Advantage,
--   Invisible-benefit denial, and source-owned Dim Light emitter projections
--   for outlined creatures and objects.
--
-- Table/presentation witnesses:
--   Cube creature membership, object ids, object sight, and emitter-distance
--   facts are supplied by the caller/table at the relevant holes. The runtime
--   does not derive map geometry, pathfinding, automatic line of sight, or
--   color rendering. The caster's blue/green/violet choice has no mechanical
--   consequence and is intentionally omitted from structured mechanics.

let faerieFire =
      { kind = "spell"
      , id = "faerie_fire"
      , name = "Faerie Fire"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Faerie Fire"
          }
      , description =
          "Objects in a 20-foot Cube within range are outlined in blue, green, or violet light (your choice). Each creature in the Cube is also outlined if it fails a Dexterity saving throw. For the duration, objects and affected creatures shed Dim Light in a 10-foot radius and can't benefit from the Invisible condition. Attack rolls against an affected creature or object have Advantage if the attacker can see it."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = False, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "faerie_fire_point"
                    , label = "spell origin point"
                    , value =
                        { kind = "area"
                        , shape = { kind = "cube", sideFeet = 20 }
                        , origin = { kind = "point_within_range" }
                        }
                    }
                , ability = "dex"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "composite"
                    , effects =
                        [ { kind = "modify_roll_advantage"
                          , mode = "advantage"
                          , on = [ "attack_roll" ]
                          }
                        , { kind = "suppress_condition_benefit"
                          , condition = "invisible"
                          }
                        ]
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  faerieFire
