let S = ./_stat_block_types.dhall

in  { challengeRating = 0.5
    , id = "stat_block_giant_wasp"
    , kind = "statBlock"
    , name = "Giant Wasp"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1351-1374" }
    , statBlock =
      { abilityScores =
        { cha = 3, con = 10, dex = 14, int = 1, str = 10, wis = 10 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Sting"
                  , attackAbility = "dex"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 1
                        , dieSize = 6
                        , flat = Some +2
                        , static = 5
                        }
                    , S.damage
                        { damageType = "poison"
                        , dice = 2
                        , dieSize = 4
                        , flat = None Integer
                        , static = 5
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 22 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 10
      , savingThrowModifiers =
        [ { ability = "str", modifier = +0 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -4 }
        ]
      , size = "medium"
      , speeds =
        [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
        , { feet = { kind = "literal", value = 50 }, kind = "fly" }
        ]
      , traits =
        [ S.trait
            { name = "Flyby"
            , description =
                "The wasp doesn't provoke an Opportunity Attack when it flies out of an enemy's reach."
            , effectKind = None Text
            }
        ]
      }
    }
