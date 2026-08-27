let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_berserker"
    , kind = "statBlock"
    , name = "Berserker"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:622-650" }
    , statBlock =
        { abilityScores = { str = 16, dex = 12, con = 17, int = 9, wis = 11, cha = 9 }
        , ac = { value = { kind = "literal", value = 13 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = (T.meleeAttack { name = "Greataxe", attackAbility = "str", attackBonus = +5, reachFeet = 5, onHit = { first = T.damage { damageType = "slashing", dice = 1, dieSize = 12, flat = (Some +3), static = 9 }, rest = [  ] : List T.Effect } }) }
            ]
        , traits = [ T.trait { name = "Bloodied Frenzy", description = "While Bloodied, the berserker has Advantage on attack rolls and saving throws.", effectKind = None Text } ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common" ] } }
        , creatureType = "humanoid"
        , gear = [ { item = "Greataxe", quantity = None Natural }, { item = "Hide Armor", quantity = None Natural } ]
        , hp = { kind = "literal", value = 67 }
        , initiative = { modifier = +1, score = 11 }
        , passivePerception = 10
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +3 }, { ability = "int", modifier = -1 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = -1 } ]
        , size = { kind = "alternatives", options = [ "medium", "small" ] }
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
