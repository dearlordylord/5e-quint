-- Chromatic Orb — SRD 5.2.1 Spell, level 1, Evocation.
--
-- RAW (Spells / Descriptions A-D / Chromatic Orb):
--   "You hurl a 4-inch-diameter sphere of energy at a creature you
--    can see within range. Choose Acid, Cold, Fire, Lightning, Poison,
--    or Thunder for the type of orb you create, and then make a
--    ranged spell attack against the target. On a hit, the target
--    takes 3d8 damage of the chosen type."
--   "If you roll the same number on two or more of the d8s, the orb
--    leaps to a different target of your choice within 30 feet of
--    the target. Make an attack roll against the new target, and make
--    a new damage roll. The orb can't leap again unless you cast the
--    spell with a level 2+ spell slot."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d8 for
--    each spell slot level above 1. The orb can leap a maximum number
--    of times equal to the level of the slot expended, and a creature
--    can be targeted only once by each casting of this spell."
--
-- PARTIAL validation reference. Encodes:
--   • attack_roll phase with ranged_spell_attack
--   • DamageTypeRef.choice — caster picks damage type at cast time
--     from the six elemental options (validation reference for the
--     existing choice variant, noted inline in types.ts).
--   • Linear-per-slot damage scaling (+1d8 per slot above 1).
--
-- DEFERRED. The matching-dice leap rider ("if you roll the same number
-- on two or more of the d8s, the orb leaps…") has no modeled shape:
-- it is a conditional repeatable spell-attack chain triggered by the
-- DAMAGE roll's result pattern, not any existing window atom. The
-- "leap count = slot level" and "each creature targeted once per
-- casting" constraints layer on top of that. No widening lands here
-- until a second SRD unit pressures the same pattern; see survey
-- result-chromatic_orb.json for the full widening inventory.

let chromaticOrb =
      { kind = "spell"
      , id = "chromatic_orb"
      , name = "Chromatic Orb"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Chromatic Orb"
          }
      , description =
          "You hurl a 4-inch-diameter sphere of energy at a creature you can see within range. Choose Acid, Cold, Fire, Lightning, Poison, or Thunder for the type of orb you create, and then make a ranged spell attack against the target. On a hit, the target takes 3d8 damage of the chosen type. If you roll the same number on two or more of the d8s, the orb leaps to a different target of your choice within 30 feet of the target. Make an attack roll against the new target, and make a new damage roll. The orb can't leap again unless you cast the spell with a level 2+ spell slot. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 1. The orb can leap a maximum number of times equal to the level of the slot expended, and a creature can be targeted only once by each casting of this spell."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 90 }
          , components =
              { v = True
              , s = True
              , m = Some "a diamond worth 50+ GP"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit =
                    [ { kind = "damage"
                      , damageType =
                          { kind = "choice"
                          , label = "orb type"
                          , options =
                              [ "acid"
                              , "cold"
                              , "fire"
                              , "lightning"
                              , "poison"
                              , "thunder"
                              ]
                          }
                      , amount =
                          { kind = "linear_per_level"
                          , axis = "slot"
                          , base = { dice = 3, dieSize = 8 }
                          , perLevel = { dice = 1 }
                          , startingAtLevel = 1
                          }
                      }
                    ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  chromaticOrb
