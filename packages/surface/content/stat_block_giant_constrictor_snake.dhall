let S = ./_stat_block_types.dhall

in  { challengeRating = 2
    , id = "stat_block_giant_constrictor_snake"
    , kind = "statBlock"
    , name = "Giant Constrictor Snake"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:772-796" }
    , statBlock =
      { abilityScores =
        { cha = 3, con = 12, dex = 14, int = 1, str = 19, wis = 10 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description =
                "The snake makes one Bite attack and uses Constrict."
            , reason = "unsupported_procedure_family"
            }
        , S.executable
            { procedureOrdinal = 2
            , procedure =
                S.meleeAttack
                  { name = "Bite"
                  , attackAbility = "str"
                  , attackBonus = +6
                  , reachFeet = 10
                  , onHit =
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 2
                        , dieSize = 6
                        , flat = Some +4
                        , static = 11
                        }
                    ]
                  }
            }
        , S.textOnly
            { procedureOrdinal = 3
            , name = "Constrict"
            , description =
                "*Strength Saving Throw:* DC 14, one Large or smaller creature the snake can see within 10 feet. *Failure:* 13 (2d8 + 4) Bludgeoning damage, and the target has the Grappled condition (escape DC 14)."
            , reason = "unsupported_procedure_family"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 60 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 12
      , savingThrowModifiers =
        [ { ability = "str", modifier = +4 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -4 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 10 } ]
      , size = "huge"
      , skillModifiers = [ { modifier = +2, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "swim" }
        ]
      }
    }
