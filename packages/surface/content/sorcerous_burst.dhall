-- Sorcerous Burst — SRD 5.2.1 Cantrip, Evocation.
--
-- RAW (Spells/Descriptions-S-Z#Sorcerous Burst):
--   "You cast sorcerous energy at one creature or object within range.
--    Make a ranged spell attack against the target. On a hit, the
--    target takes 1d8 damage of a type you choose: Acid, Cold, Fire,
--    Lightning, Poison, Psychic, or Thunder."
--   "If you roll an 8 on a d8 for this spell, you can roll another
--    d8, and add it to the damage. When you cast this spell, the
--    maximum number of these d8s you can add to the spell's damage
--    equals your spellcasting ability modifier."
--   "Cantrip Upgrade. The damage increases by 1d8 when you reach
--    levels 5 (2d8), 11 (3d8), and 17 (4d8)."
--
-- Family: activation (single attack_roll phase). The exploding damage amount
-- derives the trigger from the die maximum, so the Surface can represent
-- "d8 explodes on 8" without a second literal that can drift.

let sorcerousBurst =
      { kind = "spell"
      , id = "sorcerous_burst"
      , name = "Sorcerous Burst"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Sorcerous Burst"
          }
      , description =
          "You cast sorcerous energy at one creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d8 damage of a type you choose: Acid, Cold, Fire, Lightning, Poison, Psychic, or Thunder. If you roll an 8 on a d8 for this spell, you can roll another d8, and add it to the damage. When you cast this spell, the maximum number of these d8s you can add to the spell's damage equals your spellcasting ability modifier. Cantrip Upgrade: The damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8)."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "hole"
                    , holeId = "sorcerous_burst_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one" }
                              // { targetKinds = [ "creature", "object" ] }
                        }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit =
                    [ { kind = "damage"
                      , damageType =
                          { kind = "hole"
                          , holeId = "sorcerous_burst_damage_type"
                          , label = "sorcerous damage type"
                          , value =
                              { kind = "choice"
                              , label = "sorcerous damage type"
                              , options =
                                  [ "acid"
                                  , "cold"
                                  , "fire"
                                  , "lightning"
                                  , "poison"
                                  , "psychic"
                                  , "thunder"
                                  ]
                              }
                          }
                      , amount =
                          { kind = "threshold_tiers_exploding_max_die"
                          , axis = "character"
                          , baseDice = 1
                          , dieSize = 8
                          , tiers =
                              [ { atLevel = 5, dice = 2 }
                              , { atLevel = 11, dice = 3 }
                              , { atLevel = 17, dice = 4 }
                              ]
                          , maxAdditionalDice = "spellcasting_ability_modifier"
                          }
                      }
                    ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  sorcerousBurst
