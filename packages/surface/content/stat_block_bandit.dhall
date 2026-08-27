let T = ./_stat_block_types.dhall
in  { challengeRating = 0.125
    , id = "stat_block_bandit"
    , kind = "statBlock"
    , name = "Bandit"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:414-438" }
    , statBlock =
        { abilityScores = { cha = 10, con = 12, dex = 12, int = 10, str = 11, wis = 10 }
        , ac.value = { kind = "literal", value = 12 }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = T.meleeAttack { name = "Scimitar", attackAbility = "dex", attackBonus = +3, reachFeet = 5, onHit = { first = T.damage { damageType = "slashing", dice = 1, dieSize = 6, flat = Some +1, static = 4 }, rest = [] : List T.Effect } } }
            , T.executable { procedureOrdinal = 2, procedure = T.rangedAttack { name = "Light Crossbow", attackAbility = "dex", attackBonus = +3, rangeFeet = { normal = 80, long = 320 }, ammunition = Some "bolt", onHit = { first = T.damage { damageType = "piercing", dice = 1, dieSize = 8, flat = Some +1, static = 5 }, rest = [] : List T.Effect } } }
            ]
        , alignment = { morality = "neutral", order = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Thieves' Cant" ] } }
        , creatureType = "humanoid"
        , gear = [ { item = "Leather Armor" }, { item = "Light Crossbow" }, { item = "Scimitar" } ]
        , hp = { kind = "literal", value = 11 }
        , initiative = { modifier = +1, score = 11 }
        , passivePerception = 10
        , savingThrowModifiers = [ { ability = "str", modifier = +0 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = +0 } ]
        , size = { kind = "alternatives", options = [ "medium", "small" ] }
        , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
        }
    }
