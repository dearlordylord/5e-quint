-- Inflict Wounds — SRD 5.2.1 Spell, level 1, Necromancy.
--
-- RAW (Spells / Descriptions E-L / Inflict Wounds):
--   "A creature you touch makes a Constitution saving throw, taking
--    2d10 Necrotic damage on a failed save or half as much damage on
--    a successful one."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d10
--    for each spell slot level above 1."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Note this is 5.2.1 (save-for-
-- half on touch), not 5.1 (attack roll + 3d10 on hit). Straightforward
-- save_gate + damage + half_damage + slot scaling.

let inflictWounds =
      { kind = "spell"
      , id = "inflict_wounds"
      , name = "Inflict Wounds"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Inflict Wounds"
          }
      , description =
          "A creature you touch makes a Constitution saving throw, taking 2d10 Necrotic damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
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
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base = { dice = 2, dieSize = 10 }
                        , perLevel = { dice = 1 }
                        , startingAtLevel = 1
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  inflictWounds
