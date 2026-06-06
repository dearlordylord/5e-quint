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
-- Validation reference. Encodes:
--   • attack_roll phase with ranged_spell_attack
--   • explicit initial holes for target selection and damage type
--   • Linear-per-slot damage scaling (+1d8 per slot above 1)
--   • repeat continuation when the damage roll contains duplicate d8
--     faces, bounded by slot-level leap budget and once-per-casting
--     target uniqueness
--
-- The runtime still needs cast-local continuation state to track
-- already-targeted creatures, leaps used, and the just-rolled damage
-- dice. This file only expresses the authored continuation contract.

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
              , materialCostGp = 50
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "hole"
                    , holeId = "chromatic_orb_primary_target"
                    , label = Some "primary target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit =
                    [ { kind = "damage"
                      , damageType =
                          { kind = "hole"
                          , holeId = "chromatic_orb_damage_type"
                          , label = Some "orb type"
                          , value =
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
                , continue =
                    Some
                      { kind = "repeat"
                      , when =
                          { kind = "damage_roll_has_duplicate_faces"
                          , minimumMultiplicity = 2
                          }
                      , limits =
                          [ { kind = "max_leaps_from_slot_level" }
                          , { kind = "exclude_already_targeted_in_same_cast" }
                          ]
                      , next =
                          [ { kind = "attack_roll"
                            , attachment =
                                { kind = "hole"
                                , holeId = "chromatic_orb_leap_target"
                                , label = Some "leap target"
                                , value =
                                    { kind = "target"
                                    , selection = { mode = "one" }
                                    }
                                }
                            , attackKind = "ranged_spell_attack"
                            , onHit =
                                [ { kind = "damage"
                                  , damageType =
                                      { kind = "same_choice_as"
                                      , holeId = "chromatic_orb_damage_type"
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
              ]
          }
      }

in  chromaticOrb
