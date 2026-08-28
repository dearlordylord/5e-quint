let T = ./_stat_block_types.dhall
in  { challengeRating = 0.25
    , id = "stat_block_axe_beak"
    , kind = "statBlock"
    , name = "Axe Beak"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:307-328" }
    , statBlock =
        { abilityScores = { cha = 5, con = 12, dex = 12, int = 2, str = 14, wis = 10 }
        , ac.value = { kind = "literal", value = 11 }
        , actions = [ T.executable { procedureOrdinal = 1, procedure = T.meleeAttack { name = "Beak", attackAbility = "str", attackBonus = +4, reachFeet = 5, onHit = { first = T.damage { damageType = "slashing", dice = 1, dieSize = 8, flat = Some +2, static = 6 }, rest = [] : List T.Effect } } } ]
        , alignment = "unaligned"
        , communication = { kind = "none" }
        , creatureType = "monstrosity"
        , hp = { kind = "literal", value = 19 }
        , initiative = { modifier = +1, score = 11 }
        , passivePerception = 10
        , savingThrowModifiers = [ { ability = "str", modifier = +2 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = -4 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = -3 } ]
        , size = "large"
        , speeds = [ { feet = { kind = "literal", value = 50 }, kind = "walk" } ]
        }
    }
