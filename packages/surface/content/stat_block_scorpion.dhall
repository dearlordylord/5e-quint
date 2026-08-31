let S = ./_stat_block_types.dhall

in  { challengeRating = 0
    , id = "stat_block_scorpion"
    , kind = "statBlock"
    , name = "Scorpion"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:2146-2165" }
    , statBlock =
      { abilityScores =
        { cha = 2, con = 8, dex = 11, int = 1, str = 2, wis = 8 }
      , ac.value = { kind = "literal", value = 11 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Sting"
                  , attackAbility = "dex"
                  , attackBonus = +2
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.staticDamage { damageType = "piercing", static = 1 }
                    , rest =
                      [ S.damage
                          { damageType = "poison"
                          , dice = 1
                          , dieSize = 6
                          , flat = None Integer
                          , static = 3
                          }
                      ]
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 1 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 9
      , savingThrowModifiers =
        [ { ability = "str", modifier = -4 }
        , { ability = "dex", modifier = +0 }
        , { ability = "con", modifier = -1 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = -1 }
        , { ability = "cha", modifier = -4 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 10 } ]
      , size = "tiny"
      , speeds = [ { feet = { kind = "literal", value = 10 }, kind = "walk" } ]
      }
    }
