-- Fireball — SRD 5.2.1 Spell, level 3, Evocation.
--
-- RAW (Spells / Descriptions E-L / Fireball):
--   "A bright streak flashes from you to a point you choose within
--    range and then blossoms with a low roar into a fiery explosion.
--    Each creature in a 20-foot-radius Sphere centered on that point
--    makes a Dexterity saving throw, taking 8d6 Fire damage on a
--    failed save or half as much damage on a successful one."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d6 for
--    each spell slot level above 3."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Fireball is the canonical
-- point-anchored sphere AoE; it exercises the already-landed shapes:
--   • AreaShapeDescriptor.sphere (radiusFeet = 20)
--   • AreaOrigin.point_within_range (range 150 ft)
--   • DiceAmount.linear_per_level (axis=slot, base=8d6, +1d6/slot)
--   • SaveSuccessOutcome.half_damage
--   • explicit initial hole for the chosen point within range
-- Circle of Death already covers the same shape at L6; Fireball is
-- the L3 canonical citation that future authors will look for first.
--
-- The flammable-objects clause is DM-agenda narrative, not
-- deterministic combat mechanics, and is omitted (same policy as
-- Burning Hands).

let fireball =
      { kind = "spell"
      , id = "fireball"
      , name = "Fireball"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Fireball"
          }
      , description =
          "A bright streak flashes from you to a point you choose within range and then blossoms with a low roar into a fiery explosion. Each creature in a 20-foot-radius Sphere centered on that point makes a Dexterity saving throw, taking 8d6 Fire damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 150 }
          , components =
              { v = True
              , s = True
              , m = Some "a ball of bat guano and sulfur"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "fireball_point"
                    , label = Some "point of explosion"
                    , value =
                        { kind = "area"
                        , shape = { kind = "sphere", radiusFeet = 20 }
                        , origin = { kind = "point_within_range" }
                        }
                    }
                , ability = "dex"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "fire"
                    , amount =
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base = { dice = 8, dieSize = 6 }
                        , perLevel = { dice = 1 }
                        , startingAtLevel = 3
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  fireball
