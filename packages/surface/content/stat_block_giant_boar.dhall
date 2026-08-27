let S = ./_stat_block_types.dhall

in  { challengeRating = 2
    , id = "stat_block_giant_boar"
    , kind = "statBlock"
    , name = "Giant Boar"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:722-745" }
    , statBlock =
      { abilityScores =
        { cha = 5, con = 16, dex = 10, int = 2, str = 17, wis = 7 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Gore"
            , description =
                "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 10 (2d6 + 3) Piercing damage. If the target is a Large or smaller creature and the boar moved 20+ feet straight toward it immediately before the hit, the target takes an extra 7 (2d6) Piercing damage and has the Prone condition."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 42 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 8
      , savingThrowModifiers =
        [ { ability = "str", modifier = +5 }
        , { ability = "dex", modifier = +0 }
        , { ability = "con", modifier = +3 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = -2 }
        , { ability = "cha", modifier = -3 }
        ]
      , size = "large"
      , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
      , traits =
        [ S.trait
            { name = "Bloodied Fury"
            , description =
                "The boar has Advantage on melee attack rolls while it is Bloodied."
            , effectKind = None Text
            }
        ]
      }
    }
