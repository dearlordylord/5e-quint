let S = ./_stat_block_types.dhall

in  { challengeRating = 0
    , id = "stat_block_vulture"
    , kind = "statBlock"
    , name = "Vulture"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:2512-2536" }
    , statBlock =
      { abilityScores =
        { cha = 4, con = 13, dex = 10, int = 2, str = 7, wis = 12 }
      , ac.value = { kind = "literal", value = 10 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.meleeAttack
                  { name = "Beak"
                  , attackAbility = "dex"
                  , attackBonus = +2
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 1
                        , dieSize = 4
                        , flat = None Integer
                        , static = 2
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 5 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 13
      , savingThrowModifiers =
        [ { ability = "str", modifier = -2 }
        , { ability = "dex", modifier = +0 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -3 }
        ]
      , size = "medium"
      , skillModifiers = [ { modifier = +3, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
        , { feet = { kind = "literal", value = 50 }, kind = "fly" }
        ]
      , traits =
        [ S.trait
            { name = "Pack Tactics"
            , description =
                "The vulture has Advantage on an attack roll against a creature if at least one of the vulture's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
            , effectKind = Some
                "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target"
            }
        ]
      }
    }
