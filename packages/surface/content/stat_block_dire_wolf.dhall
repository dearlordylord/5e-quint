let S = ./_stat_block_types.dhall

in  { challengeRating = 1
    , id = "stat_block_dire_wolf"
    , kind = "statBlock"
    , name = "Dire Wolf"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:457-481" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 15, dex = 15, int = 3, str = 17, wis = 12 }
      , ac.value = { kind = "literal", value = 14 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +5
                  , reachFeet = 5
                  , onHit =
                    { first =
                        S.damage
                          { damageType = "piercing"
                          , dice = 1
                          , dieSize = 10
                          , flat = Some +3
                          , static = 8
                          }
                    , rest =
                      [ S.conditionIfSize
                          { condition = "prone", maxCreatureSize = "large" }
                      ]
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 22 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 15
      , savingThrowModifiers =
        [ { ability = "str", modifier = +3 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -2 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "large"
      , skillModifiers =
        [ { modifier = +5, skill = "perception" }
        , { modifier = +4, skill = "stealth" }
        ]
      , speeds = [ { feet = { kind = "literal", value = 50 }, kind = "walk" } ]
      , traits =
        [ S.trait
            { name = "Pack Tactics"
            , description =
                "The wolf has Advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
            , effectKind = Some
                "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target"
            }
        ]
      }
    }
