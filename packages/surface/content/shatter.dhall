-- Shatter — SRD 5.2.1 Spell, level 2, Evocation.
--
-- RAW (Spells / Descriptions S-Z / Shatter):
--   "A loud noise erupts from a point of your choice within range.
--    Each creature in a 10-foot-radius Sphere centered there makes a
--    Constitution saving throw, taking 3d8 Thunder damage on a
--    failed save or half as much damage on a successful one. A
--    Construct has Disadvantage on the save."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d8
--    for each spell slot level above 2."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Sphere + save + thunder damage
-- + half_damage. The "Construct has Disadvantage on the save" clause
-- is a creature-type-conditional save modifier (similar to the A5
-- deferral for Protection-from-Evil-style attacker-type immunity) —
-- modeled as DM agenda for now; save-scoped creature-type filters
-- not yet widened.
--
-- The "object in area also takes damage" clause is implicit from the
-- area attachment.

let shatter =
      { kind = "spell"
      , id = "shatter"
      , name = "Shatter"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Shatter"
          }
      , description =
          "A loud noise erupts from a point of your choice within range. Each creature in a 10-foot-radius Sphere centered there makes a Constitution saving throw, taking 3d8 Thunder damage on a failed save or half as much damage on a successful one. A Construct has Disadvantage on the save. A nonmagical object that isn't being worn or carried also takes the damage if it's in the spell's area. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True
              , s = True
              , m = Some "a chip of mica"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "shatter_point"
                    , label = "spell origin point"
                    , value =
                        { kind = "area"
                        , shape = { kind = "sphere", radiusFeet = 10 }
                        , origin = { kind = "point_within_range" }
                        }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "thunder"
                    , amount =
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base = { dice = 3, dieSize = 8 }
                        , perLevel = { dice = 1 }
                        , startingAtLevel = 2
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  shatter
