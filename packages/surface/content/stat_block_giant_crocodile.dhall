let S = ./_stat_block_types.dhall

in  { challengeRating = 5
    , id = "stat_block_giant_crocodile"
    , kind = "statBlock"
    , name = "Giant Crocodile"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:828-856" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 17, dex = 9, int = 2, str = 21, wis = 10 }
      , ac.value = { kind = "literal", value = 14 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The crocodile makes one Bite attack and one Tail attack."
            , reason = "unsupported_procedure_family"
            }
        , S.textOnly
            { procedureOrdinal = 2
            , name = "Bite"
            , description =
                "*Melee Attack Roll:* +8, reach 5 ft. *Hit:* 21 (3d10 + 5) Piercing damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 15). While Grappled, the target has the Restrained condition and can't be targeted by the crocodile's Tail."
            , reason = "unsupported_action_shape"
            }
        , S.executable
            { procedureOrdinal = 3
            , procedure =
                S.meleeAttack
                  { name = "Tail"
                  , attackAbility = "str"
                  , attackBonus = +8
                  , reachFeet = 10
                  , onHit =
                    [ S.damage
                        { damageType = "bludgeoning"
                        , dice = 3
                        , dieSize = 8
                        , flat = Some +5
                        , static = 18
                        }
                    , S.conditionIfSize
                        { condition = "prone", maxCreatureSize = "large" }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 85 }
      , initiative = { modifier = -1, score = 9 }
      , passivePerception = 10
      , savingThrowModifiers =
        [ { ability = "str", modifier = +5 }
        , { ability = "dex", modifier = -1 }
        , { ability = "con", modifier = +3 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -2 }
        ]
      , size = "huge"
      , skillModifiers = [ { modifier = +5, skill = "stealth" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 50 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Hold Breath"
            , description = "The crocodile can hold its breath for 1 hour."
            , effectKind = None Text
            }
        ]
      }
    }
