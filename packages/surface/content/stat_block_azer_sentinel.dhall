let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_azer_sentinel"
    , kind = "statBlock"
    , name = "Azer Sentinel"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:334-362" }
    , statBlock =
        { abilityScores = { cha = 10, con = 15, dex = 12, int = 12, str = 17, wis = 13 }
        , ac.value = { kind = "literal", value = 17 }
        , actions = [ T.executable { procedureOrdinal = 1, procedure = T.meleeAttack { name = "Burning Hammer", attackAbility = "str", attackBonus = +5, reachFeet = 5, onHit = { first = T.damage { damageType = "bludgeoning", dice = 1, dieSize = 10, flat = Some +3, static = 8 }, rest = [ T.damage { damageType = "fire", dice = 1, dieSize = 6, flat = None Integer, static = 3 } ] } } } ]
        , traits =
            [ T.trait { name = "Fire Aura", description = "At the end of each of the azer's turns, each creature of the azer's choice in a 5-foot Emanation originating from the azer takes 5 (1d10) Fire damage unless the azer has the Incapacitated condition.", effectKind = None Text }
            , T.trait { name = "Illumination", description = "The azer sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet.", effectKind = None Text }
            ]
        , alignment = { morality = "neutral", order = "lawful" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Primordial (Ignan)" ] } }
        , creatureType = "elemental"
        , hp = { kind = "literal", value = 39 }
        , immunities = { conditions = [ "poisoned" ], damageTypes = [ "fire", "poison" ] }
        , initiative = { modifier = +1, score = 11 }
        , passivePerception = 11
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +1 }, { ability = "cha", modifier = +0 } ]
        , size = "medium"
        , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
        }
    }
