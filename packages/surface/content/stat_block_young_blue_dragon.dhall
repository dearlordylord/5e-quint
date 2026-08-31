let T = ./_stat_block_types.dhall
in  { challengeRating = 9
    , id = "stat_block_young_blue_dragon"
    , kind = "statBlock"
    , name = "Young Blue Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:931-958" }
    , statBlock =
        { abilityScores = { str = 21, dex = 10, con = 19, int = 14, wis = 13, cha = 17 }
        , ac = { value = { kind = "literal", value = 18 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = (T.multiattack { name = "Multiattack", dispatches = { first = { count = { kind = "literal", value = +3 }, procedureOrdinal = 2 }, rest = [  ] : List T.Dispatch } }) }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +9, reachFeet = 10, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 6, flat = (Some +5), static = 12 }, rest = [ T.damage { damageType = "lightning", dice = 1, dieSize = 10, flat = (None Integer), static = 5 } ] : List T.Effect } }) }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.NonSpellProcedure.saveArea ({ name = "Lightning Breath", ability = "dex", dc = 16, area = (T.line { lengthFeet = 60, widthFeet = 5 }), onFail = (T.damage { damageType = "lightning", dice = 10, dieSize = 10, flat = (None Integer), static = 55 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 152 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning" ] }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 19
        , savingThrowModifiers = [ { ability = "str", modifier = +5 }, { ability = "dex", modifier = +4 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +5 }, { ability = "cha", modifier = +3 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 30, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 9 }, { skill = "stealth", modifier = 4 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 20 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        }
    }
