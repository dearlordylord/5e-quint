let T = ./_stat_block_types.dhall
in  { challengeRating = 5
    , id = "stat_block_bulette"
    , kind = "statBlock"
    , name = "Bulette"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1528-1558" }
    , statBlock =
        { abilityScores = { str = 19, dex = 11, con = 21, int = 2, wis = 10, cha = 5 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = (T.multiattack { name = "Multiattack", dispatches = { first = { count = { kind = "literal", value = +2 }, procedureOrdinal = 2 }, rest = [  ] : List T.Dispatch } }) }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Bite", attackAbility = "str", attackBonus = +7, reachFeet = 5, onHit = { first = T.damage { damageType = "piercing", dice = 2, dieSize = 12, flat = (Some +4), static = 17 }, rest = [  ] : List T.Effect } }) }
            , T.textOnly { procedureOrdinal = 3, name = "Deadly Leap", description = "The bulette spends 5 feet of movement to jump to a space within 15 feet that contains one or more Large or smaller creatures. Dexterity Saving Throw: DC 15, each creature in the bulette's destination space. Failure: 19 (3d12) Bludgeoning damage, and the target has the Prone condition. Success: Half damage, and the target is pushed 5 feet straight away from the bulette.", reason = "unsupported_action_shape" }
            ]
        , bonusActions =
            [ T.textOnly { procedureOrdinal = 1, name = "Leap", description = "The bulette jumps up to 30 feet by spending 10 feet of movement.", reason = "unsupported_action_shape" } ]
        , alignment = "unaligned"
        , communication = { kind = "none" }
        , creatureType = "monstrosity"
        , hp = { kind = "literal", value = 94 }
        , initiative = { modifier = +0, score = 10 }
        , passivePerception = 16
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +5 }, { ability = "int", modifier = -4 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = -3 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text }, { kind = "tremorsense", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 6 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        }
    }
