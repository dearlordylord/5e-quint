let S = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_giant_badger"
    , kind = "statBlock"
    , name = "Giant Badger"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:674-695" }
    , statBlock =
      { abilityScores =
        { cha = 5, con = 17, dex = 10, int = 2, str = 13, wis = 12 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +3
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 2
                        , dieSize = 4
                        , flat = Some +1
                        , static = 6
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 15 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 13
      , resistances = { damageTypes = [ "poison" ], kind = "fixed" }
      , savingThrowModifiers =
        [ { ability = "str", modifier = +1 }
        , { ability = "dex", modifier = +0 }
        , { ability = "con", modifier = +3 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "medium"
      , skillModifiers = [ { modifier = +3, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 10 }, kind = "burrow" }
        ]
      }
    }
