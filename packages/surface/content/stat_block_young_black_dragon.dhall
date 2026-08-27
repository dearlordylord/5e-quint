let T = ./_stat_block_types.dhall
in  { challengeRating = 7
    , id = "stat_block_young_black_dragon"
    , kind = "statBlock"
    , name = "Young Black Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:689-720" }
    , statBlock =
        { abilityScores = { str = 19, dex = 14, con = 17, int = 12, wis = 11, cha = 15 }
        , ac = { value = { kind = "literal", value = 18 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = (T.multiattack { name = "Multiattack", dispatches = { first = { count = { kind = "literal", value = +3 }, procedureOrdinal = 2 }, rest = [  ] : List T.Dispatch } }) }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +7, reachFeet = 10, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 4, flat = (Some +4), static = 9 }, rest = [ T.damage { damageType = "acid", dice = 1, dieSize = 6, flat = (None Integer), static = 3 } ] : List T.Effect } }) }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = (T.saveArea { name = "Acid Breath", ability = "dex", dc = 14, area = (T.line { lengthFeet = 30, widthFeet = 5 }), onFail = (T.damage { damageType = "acid", dice = 14, dieSize = 6, flat = (None Integer), static = 49 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            ]
        , traits = [ T.trait { name = "Amphibious", description = "The dragon can breathe air and water.", effectKind = None Text } ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 127 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , initiative = { modifier = +5, score = 15 }
        , passivePerception = 16
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = +5 }, { ability = "con", modifier = +3 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +3 }, { ability = "cha", modifier = +2 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 30, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 6 }, { skill = "stealth", modifier = 5 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        }
    }
