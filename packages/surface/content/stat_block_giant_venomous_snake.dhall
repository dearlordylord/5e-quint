let S = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_giant_venomous_snake"
    , kind = "statBlock"
    , name = "Giant Venomous Snake"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1298-1318" }
    , statBlock =
      { abilityScores =
        { cha = 3, con = 13, dex = 18, int = 2, str = 10, wis = 10 }
      , ac.value = { kind = "literal", value = 14 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "dex"
                  , attackBonus = +6
                  , reachFeet = 10
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 1
                        , dieSize = 4
                        , flat = Some +4
                        , static = 6
                        }
                    , S.damage
                        { damageType = "poison"
                        , dice = 1
                        , dieSize = 8
                        , flat = None Integer
                        , static = 4
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 11 }
      , initiative = { modifier = +4, score = 14 }
      , passivePerception = 12
      , savingThrowModifiers =
        [ { ability = "str", modifier = +0 }
        , { ability = "dex", modifier = +4 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -4 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 10 } ]
      , size = "medium"
      , skillModifiers = [ { modifier = +2, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
        , { feet = { kind = "literal", value = 40 }, kind = "swim" }
        ]
      }
    }
