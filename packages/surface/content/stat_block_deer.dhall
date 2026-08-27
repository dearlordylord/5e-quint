let S = ./_stat_block_types.dhall

in  { challengeRating = 0
    , id = "stat_block_deer"
    , kind = "statBlock"
    , name = "Deer"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:429-453" }
    , statBlock =
      { abilityScores =
        { cha = 5, con = 11, dex = 16, int = 2, str = 11, wis = 14 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Ram"
                  , attackAbility = "str"
                  , attackBonus = +2
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "bludgeoning"
                          , dice = 1
                          , dieSize = 4
                          , flat = None Integer
                          , static = 2
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 4 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 14
      , savingThrowModifiers =
        [ { ability = "str", modifier = +0 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +2 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "medium"
      , skillModifiers = [ { modifier = +4, skill = "perception" } ]
      , speeds = [ { feet = { kind = "literal", value = 50 }, kind = "walk" } ]
      , traits =
        [ S.trait
            { name = "Agile"
            , description =
                "The deer doesn't provoke an Opportunity Attack when it moves out of an enemy's reach."
            , effectKind = None Text
            }
        ]
      }
    }
