let T = ./_stat_block_types.dhall
in  { challengeRating = 7
    , id = "stat_block_young_copper_dragon"
    , kind = "statBlock"
    , name = "Young Copper Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:348-375" }
    , statBlock =
        { abilityScores = { str = 19, dex = 12, con = 17, int = 16, wis = 13, cha = 15 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of Slowing Breath.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +7, reachFeet = 10, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 10, flat = (Some +4), static = 15 }, rest = [] : List T.Effect } } }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.NonSpellProcedure.saveArea { name = "Acid Breath", ability = "dex", dc = 14, area = (T.line { lengthFeet = 40, widthFeet = 5 }), onFail = (T.damage { damageType = "acid", dice = 9, dieSize = 8, flat = (None Integer), static = 40 }), onSuccess = { kind = "half_damage" } }, resourceOrdinals = { first = 1, rest = [] : List Natural } }
            , T.textOnly { procedureOrdinal = 4, name = "Slowing Breath", description = "Constitution Saving Throw: DC 14, each creature in a 30-foot Cone. Failure: The target can't take Reactions; its Speed is halved; and it can take either an action or a Bonus Action on its turn, not both. This effect lasts until the end of its next turn.", reason = "unsupported_action_shape" }
            ]
        , alignment = { order = "chaotic", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 119 }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 17
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = +4 }, { ability = "con", modifier = +3 }, { ability = "int", modifier = +3 }, { ability = "wis", modifier = +4 }, { ability = "cha", modifier = +2 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , senses = [ { kind = "blindsight", rangeFeet = 30, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "deception", modifier = 5 }, { skill = "perception", modifier = 7 }, { skill = "stealth", modifier = 4 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        }
    }
