let T = ./_stat_block_types.dhall
in  { challengeRating = 0.25
    , id = "stat_block_violet_fungus"
    , kind = "statBlock"
    , name = "Violet Fungus"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:357-378" }
    , statBlock =
        { abilityScores = { str = 3, dex = 1, con = 10, int = 1, wis = 3, cha = 1 }
        , ac = { value = { kind = "literal", value = 5 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The fungus makes two Rotting Touch attacks.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 2, name = "Rotting Touch", description = "Melee Attack Roll: +2, reach 10 ft. Hit: 4 (1d8) Necrotic damage.", reason = "unsupported_action_shape" }
            ]
        , alignment = "unaligned"
        , communication = { kind = "none" }
        , creatureType = "plant"
        , hp = { kind = "literal", value = 18 }
        , initiative = { modifier = -5, score = 5 }
        , passivePerception = 6
        , immunities = { conditions = Some [ "blinded", "charmed", "deafened", "frightened" ], damageTypes = None (List Text) }
        , senses = [ { kind = "blindsight", rangeFeet = 30, qualifier = None Text } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 5 }, hover = None Bool } ]
        }
    }
