let S = ./_stat_block_types.dhall

in  { challengeRating = 6
    , id = "stat_block_mammoth"
    , kind = "statBlock"
    , name = "Mammoth"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:1677-1702" }
    , statBlock =
      { abilityScores =
        { cha = 6, con = 21, dex = 9, int = 3, str = 24, wis = 11 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description = "The mammoth makes two Gore attacks."
            , reason = "unsupported_procedure_family"
            }
        , S.textOnly
            { procedureOrdinal = 2
            , name = "Gore"
            , description =
                "*Melee Attack Roll:* +10, reach 10 ft. *Hit:* 18 (2d10 + 7) Piercing damage. If the target is a Huge or smaller creature and the mammoth moved 20+ feet straight toward it immediately before the hit, the target has the Prone condition."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 126 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 10
      , savingThrowModifiers =
        [ { ability = "str", modifier = +10 }
        , { ability = "dex", modifier = -1 }
        , { ability = "con", modifier = +8 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -2 }
        ]
      , size = "huge"
      , speeds = [ { feet = { kind = "literal", value = 50 }, kind = "walk" } ]
      , bonusActions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Trample"
            , description =
                "*Dexterity Saving Throw:* DC 18, one creature within 5 feet that has the Prone condition. *Failure:* 29 (4d10 + 7) Bludgeoning damage. *Success:* Half damage."
            , reason = "unsupported_action_shape"
            }
        ]
      }
    }
