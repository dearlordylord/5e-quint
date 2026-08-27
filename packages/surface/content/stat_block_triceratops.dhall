let S = ./_stat_block_types.dhall

in  { challengeRating = 5
    , id = "stat_block_triceratops"
    , kind = "statBlock"
    , name = "Triceratops"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:2436-2457" }
    , statBlock =
      { abilityScores =
        { cha = 5, con = 17, dex = 9, int = 2, str = 22, wis = 11 }
      , ac.value = { kind = "literal", value = 14 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description = "The triceratops makes two Gore attacks."
            , reason = "unsupported_procedure_family"
            }
        , S.textOnly
            { procedureOrdinal = 2
            , name = "Gore"
            , description =
                "*Melee Attack Roll:* +9, reach 5 ft. *Hit:* 19 (2d12 + 6) Piercing damage. If the target is a Huge or smaller creature and the triceratops moved 20+ feet straight toward it immediately before the hit, the target takes an extra 9 (2d8) Piercing damage and has the Prone condition."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , creatureTypeTags = [ "dinosaur" ]
      , hp = { kind = "literal", value = 114 }
      , initiative = { modifier = -1, score = 9 }
      , passivePerception = 10
      , savingThrowModifiers =
        [ { ability = "str", modifier = +6 }
        , { ability = "dex", modifier = -1 }
        , { ability = "con", modifier = +3 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -3 }
        ]
      , size = "huge"
      , speeds = [ { feet = { kind = "literal", value = 50 }, kind = "walk" } ]
      }
    }
