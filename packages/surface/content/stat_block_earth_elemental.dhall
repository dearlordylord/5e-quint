let T = ./_stat_block_types.dhall
in  { challengeRating = 5
    , id = "stat_block_earth_elemental"
    , kind = "statBlock"
    , name = "Earth Elemental"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:5-36" }
    , statBlock =
        { abilityScores = { str = 20, dex = 8, con = 20, int = 5, wis = 10, cha = 5 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The elemental makes two attacks, using Slam or Rock Launch in any combination.", reason = "unsupported_action_shape" }
            , T.executable
                { procedureOrdinal = 2
                , procedure = T.meleeAttack
                    { name = "Slam"
                    , attackAbility = "str"
                    , attackBonus = +8
                    , reachFeet = 10
                    , onHit = [ T.damage { damageType = "bludgeoning", dice = 2, dieSize = 8, flat = Some +5, static = 14 } ]
                    }
                }
            , T.executable
                { procedureOrdinal = 3
                , procedure = T.rangedAttack
                    { name = "Rock Launch"
                    , attackAbility = "str"
                    , attackBonus = +8
                    , rangeFeet = { normal = 60, long = 60 }
                    , ammunition = None Text
                    , onHit =
                        [ T.damage { damageType = "bludgeoning", dice = 1, dieSize = 6, flat = Some +5, static = 8 }
                        , T.conditionIfSize { condition = "prone", maxCreatureSize = "large" }
                        ]
                    }
                }
            ]
        , traits =
            [ T.trait { name = "Earth Glide", description = "The elemental can burrow through nonmagical, unworked earth and stone. While doing so, the elemental doesn't disturb the material it moves through.", effectKind = None Text }
            , T.trait { name = "Siege Monster", description = "The elemental deals double damage to objects and structures.", effectKind = None Text }
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Primordial (Terran)" ] } }
        , creatureType = "elemental"
        , hp = { kind = "literal", value = 147 }
        , initiative = { modifier = -1, score = 9 }
        , passivePerception = 10
        , savingThrowModifiers = [ { ability = "str", modifier = +5 }, { ability = "con", modifier = +5 } ]
        , vulnerabilities = { kind = "fixed", damageTypes = [ "thunder" ] }
        , immunities = { conditions = Some [ "exhaustion", "paralyzed", "petrified", "poisoned", "unconscious" ], damageTypes = Some [ "poison" ] }
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text }, { kind = "tremorsense", rangeFeet = 60, qualifier = None Text } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
