let T = ./_stat_block_types.dhall
in  { challengeRating = 0.0
    , id = "stat_block_awakened_shrub"
    , kind = "statBlock"
    , name = "Awakened Shrub"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:253-276" }
    , statBlock =
        { abilityScores = { cha = 6, con = 11, dex = 8, int = 10, str = 3, wis = 10 }
        , ac.value = { kind = "literal", value = 9 }
        , actions = [ T.executable { procedureOrdinal = 1, procedure = T.meleeAttack { name = "Rake", attackAbility = "dex", attackBonus = +1, reachFeet = 5, onHit = { first = T.staticDamage { damageType = "slashing", static = 1 }, rest = [] : List T.Effect } } } ]
        , alignment = { morality = "neutral", order = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { additionalLanguages = 1, kind = "named_plus_other_languages", languages = [ "Common" ] } }
        , creatureType = "plant"
        , hp = { kind = "literal", value = 10 }
        , initiative = { modifier = -1, score = 9 }
        , passivePerception = 10
        , resistances = { damageTypes = [ "piercing" ], kind = "fixed" }
        , savingThrowModifiers = [ { ability = "str", modifier = -4 }, { ability = "dex", modifier = -1 }, { ability = "con", modifier = +0 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = -2 } ]
        , size = "small"
        , speeds = [ { feet = { kind = "literal", value = 20 }, kind = "walk" } ]
        , vulnerabilities = { damageTypes = [ "fire" ], kind = "fixed" }
        }
    }
