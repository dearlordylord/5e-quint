let S = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_pteranodon"
    , kind = "statBlock"
    , name = "Pteranodon"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1952-1976" }
    , statBlock =
      { abilityScores =
        { cha = 5, con = 10, dex = 15, int = 2, str = 12, wis = 9 }
      , ac.value = { kind = "literal", value = 13 }
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
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 1
                        , dieSize = 8
                        , flat = Some +2
                        , static = 6
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , creatureTypeTags = [ "dinosaur" ]
      , hp = { kind = "literal", value = 13 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 11
      , savingThrowModifiers =
        [ { ability = "str", modifier = +1 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = -1 }
        , { ability = "cha", modifier = -3 }
        ]
      , size = "medium"
      , skillModifiers = [ { modifier = +1, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
        , { feet = { kind = "literal", value = 60 }, kind = "fly" }
        ]
      , traits =
        [ S.trait
            { name = "Flyby"
            , description =
                "The pteranodon doesn't provoke an Opportunity Attack when it flies out of an enemy's reach."
            , effectKind = None Text
            }
        ]
      }
    }
