let S = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_constrictor_snake"
    , kind = "statBlock"
    , name = "Constrictor Snake"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:347-369" }
    , statBlock =
      { abilityScores =
        { cha = 3, con = 12, dex = 14, int = 1, str = 15, wis = 10 }
      , ac.value = { kind = "literal", value = 13 }
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
                    [ S.damage
                        { damageType = "piercing"
                        , dice = 1
                        , dieSize = 8
                        , flat = Some +2
                        , static = 6
                        }
                    ]
                  }
            }
        , S.textOnly
            { procedureOrdinal = 2
            , name = "Constrict"
            , description =
                "*Strength Saving Throw:* DC 12, one Medium or smaller creature the snake can see within 5 feet. *Failure:* 7 (3d4) Bludgeoning damage, and the target has the Grappled condition (escape DC 12)."
            , reason = "unsupported_procedure_family"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 13 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 12
      , savingThrowModifiers =
        [ { ability = "str", modifier = +2 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -4 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 10 } ]
      , size = "large"
      , skillModifiers =
        [ { modifier = +2, skill = "perception" }
        , { modifier = +4, skill = "stealth" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
        , { feet = { kind = "literal", value = 30 }, kind = "swim" }
        ]
      }
    }
