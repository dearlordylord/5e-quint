let S = ./_stat_block_types.dhall

in  { challengeRating = 1
    , id = "stat_block_giant_hyena"
    , kind = "statBlock"
    , name = "Giant Hyena"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:998-1022" }
    , statBlock =
      { abilityScores =
        { cha = 7, con = 14, dex = 14, int = 2, str = 16, wis = 12 }
      , ac.value = { kind = "literal", value = 12 }
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
                          , dice = 2
                          , dieSize = 6
                          , flat = Some +3
                          , static = 10
                          }
                    , rest = [] : List S.Effect
                    }
                  }
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 45 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 13
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
      , skillModifiers = [ { modifier = +3, skill = "perception" } ]
      , speeds = [ { feet = { kind = "literal", value = 50 }, kind = "walk" } ]
      , bonusActions =
        [ S.resourceTextOnly
            { procedureOrdinal = 1
            , name = "Rampage"
            , description =
                "Immediately after dealing damage to a creature that was already Bloodied, the hyena can move up to half its Speed, and it makes one Bite attack."
            , reason = "unsupported_procedure_family"
            , resourceOrdinals = { first = 1, rest = [] : List Natural }
            }
        ]
      , resources =
        [ S.resource
            { ordinal = 1, ownership = "shared", limit = S.daily { uses = 1 } }
        ]
      }
    }
