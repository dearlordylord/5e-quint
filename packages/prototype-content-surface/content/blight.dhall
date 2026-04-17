-- Blight — SRD 5.2.1 Spell, level 4, Necromancy.
--
-- RAW (Spells / Descriptions A-D / Blight):
--   "A creature that you can see within range makes a Constitution
--    saving throw, taking 8d8 Necrotic damage on a failed save or
--    half as much damage on a successful one. A Plant creature
--    automatically fails the save.
--    Alternatively, target a nonmagical plant that isn't a creature,
--    such as a tree or shrub. It doesn't make a save; it simply
--    withers and dies."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d8
--    for each spell slot level above 4."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Standard save_gate + damage +
-- half_damage. "Plant auto-fails" is a creature-type-conditional
-- save modifier (A5-related deferral — DM agenda). "Target a
-- nonmagical plant that isn't a creature" is object targeting +
-- narrative (no creature mechanics apply); omitted as DM agenda
-- (session resolves non-combat narrative effects).

let blight =
      { kind = "spell"
      , id = "blight"
      , name = "Blight"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Blight"
          }
      , description =
          "A creature that you can see within range makes a Constitution saving throw, taking 8d8 Necrotic damage on a failed save or half as much damage on a successful one. A Plant creature automatically fails the save. Alternatively, target a nonmagical plant that isn't a creature, such as a tree or shrub. It doesn't make a save; it simply withers and dies. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 4."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
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
                        , base = { dice = 8, dieSize = 8 }
                        , perLevel = { dice = 1 }
                        , startingAtLevel = 4
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  blight
