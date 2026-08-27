let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_ettercap"
    , kind = "statBlock"
    , name = "Ettercap"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:123-159" }
    , statBlock =
        { abilityScores = { str = 14, dex = 15, con = 13, int = 7, wis = 12, cha = 8 }
        , ac = { value = { kind = "literal", value = 13 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The ettercap makes one Bite attack and one Claw attack.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 2, name = "Bite", description = "Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Piercing damage plus 2 (1d4) Poison damage, and the target has the Poisoned condition until the start of the ettercap's next turn.", reason = "unsupported_action_shape" }
            , T.executable
                { procedureOrdinal = 3
                , procedure = T.meleeAttack
                    { name = "Claw"
                    , attackAbility = "str"
                    , attackBonus = +4
                    , reachFeet = 5
                    , onHit = [ T.damage { damageType = "slashing", dice = 2, dieSize = 4, flat = Some +2, static = 7 } ]
                    }
                }
            , T.resourceTextOnly
                { procedureOrdinal = 4
                , name = "Web Strand (Recharge 5–6)"
                , description = "Dexterity Saving Throw: DC 12, one Large or smaller creature the ettercap can see within 30 feet. Failure: The target has the Restrained condition until the web is destroyed (AC 10; HP 5; Vulnerability to Fire damage; Immunity to Bludgeoning, Poison, and Psychic damage)."
                , reason = "unsupported_action_shape"
                , resourceOrdinals = [ 1 ]
                }
            ]
        , bonusActions =
            [ T.textOnly { procedureOrdinal = 1, name = "Reel", description = "The ettercap pulls one creature within 30 feet of itself that is Restrained by its Web Strand up to 25 feet straight toward itself.", reason = "unsupported_action_shape" } ]
        , traits =
            [ T.trait { name = "Spider Climb", description = "The ettercap can climb difficult surfaces, including along ceilings, without needing to make an ability check.", effectKind = None Text }
            , T.trait { name = "Web Walker", description = "The ettercap ignores movement restrictions caused by webs, and the ettercap knows the location of any other creature in contact with the same web.", effectKind = None Text }
            ]
        , alignment = { order = "neutral", morality = "evil" }
        , communication = { kind = "none" }
        , creatureType = "monstrosity"
        , hp = { kind = "literal", value = 44 }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 13
        , savingThrowModifiers = [ { ability = "str", modifier = +2 }, { ability = "dex", modifier = +2 } ]
        , skillModifiers = [ { skill = "perception", modifier = 3 }, { skill = "stealth", modifier = 4 }, { skill = "survival", modifier = 3 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = T.recharge { minimumRoll = 5 } } ]
        }
    }
