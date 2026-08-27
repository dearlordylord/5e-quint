let T = ./_stat_block_types.dhall
in  { challengeRating = 0.5
    , id = "stat_block_cockatrice"
    , kind = "statBlock"
    , name = "Cockatrice"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:265-285" }
    , statBlock =
        { abilityScores = { str = 6, dex = 12, con = 12, int = 2, wis = 13, cha = 5 }
        , ac = { value = { kind = "literal", value = 11 } }
        , actions =
            [ T.exec 1 (T.attack "Petrifying Bite" "melee" "str" +3 (Some 5) (None T.Range) (None Text) [ T.damage "piercing" 1 4 (Some +1) 3 ] (Some "If the target is a creature, it is subjected to the following effect. Constitution Saving Throw: DC 11. First Failure: The target has the Restrained condition. The target repeats the save at the end of its next turn if it is still Restrained, ending the effect on a success. Second Failure: The target has the Petrified condition, instead of the Restrained condition, for 24 hours."))
            ]
        , alignment = "unaligned"
        , communication = { kind = "none" }
        , creatureType = "monstrosity"
        , hp = { kind = "literal", value = 22 }
        , initiative = { modifier = +1, score = 11 }
        , passivePerception = 11
        , savingThrowModifiers = [ { ability = "str", modifier = -2 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = -4 }, { ability = "wis", modifier = +1 }, { ability = "cha", modifier = -3 } ]
        , immunities = { conditions = Some [ "petrified" ], damageTypes = None (List Text) }
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , size = "small"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 20 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        }
    }
