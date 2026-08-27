let S = ./_stat_block_types.dhall

in  { challengeRating = 0.125
    , id = "stat_block_camel"
    , kind = "statBlock"
    , name = "Camel"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:296-315" }
    , statBlock =
      { abilityScores =
        { cha = 5, con = 17, dex = 8, int = 2, str = 15, wis = 11 }
      , ac.value = { kind = "literal", value = 10 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "bludgeoning"
                          , dice = 1
                          , dieSize = 4
                          , flat = Some +2
                          , static = 4
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 17 }
      , initiative = { modifier = -1, score = 9 }
      , passivePerception = 10
      , savingThrowModifiers =
        [ { ability = "str", modifier = +2 }
        , { ability = "dex", modifier = -1 }
        , { ability = "con", modifier = +5 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "large"
      , speeds = [ { feet = { kind = "literal", value = 50 }, kind = "walk" } ]
      }
    }
