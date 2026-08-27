let T = ./_stat_block_types.dhall
in  { challengeRating = 17
    , id = "stat_block_dragon_turtle"
    , kind = "statBlock"
    , name = "Dragon Turtle"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:793-823" }
    , statBlock =
        { abilityScores = { str = 25, dex = 10, con = 20, int = 10, wis = 12, cha = 12 }
        , ac = { value = { kind = "literal", value = 20 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Bite attacks. It can replace one attack with a Tail attack.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 2, name = "Bite", description = "Melee Attack Roll: +13, reach 15 ft. Hit: 23 (3d10 + 7) Piercing damage plus 7 (2d6) Fire damage. Being underwater doesn't grant Resistance to this Fire damage.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 3, procedure = T.meleeAttack { name = "Tail", attackAbility = "str", attackBonus = +13, reachFeet = 15, onHit = [ T.damage { damageType = "bludgeoning", dice = 2, dieSize = 10, flat = (Some +7), static = 18 }, T.conditionIfSize { condition = "prone", maxCreatureSize = "huge" } ] } }
            , T.resourceTextOnly { procedureOrdinal = 4, name = "Steam Breath", description = "Constitution Saving Throw: DC 19, each creature in a 60-foot Cone. Failure: 56 (16d6) Fire damage. Success: Half damage. Failure or Success: Being underwater doesn't grant Resistance to this Fire damage.", reason = "unsupported_action_shape", resourceOrdinals = [ 1 ] }
            ]
        , traits = [ T.trait { name = "Amphibious", description = "The dragon can breathe air and water.", effectKind = (None Text) } ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Draconic", "Primordial (Aquan)" ] } }
        , creatureType = "dragon"
        , hp = { kind = "literal", value = 356 }
        , initiative = { modifier = +6, score = 16 }
        , passivePerception = 11
        , savingThrowModifiers = [ { ability = "str", modifier = +7 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +11 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +1 } ]
        , resistances = { kind = "fixed", damageTypes = [ "fire" ] }
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , size = "gargantuan"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 20 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 50 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        }
    }
