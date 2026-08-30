let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_awakened_tree"
    , kind = "statBlock"
    , name = "Awakened Tree"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:280-303" }
    , statBlock =
        { abilityScores = { cha = 7, con = 15, dex = 6, int = 10, str = 19, wis = 10 }
        , ac.value = { kind = "literal", value = 13 }
        , actions = [ T.executable { procedureOrdinal = 1, procedure = T.meleeAttack { name = "Slam", attackAbility = "str", attackBonus = +6, reachFeet = 10, onHit = { first = T.damage { damageType = "bludgeoning", dice = 3, dieSize = 6, flat = Some +4, static = 14 }, rest = [] : List T.Effect } } } ]
        , alignment = { morality = "neutral", order = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { additionalLanguages = 1, kind = "named_plus_other_languages", languages = [ "Common" ] } }
        , creatureType = "plant"
        , hp = { kind = "literal", value = 59 }
        , initiative = { modifier = -2, score = 8 }
        , passivePerception = 10
        , resistances = { damageTypes = [ "bludgeoning", "piercing" ], kind = "fixed" }
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = -2 }, { ability = "con", modifier = +2 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = -2 } ]
        , size = "huge"
        , speeds = [ { feet = { kind = "literal", value = 20 }, kind = "walk" } ]
        , vulnerabilities = { damageTypes = [ "fire" ], kind = "fixed" }
        }
    }
