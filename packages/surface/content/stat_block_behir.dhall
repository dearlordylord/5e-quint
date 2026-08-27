let T = ./_stat_block_types.dhall
in  { challengeRating = 11
    , id = "stat_block_behir"
    , kind = "statBlock"
    , name = "Behir"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:583-620" }
    , statBlock =
        { abilityScores = { str = 23, dex = 16, con = 18, int = 7, wis = 14, cha = 12 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The behir makes one Bite attack and uses Constrict.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Bite", attackAbility = "str", attackBonus = +10, reachFeet = 10, onHit = { first = T.damage { damageType = "piercing", dice = 2, dieSize = 12, flat = (Some +6), static = 19 }, rest = [ T.damage { damageType = "lightning", dice = 2, dieSize = 10, flat = (None Integer), static = 11 } ] : List T.Effect } }) }
            , T.textOnly { procedureOrdinal = 3, name = "Constrict", description = "Strength Saving Throw: DC 18, one Large or smaller creature the behir can see within 5 feet. Failure: 28 (5d8 + 6) Bludgeoning damage. The target has the Grappled condition (escape DC 16), and it has the Restrained condition until the grapple ends.", reason = "unsupported_action_shape" }
            , T.resourceExecutable { procedureOrdinal = 4, procedure = (T.saveArea { name = "Lightning Breath", ability = "dex", dc = 16, area = (T.line { lengthFeet = 90, widthFeet = 5 }), onFail = (T.damage { damageType = "lightning", dice = 12, dieSize = 10, flat = (None Integer), static = 66 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            ]
        , bonusActions =
            [ T.textOnly { procedureOrdinal = 1, name = "Swallow", description = "Dexterity Saving Throw: DC 18, one Large or smaller creature Grappled by the behir (the behir can have only one creature swallowed at a time). Failure: The behir swallows the target, which is no longer Grappled. While swallowed, a creature has the Blinded and Restrained conditions, has Total Cover against attacks and other effects outside the behir, and takes 21 (6d6) Acid damage at the start of each of the behir's turns. If the behir takes 30 damage or more on a single turn from the swallowed creature, the behir must succeed on a DC 14 Constitution saving throw at the end of that turn or regurgitate the creature, which falls in a space within 10 feet of the behir and has the Prone condition. If the behir dies, a swallowed creature is no longer Restrained and can escape from the corpse by using 15 feet of movement, exiting Prone.", reason = "unsupported_action_shape" }
            ]
        , alignment = { order = "neutral", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Draconic" ] } }
        , creatureType = "monstrosity"
        , hp = { kind = "literal", value = 168 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning" ] }
        , initiative = { modifier = +3, score = 13 }
        , passivePerception = 16
        , savingThrowModifiers = [ { ability = "str", modifier = +6 }, { ability = "dex", modifier = +3 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = -2 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +1 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 90, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 6 }, { skill = "stealth", modifier = 7 } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 50 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 50 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        }
    }
