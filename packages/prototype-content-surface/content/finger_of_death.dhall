-- Finger of Death — SRD 5.2.1 Spell, level 7, Necromancy.
-- Family: activation (single save_gate phase).
-- Target: one creature within 60 ft; Constitution save.
-- Fail: 7d8+30 Necrotic damage; Success: half (encoded as 3d8+15).
-- No upcast text in source.
--
-- OMITTED RIDER: "A Humanoid killed by this spell rises at the start of your
-- next turn as a Zombie that follows your verbal orders."
-- → requires: (a) on_kill_window atom (not in v4); (b) create_companion
--   in Effect type (v4 atom but absent from surface); (c) creature-type
--   filter "Humanoid only" (no creature-type predicate in v4 taxonomy).
-- Classified as: atom_widening (on_kill_window absent from v4).
--
-- Note: "half damage on success" is encoded as an independent 3d8+15
-- success branch. The mathematical relationship success = fail/2 is
-- approximately correct in expected values but is NOT expressible as a
-- linked constraint in the current surface (surface_widening).

let fingerOfDeath =
      { kind = "spell"
      , id = "finger_of_death"
      , name = "Finger of Death"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-F#Finger of Death"
          }
      , description =
          "You unleash negative energy toward a creature you can see within range. The target makes a Constitution saving throw, taking 7d8 + 30 Necrotic damage on a failed save or half as much damage on a successful one. A Humanoid killed by this spell rises at the start of your next turn as a Zombie that follows your verbal orders."
      , mechanics =
          { family = "activation"
          , level = 7
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "necrotic"
                    , amount =
                        { kind = "fixed"
                        , expr = { dice = 7, dieSize = 8, flat = 30 }
                        }
                    }
                , onSuccess =
                    { kind = "damage"
                    , damageType = "necrotic"
                    , amount =
                        { kind = "fixed"
                        , expr = { dice = 3, dieSize = 8, flat = 15 }
                        }
                    }
                }
              ]
          }
      }

in  fingerOfDeath
