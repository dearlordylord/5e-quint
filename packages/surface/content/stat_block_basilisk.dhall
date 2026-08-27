let T = ./_stat_block_types.dhall
in  { challengeRating = 3
    , id = "stat_block_basilisk"
    , kind = "statBlock"
    , name = "Basilisk"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:519-544" }
    , statBlock =
        { abilityScores = { str = 16, dex = 8, con = 15, int = 2, wis = 8, cha = 7 }
        , ac = { value = { kind = "literal", value = 15 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = (T.meleeAttack { name = "Bite", attackAbility = "str", attackBonus = +5, reachFeet = 5, onHit = { first = T.damage { damageType = "piercing", dice = 2, dieSize = 6, flat = (Some +3), static = 10 }, rest = [ T.damage { damageType = "poison", dice = 2, dieSize = 6, flat = (None Integer), static = 7 } ] : List T.Effect } }) }
            ]
        , bonusActions =
            [ T.resourceTextOnly { procedureOrdinal = 1, name = "Petrifying Gaze (Recharge 4–6)", description = "Constitution Saving Throw: DC 12, each creature in a 30-foot Cone. If the basilisk sees its reflection in the Cone, the basilisk must make this save. First Failure: The target has the Restrained condition and repeats the save at the end of its next turn, ending the effect on itself on a success. Second Failure: The target has the Petrified condition instead of the Restrained condition.", reason = "unsupported_action_shape", resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            ]
        , alignment = "unaligned"
        , communication = { kind = "none" }
        , creatureType = "monstrosity"
        , hp = { kind = "literal", value = 52 }
        , initiative = { modifier = -1, score = 9 }
        , passivePerception = 9
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = -1 }, { ability = "con", modifier = +2 }, { ability = "int", modifier = -4 }, { ability = "wis", modifier = -1 }, { ability = "cha", modifier = -2 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 20 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 4 }) } ]
        }
    }
