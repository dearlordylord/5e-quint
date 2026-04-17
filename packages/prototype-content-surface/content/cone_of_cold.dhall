-- Cone of Cold — SRD 5.2.1 Spell, level 5, Evocation.
--
-- RAW (Spells / Descriptions A-D / Cone of Cold):
--   "You unleash a blast of cold air. Each creature in a 60-foot Cone
--    originating from you makes a Constitution saving throw, taking
--    8d8 Cold damage on a failed save or half as much damage on a
--    successful one. A creature killed by this spell becomes a frozen
--    statue until it thaws."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d8 for
--    each spell slot level above 5."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Same shape as Burning Hands at
-- higher level: cone + self origin + save_gate + linear_per_level +
-- half_damage.
--
-- The "frozen statue until it thaws" clause is narrative flavor with
-- no mechanical consequence; omitted (DM agenda).

let coneOfCold =
      { kind = "spell"
      , id = "cone_of_cold"
      , name = "Cone of Cold"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Cone of Cold"
          }
      , description =
          "You unleash a blast of cold air. Each creature in a 60-foot Cone originating from you makes a Constitution saving throw, taking 8d8 Cold damage on a failed save or half as much damage on a successful one. A creature killed by this spell becomes a frozen statue until it thaws. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 5."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "a small crystal or glass cone"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "cone", lengthFeet = 60 }
                    , origin = { kind = "self" }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "cold"
                    , amount =
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base = { dice = 8, dieSize = 8 }
                        , perLevel = { dice = 1 }
                        , startingAtLevel = 5
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  coneOfCold
