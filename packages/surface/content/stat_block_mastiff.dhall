let S = ./_stat_block_types.dhall

in  { challengeRating = 0.125
    , id = "stat_block_mastiff"
    , kind = "statBlock"
    , name = "Mastiff"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1706-1726" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 12, dex = 14, int = 3, str = 13, wis = 12 }
      , ac.value = { kind = "literal", value = 12 }
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
                    { first =
                        S.damage
                          { damageType = "piercing"
                          , dice = 1
                          , dieSize = 6
                          , flat = Some +1
                          , static = 4
                          }
                    , rest =
                      [ S.conditionIfSize
                          { condition = "prone", maxCreatureSize = "medium" }
                      ]
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 5 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 15
      , savingThrowModifiers =
        [ { ability = "str", modifier = +1 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +3 }
        , { ability = "cha", modifier = -2 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "medium"
      , skillModifiers = [ { modifier = +5, skill = "perception" } ]
      , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
      }
    }
