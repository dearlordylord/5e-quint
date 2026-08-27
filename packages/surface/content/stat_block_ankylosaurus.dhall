let S = ./_stat_block_types.dhall

in  { challengeRating = 3
    , id = "stat_block_ankylosaurus"
    , kind = "statBlock"
    , name = "Ankylosaurus"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:29-50" }
    , statBlock =
      { abilityScores =
        { cha = 5, con = 15, dex = 11, int = 2, str = 19, wis = 12 }
      , ac.value = { kind = "literal", value = 15 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.multiattack
                  { name = "Multiattack"
                  , dispatches =
                    [ { count = { kind = "literal", value = +2 }
                      , procedureOrdinal = 2
                      }
                    ]
                  }
            }
        , S.executable
            { procedureOrdinal = 2
            , procedure =
                S.meleeAttack
                  { name = "Tail"
                  , attackAbility = "str"
                  , attackBonus = +6
                  , reachFeet = 10
                  , onHit =
                    [ S.damage
                        { damageType = "bludgeoning"
                        , dice = 1
                        , dieSize = 10
                        , flat = Some +4
                        , static = 9
                        }
                    , S.conditionIfSize
                        { condition = "prone", maxCreatureSize = "huge" }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , creatureTypeTags = [ "dinosaur" ]
      , hp = { kind = "literal", value = 68 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 11
      , savingThrowModifiers =
        [ { ability = "str", modifier = +6 }
        , { ability = "dex", modifier = +0 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -3 }
        ]
      , size = "huge"
      , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
      }
    }
