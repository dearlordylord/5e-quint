let T = ./_stat_block_types.dhall
in  { challengeRating = 6
    , id = "stat_block_chimera"
    , kind = "statBlock"
    , name = "Chimera"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:79-107" }
    , statBlock =
        { abilityScores = { str = 19, dex = 11, con = 19, int = 3, wis = 14, cha = 10 }
        , ac = { value = { kind = "literal", value = 14 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The chimera makes one Ram attack, one Bite attack, and one Claw attack. It can replace the Claw attack with a use of Fire Breath if available.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Bite", attackAbility = "str", attackBonus = +7, reachFeet = 5, onHit = { first = T.damage { damageType = "piercing", dice = 2, dieSize = 6, flat = (Some +4), static = 11 }, rest = [ T.advantageDamage { damageType = "piercing", dice = 2, dieSize = 6, flat = (None Integer), static = 7 } ] } } }
            , T.executable { procedureOrdinal = 3, procedure = T.meleeAttack { name = "Claw", attackAbility = "str", attackBonus = +7, reachFeet = 5, onHit = { first = T.damage { damageType = "slashing", dice = 1, dieSize = 6, flat = (Some +4), static = 7 }, rest = [] : List T.Effect } } }
            , T.executable { procedureOrdinal = 4, procedure = T.meleeAttack { name = "Ram", attackAbility = "str", attackBonus = +7, reachFeet = 5, onHit = { first = T.damage { damageType = "bludgeoning", dice = 1, dieSize = 12, flat = (Some +4), static = 10 }, rest = [ T.conditionIfSize { condition = "prone", maxCreatureSize = "medium" } ] } } }
            , T.resourceExecutable { procedureOrdinal = 5, procedure = T.saveArea { name = "Fire Breath", ability = "dex", dc = 15, area = (T.cone { lengthFeet = 15 }), onFail = (T.damage { damageType = "fire", dice = 7, dieSize = 8, flat = (None Integer), static = 31 }), onSuccess = { kind = "half_damage" } }, resourceOrdinals = { first = 1, rest = [] : List Natural } }
            ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "understood_but_cannot_speak", languages = { kind = "named", languages = [ "Draconic" ] } }
        , creatureType = "monstrosity"
        , hp = { kind = "literal", value = 114 }
        , initiative = { modifier = +0, score = 10 }
        , passivePerception = 18
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = -4 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +0 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 8 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 60 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        }
    }
