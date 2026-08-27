let S = ./_stat_block_types.dhall

in  { challengeRating = 0.125
    , id = "stat_block_flying_snake"
    , kind = "statBlock"
    , name = "Flying Snake"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:585-608" }
    , statBlock =
      { abilityScores =
        { cha = 5, con = 11, dex = 15, int = 2, str = 4, wis = 12 }
      , ac.value = { kind = "literal", value = 14 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "dex"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    [ S.staticDamage { damageType = "piercing", static = 1 }
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
      , creatureType = "monstrosity"
      , hp = { kind = "literal", value = 5 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 11
      , savingThrowModifiers =
        [ { ability = "str", modifier = -3 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 10 } ]
      , size = "tiny"
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 60 }, kind = "fly" }
        , { feet = { kind = "literal", value = 30 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Flyby"
            , description =
                "The snake doesn't provoke an Opportunity Attack when it flies out of an enemy's reach."
            , effectKind = None Text
            }
        ]
      }
    }
