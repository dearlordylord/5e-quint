let S = ./_stat_block_types.dhall

in  { challengeRating = 1
    , id = "stat_block_brown_bear"
    , kind = "statBlock"
    , name = "Brown Bear"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:268-292" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 15, dex = 12, int = 2, str = 17, wis = 13 }
      , ac.value = { kind = "literal", value = 11 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.multiattack
                  { name = "Multiattack"
                  , dispatches =
                    { first =
                      { count = { kind = "literal", value = +1 }
                      , procedureOrdinal = 2
                      }
                    , rest =
                      [ { count = { kind = "literal", value = +1 }
                        , procedureOrdinal = 3
                        }
                      ]
                    }
                  }
            }
        , S.executable
            { procedureOrdinal = 2
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +5
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "piercing"
                          , dice = 1
                          , dieSize = 8
                          , flat = Some +3
                          , static = 7
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        , S.executable
            { procedureOrdinal = 3
            , procedure =
                S.meleeAttack
                  { name = "Claw"
                  , attackAbility = "str"
                  , attackBonus = +5
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "slashing"
                          , dice = 1
                          , dieSize = 4
                          , flat = Some +3
                          , static = 5
                          }
                    , rest =
                      [ S.conditionIfSize
                          { condition = "prone", maxCreatureSize = "large" }
                      ]
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 22 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 13
      , savingThrowModifiers =
        [ { ability = "str", modifier = +3 }
        , { ability = "dex", modifier = +1 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -2 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "large"
      , skillModifiers = [ { modifier = +3, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "climb" }
        ]
      }
    }
