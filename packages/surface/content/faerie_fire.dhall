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
-- ZERO-WIDENING VALIDATION REFERENCE. This is the save-gated
-- ongoing-effect pattern (sub-agent's "bane" / "save_gated_ongoing"
-- proposal, see plans/CONTENT_SURFACE_DEFERRED.md A3) authored
-- using existing surface: activation family + save_gate phase +
-- modify_roll_advantage on-fail + concentration duration. The
-- advantage modifier persists for the concentration window exactly
-- because the spell's duration is concentration; no new family is
-- needed.
--
-- Objects are NOT gated by the save ("Objects...are outlined"
-- unconditionally); only creatures save. Modeling the object-branch
-- separately would require object attachment — DEFERRED to when a
-- second object-only unit surfaces.
--
-- "Dim Light 10 ft" emanation remains a visibility predicate (DM agenda
-- per ARCHITECTURE.md §1). The failed-save creature outline is promoted as
-- a single durable effect whose executable consequences are sight-gated
-- attack-roll Advantage and Invisible-benefit denial.
--
-- The caster's choice of color (blue/green/violet) is pure narrative
-- flavor with no mechanical consequence; omitted.

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
