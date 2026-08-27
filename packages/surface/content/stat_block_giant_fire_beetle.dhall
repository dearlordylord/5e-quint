let S = ./_stat_block_types.dhall

in  { challengeRating = 0
    , id = "stat_block_giant_fire_beetle"
    , kind = "statBlock"
    , name = "Giant Fire Beetle"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:912-936" }
    , statBlock =
      { abilityScores =
        { cha = 3, con = 12, dex = 10, int = 1, str = 8, wis = 7 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +1
                  , reachFeet = 5
                  , onHit =
                    [ S.staticDamage { damageType = "fire", static = 1 } ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 4 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 8
      , resistances = { damageTypes = [ "fire" ], kind = "fixed" }
      , savingThrowModifiers =
        [ { ability = "str", modifier = -1 }
        , { ability = "dex", modifier = +0 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = -2 }
        , { ability = "cha", modifier = -4 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 30 } ]
      , size = "small"
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "climb" }
        ]
      , traits =
        [ S.trait
            { name = "Illumination"
            , description =
                "The beetle sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet."
            , effectKind = None Text
            }
        ]
      }
    }
