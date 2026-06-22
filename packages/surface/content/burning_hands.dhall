-- Burning Hands — SRD 5.2.1 Spell, level 1, Evocation.
--
-- RAW (Spells / Descriptions A-D / Burning Hands):
--   "A thin sheet of flames shoots forth from you. Each creature in a
--    15-foot Cone makes a Dexterity saving throw, taking 3d6 Fire
--    damage on a failed save or half as much damage on a successful
--    one."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d6 for
--    each spell slot level above 1."
--
-- Validation reference for the existing cone+self geometry:
--   • AreaShapeDescriptor.cone (lengthFeet = 15)
--   • AreaOrigin.self (emanates from caster's square)
--   • DiceAmount.linear_per_level (axis=slot, base=3d6, +1d6/slot)
--   • SaveSuccessOutcome.half_damage
--
-- The flammable-objects clause needs the same object/area witness owner as
-- other area ignition clauses. The current combat profile admits creature
-- damage only, so object ignition is left to a future object-aware runtime
-- slice rather than represented as table narrative.

let burningHands =
      { kind = "spell"
      , id = "burning_hands"
      , name = "Burning Hands"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Burning Hands"
          }
      , description =
          "A thin sheet of flames shoots forth from you. Each creature in a 15-foot Cone makes a Dexterity saving throw, taking 3d6 Fire damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "cone", lengthFeet = 15 }
                    , origin = { kind = "self" }
                    }
                , ability = "dex"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "fire"
                    , amount =
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base = { dice = 3, dieSize = 6 }
                        , perLevel = { dice = 1 }
                        , startingAtLevel = 1
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  burningHands
