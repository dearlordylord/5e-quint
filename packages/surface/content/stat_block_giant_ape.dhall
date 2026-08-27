let S = ./_stat_block_types.dhall

in  { challengeRating = 7
    , id = "stat_block_giant_ape"
    , kind = "statBlock"
    , name = "Giant Ape"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:642-670" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 18, dex = 14, int = 5, str = 23, wis = 12 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.executable
            { procedureOrdinal = 1
            , procedure =
                S.multiattack
                  { name = "Multiattack"
                  , dispatches =
                    [ { count = { kind = "literal", value = +2 }
                      , procedureOrdinal = 2
                      }
                    ]
                  }
            }
        , S.executable
            { procedureOrdinal = 2
            , procedure =
                S.meleeAttack
                  { name = "Fist"
                  , attackAbility = "str"
                  , attackBonus = +9
                  , reachFeet = 10
                  , onHit =
                    [ S.damage
                        { damageType = "bludgeoning"
                        , dice = 3
                        , dieSize = 10
                        , flat = Some +6
                        , static = 22
                        }
                    ]
                  }
            }
        , S.resourceTextOnly
            { procedureOrdinal = 3
            , name = "Boulder Toss"
            , description =
                "The ape hurls a boulder at a point it can see within 90 feet. *Dexterity Saving Throw:* DC 17, each creature in a 5-foot-radius Sphere centered on that point. *Failure:* 24 (7d6) Bludgeoning damage. If the target is a Large or smaller creature, it has the Prone condition. *Success:* Half damage only."
            , reason = "unsupported_procedure_family"
            , resourceOrdinals = [ 1 ]
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 168 }
      , initiative = { modifier = +5, score = 15 }
      , passivePerception = 14
      , savingThrowModifiers =
        [ { ability = "str", modifier = +6 }
        , { ability = "dex", modifier = +2 }
        , { ability = "con", modifier = +4 }
        , { ability = "int", modifier = -3 }
        , { ability = "wis", modifier = +1 }
        , { ability = "cha", modifier = -2 }
        ]
      , size = "huge"
      , skillModifiers =
        [ { modifier = +9, skill = "athletics" }
        , { modifier = +4, skill = "perception" }
        , { modifier = +4, skill = "survival" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
        , { feet = { kind = "literal", value = 40 }, kind = "climb" }
        ]
      , bonusActions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Leap"
            , description =
                "The ape jumps up to 30 feet by spending 10 feet of movement."
            , reason = "unsupported_procedure_family"
            }
        ]
      , resources =
        [ S.resource
            { ordinal = 1
            , ownership = "shared"
            , limit = S.recharge { minimumRoll = 6 }
            }
        ]
      }
    }
