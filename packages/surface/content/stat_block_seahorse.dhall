let S = ./_stat_block_types.dhall

in  { challengeRating = 0
    , id = "stat_block_seahorse"
    , kind = "statBlock"
    , name = "Seahorse"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:2169-2193" }
    , statBlock =
      { abilityScores =
        { cha = 2, con = 8, dex = 12, int = 1, str = 1, wis = 10 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Bubble Dash"
            , description =
                "While underwater, the seahorse moves up to its Swim Speed without provoking Opportunity Attacks."
            , reason = "unsupported_procedure_family"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 1 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 12
      , savingThrowModifiers =
        [ { ability = "str", modifier = -5 }
        , { ability = "dex", modifier = +1 }
        , { ability = "con", modifier = -1 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -4 }
        ]
      , size = "tiny"
      , skillModifiers =
        [ { modifier = +2, skill = "perception" }
        , { modifier = +5, skill = "stealth" }
        ]
      , speeds =
        [ { feet = { kind = "literal", value = 5 }, kind = "walk" }
        , { feet = { kind = "literal", value = 20 }, kind = "swim" }
        ]
      , traits =
        [ S.trait
            { name = "Water Breathing"
            , description = "The seahorse can breathe only underwater."
            , effectKind = None Text
            }
        ]
      }
    }
