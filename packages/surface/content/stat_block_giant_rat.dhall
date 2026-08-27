let S = ./_stat_block_types.dhall

in  { challengeRating = 0.125
    , id = "stat_block_giant_rat"
    , kind = "statBlock"
    , name = "Giant Rat"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1119-1143" }
    , statBlock =
      { abilityScores =
        { cha = 4, con = 11, dex = 16, int = 2, str = 7, wis = 10 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "dex"
                  , attackBonus = +5
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 1
                        , dieSize = 4
                        , flat = Some +3
                        , static = 5
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 7 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 12
      , savingThrowModifiers =
        [ { ability = "str", modifier = -2 }
        , { ability = "dex", modifier = +5 }
        , { ability = "con", modifier = +0 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -3 }
        ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "small"
      , skillModifiers = [ { modifier = +2, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "climb" }
        ]
      , traits =
        [ S.trait
            { name = "Pack Tactics"
            , description =
                "The rat has Advantage on an attack roll against a creature if at least one of the rat's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
            , effectKind = Some
                "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target"
            }
        ]
      }
    }
