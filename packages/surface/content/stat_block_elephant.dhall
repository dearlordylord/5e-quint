let S = ./_stat_block_types.dhall

in  { challengeRating = 4
    , id = "stat_block_elephant"
    , kind = "statBlock"
    , name = "Elephant"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:532-557" }
    , statBlock =
      { abilityScores =
        { cha = 6, con = 17, dex = 9, int = 3, str = 22, wis = 11 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Multiattack"
            , description = "The elephant makes two Gore attacks."
            , reason = "unsupported_procedure_family"
            }
        , S.textOnly
            { procedureOrdinal = 2
            , name = "Gore"
            , description =
                "*Melee Attack Roll:* +8, reach 5 ft. *Hit:* 15 (2d8 + 6) Piercing damage. If the target is a Huge or smaller creature and the elephant moved 20+ feet straight toward it immediately before the hit, the target has the Prone condition."
            , reason = "unsupported_action_shape"
            }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 76 }
      , initiative = { modifier = -1, score = 9 }
      , passivePerception = 10
      , savingThrowModifiers =
        [ { ability = "str", modifier = +6 }
        , { ability = "dex", modifier = -1 }
        , { ability = "con", modifier = +3 }
        , { ability = "int", modifier = -4 }
        , { ability = "wis", modifier = +0 }
        , { ability = "cha", modifier = -2 }
        ]
      , size = "huge"
      , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
      , bonusActions =
        [ S.textOnly
            { procedureOrdinal = 1
            , name = "Trample"
            , description =
                "*Dexterity Saving Throw:* DC 16, one creature within 5 feet that has the Prone condition. *Failure:* 17 (2d10 + 6) Bludgeoning damage. *Success:* Half damage."
            , reason = "unsupported_action_shape"
            }
        ]
      }
    }
