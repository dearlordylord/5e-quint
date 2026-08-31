let T = ./_stat_block_types.dhall
in  { challengeRating = 0.0
    , id = "stat_block_shrieker_fungus"
    , kind = "statBlock"
    , name = "Shrieker Fungus"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:334-353" }
    , statBlock =
        { abilityScores = { str = 1, dex = 1, con = 10, int = 1, wis = 3, cha = 1 }
        , ac = { value = { kind = "literal", value = 5 } }
        , reactions =
            [ T.textOnly { procedureOrdinal = 1, name = "Shriek", description = "Trigger: A creature or a source of Bright Light moves within 30 feet of the shrieker. Response: The shrieker emits a shriek audible within 300 feet of itself for 1 minute or until the shrieker dies.", reason = "unsupported_action_shape" } ]
        , alignment = "unaligned"
        , communication = { kind = "none" }
        , creatureType = "plant"
        , hp = { kind = "literal", value = 13 }
        , initiative = { modifier = -5, score = 5 }
        , passivePerception = 6
        , immunities = { conditions = Some [ "blinded", "charmed", "deafened", "frightened" ], damageTypes = None (List Text) }
        , senses = [ { kind = "blindsight", rangeFeet = 30, qualifier = None Text } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 5 }, hover = None Bool } ]
        }
    }
