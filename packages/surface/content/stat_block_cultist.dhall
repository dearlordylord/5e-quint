let T = ./_stat_block_types.dhall
in  { challengeRating = 0.125
    , id = "stat_block_cultist"
    , kind = "statBlock"
    , name = "Cultist"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:552-573" }
    , statBlock =
        { abilityScores = { str = 11, dex = 12, con = 10, int = 10, wis = 11, cha = 10 }
        , ac = { value = { kind = "literal", value = 12 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = T.meleeAttack { name = "Ritual Sickle", attackAbility = "dex", attackBonus = +3, reachFeet = 5, onHit = [ T.damage { damageType = "slashing", dice = 1, dieSize = 4, flat = (Some +1), static = 3 }, T.staticDamage { damageType = "necrotic", static = 1 } ] } }
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common" ] } }
        , creatureType = "humanoid"
        , gear = [ { item = "Leather Armor", quantity = None Natural }, { item = "Sickle", quantity = None Natural } ]
        , hp = { kind = "literal", value = 9 }
        , initiative = { modifier = +1, score = 11 }
        , passivePerception = 10
        , savingThrowModifiers = [ { ability = "str", modifier = +0 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +0 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +0 } ]
        , skillModifiers = [ { skill = "deception", modifier = 2 }, { skill = "religion", modifier = 2 } ]
        , size = { kind = "alternatives", options = [ "medium", "small" ] }
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
