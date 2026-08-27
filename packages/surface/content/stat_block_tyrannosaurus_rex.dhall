let S = ./_stat_block_types.dhall

in  { challengeRating = 8
    , id = "stat_block_tyrannosaurus_rex"
    , kind = "statBlock"
    , name = "Tyrannosaurus Rex"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:2461-2485" }
    , statBlock =
      { abilityScores =
        { cha = 9, con = 19, dex = 10, int = 2, str = 25, wis = 12 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The tyrannosaurus makes one Bite attack and one Tail attack."
            , reason = "unsupported_procedure_family"
            }
        , S.textOnly
            { procedureOrdinal = 2
            , name = "Bite"
            , description =
                "*Melee Attack Roll:* +10, reach 10 ft. *Hit:* 33 (4d12 + 7) Piercing damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 17). While Grappled, the target has the Restrained condition and can't be targeted by the tyrannosaurus's Tail."
            , reason = "unsupported_action_shape"
            }
        , S.executable
            { procedureOrdinal = 3
            , procedure =
                S.meleeAttack
                  { name = "Tail"
                  , attackAbility = "str"
                  , attackBonus = +10
                  , reachFeet = 15
                  , onHit =
                    [ S.damage
                        { damageType = "bludgeoning"
                        , dice = 4
                        , dieSize = 8
                        , flat = Some +7
                        , static = 25
                        }
                    , S.conditionIfSize
                        { condition = "prone", maxCreatureSize = "huge" }
                    ]
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , creatureTypeTags = [ "dinosaur" ]
      , hp = { kind = "literal", value = 136 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 14
      , savingThrowModifiers =
        [ { ability = "str", modifier = +10 }
        , { ability = "dex", modifier = +0 }
        , { ability = "con", modifier = +4 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +4 }
        , { ability = "cha", modifier = -1 }
        ]
      , size = "huge"
      , skillModifiers = [ { modifier = +4, skill = "perception" } ]
      , speeds = [ { feet = { kind = "literal", value = 50 }, kind = "walk" } ]
      }
    }
