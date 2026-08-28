let T = ./_stat_block_types.dhall
in  { challengeRating = 3
    , id = "stat_block_blue_dragon_wyrmling"
    , kind = "statBlock"
    , name = "Blue Dragon Wyrmling"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:900-927" }
    , statBlock =
        { abilityScores = { str = 17, dex = 10, con = 15, int = 12, wis = 11, cha = 15 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = (T.multiattack { name = "Multiattack", dispatches = { first = { count = { kind = "literal", value = +2 }, procedureOrdinal = 2 }, rest = [  ] : List T.Dispatch } }) }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +5, reachFeet = 5, onHit = { first = T.damage { damageType = "slashing", dice = 1, dieSize = 10, flat = (Some +3), static = 8 }, rest = [ T.damage { damageType = "lightning", dice = 1, dieSize = 6, flat = (None Integer), static = 3 } ] : List T.Effect } }) }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.NonSpellProcedure.saveArea ({ name = "Lightning Breath", ability = "dex", dc = 12, area = (T.line { lengthFeet = 30, widthFeet = 5 }), onFail = (T.damage { damageType = "lightning", dice = 6, dieSize = 6, flat = (None Integer), static = 21 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 65 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning" ] }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 14
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +2 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +2 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 10, qualifier = None Text }, { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 4 }, { skill = "stealth", modifier = 2 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 15 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 60 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        }
    }
