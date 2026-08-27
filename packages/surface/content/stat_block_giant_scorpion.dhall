let S = ./_stat_block_types.dhall

in  { challengeRating = 3
    , id = "stat_block_giant_scorpion"
    , kind = "statBlock"
    , name = "Giant Scorpion"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1147-1170" }
    , statBlock =
      { abilityScores =
        { cha = 3, con = 15, dex = 13, int = 1, str = 16, wis = 9 }
      , ac.value = { kind = "literal", value = 15 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The scorpion makes two Claw attacks and one Sting attack."
            , reason = "unsupported_procedure_family"
            }
        , S.textOnly
            { procedureOrdinal = 2
            , name = "Claw"
            , description =
                "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 6 (1d6 + 3) Bludgeoning damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 13) from one of two claws."
            , reason = "unsupported_action_shape"
            }
        , S.executable
            { procedureOrdinal = 3
            , procedure =
                S.meleeAttack
                  { name = "Sting"
                  , attackAbility = "str"
                  , attackBonus = +5
                  , reachFeet = 5
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 1
                        , dieSize = 8
                        , flat = Some +3
                        , static = 7
                        }
                    , S.damage
                        { damageType = "poison"
                        , dice = 2
                        , dieSize = 10
                        , flat = None Integer
                        , static = 11
                        }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 52 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 9
      , savingThrowModifiers =
        [ { ability = "str", modifier = +3 }
        , { ability = "dex", modifier = +1 }
        , { ability = "con", modifier = +2 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = -1 }
        , { ability = "cha", modifier = -4 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 60 } ]
      , size = "large"
      , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
      }
    }
