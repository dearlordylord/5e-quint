let T = ./_stat_block_types.dhall
in  { challengeRating = 0.25
    , id = "stat_block_animated_flying_sword"
    , kind = "statBlock"
    , name = "Animated Flying Sword"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:126-148" }
    , statBlock =
        { abilityScores = { cha = 1, con = 11, dex = 15, int = 1, str = 12, wis = 5 }
        , ac.value = { kind = "literal", value = 17 }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = T.meleeAttack { name = "Slash", attackAbility = "dex", attackBonus = +4, reachFeet = 5, onHit = { first = T.damage { damageType = "slashing", dice = 1, dieSize = 8, flat = Some +2, static = 6 }, rest = [] : List T.Effect } } }
            ]
        , alignment = "unaligned"
        , communication = { kind = "none" }
        , creatureType = "construct"
        , hp = { kind = "literal", value = 14 }
        , immunities = { conditions = [ "charmed", "deafened", "exhaustion", "frightened", "paralyzed", "petrified", "poisoned" ], damageTypes = [ "poison", "psychic" ] }
        , initiative = { modifier = 4, score = 14 }
        , passivePerception = 7
        , savingThrowModifiers = [ { ability = "str", modifier = +1 }, { ability = "dex", modifier = +4 }, { ability = "con", modifier = +0 }, { ability = "int", modifier = -5 }, { ability = "wis", modifier = -3 }, { ability = "cha", modifier = -5 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60 } ]
        , size = "small"
        , speeds = [ { feet = { kind = "literal", value = 5 }, hover = None Bool, kind = "walk" }, { feet = { kind = "literal", value = 50 }, hover = Some True, kind = "fly" } ]
        }
    }
