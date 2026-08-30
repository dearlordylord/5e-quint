let T = ./_stat_block_types.dhall
in  { challengeRating = 8
    , id = "stat_block_young_bronze_dragon"
    , kind = "statBlock"
    , name = "Young Bronze Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1309-1342" }
    , statBlock =
        { abilityScores = { str = 21, dex = 10, con = 19, int = 14, wis = 13, cha = 17 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of Repulsion Breath.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +8, reachFeet = 10, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 10, flat = (Some +5), static = 16 }, rest = [  ] : List T.Effect } }) }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.NonSpellProcedure.saveArea ({ name = "Lightning Breath", ability = "dex", dc = 15, area = (T.line { lengthFeet = 60, widthFeet = 5 }), onFail = (T.damage { damageType = "lightning", dice = 9, dieSize = 10, flat = (None Integer), static = 49 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            , T.textOnly { procedureOrdinal = 4, name = "Repulsion Breath", description = "Strength Saving Throw: DC 15, each creature in a 30-foot Cone. Failure: The target is pushed up to 40 feet straight away from the dragon and has the Prone condition.", reason = "unsupported_action_shape" }
            ]
        , traits = [ T.trait { name = "Amphibious", description = "The dragon can breathe air and water.", effectKind = None Text } ]
        , alignment = { order = "lawful", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 142 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning" ] }
        , initiative = { modifier = +3, score = 13 }
        , passivePerception = 17
        , savingThrowModifiers = [ { ability = "str", modifier = +5 }, { ability = "dex", modifier = +3 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +4 }, { ability = "cha", modifier = +3 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 30, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "insight", modifier = 4 }, { skill = "perception", modifier = 7 }, { skill = "stealth", modifier = 3 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        }
    }
