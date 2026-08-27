let T = ./_stat_block_types.dhall
in  { challengeRating = 1
    , id = "stat_block_death_dog"
    , kind = "statBlock"
    , name = "Death Dog"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:642-665" }
    , statBlock =
        { abilityScores = { str = 15, dex = 14, con = 14, int = 3, wis = 13, cha = 6 }
        , ac = { value = { kind = "literal", value = 12 } }
        , actions =
            [ T.exec 1 (T.multiattack "Multiattack" [ { count = { kind = "literal", value = +2 }, procedureOrdinal = 2 } ])
            , T.exec 2 (T.attack "Bite" "melee" "str" +4 (Some 5) (None T.Range) (None Text) [ T.damage "piercing" 1 4 (Some +2) 4 ] (Some "If the target is a creature, it is subjected to the following effect. Constitution Saving Throw: DC 12. First Failure: The target has the Poisoned condition. While Poisoned, the target's Hit Point maximum doesn't return to normal when finishing a Long Rest, and it repeats the save every 24 hours that elapse, ending the effect on itself on a success. Subsequent Failures: The Poisoned target's Hit Point maximum decreases by 5 (1d10)."))
            ]
        , alignment = { order = "neutral", morality = "evil" }
        , communication = { kind = "none" }
        , creatureType = "monstrosity"
        , hp = { kind = "literal", value = 39 }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 15
        , savingThrowModifiers = [ { ability = "str", modifier = +2 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +2 }, { ability = "int", modifier = -4 }, { ability = "wis", modifier = +1 }, { ability = "cha", modifier = -2 } ]
        , immunities = { conditions = Some [ "blinded", "charmed", "deafened", "frightened", "stunned", "unconscious" ], damageTypes = None (List Text) }
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 5 }, { skill = "stealth", modifier = 4 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        }
    }
