let T = ./_stat_block_types.dhall
in  { challengeRating = 3
    , id = "stat_block_basilisk"
    , kind = "statBlock"
    , name = "Basilisk"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:519-546" }
    , statBlock =
        { abilityScores = { str = 16, dex = 8, con = 15, int = 2, wis = 8, cha = 7 }
        , ac = { value = { kind = "literal", value = 15 } }
        , actions =
            [ T.exec 1 (T.attack "Bite" "melee" "str" +5 (Some 5) (None T.Range) (None Text) [ T.damage "piercing" 2 6 (Some +3) 10, T.damage "poison" 2 6 (None Integer) 7 ] (None Text))
            ]
        , bonusActions =
            [ T.textSome 1 "Petrifying Gaze (Recharge 4–6)" "Constitution Saving Throw: DC 12, each creature in a 30-foot Cone. If the basilisk sees its reflection in the Cone, the basilisk must make this save. First Failure: The target has the Restrained condition and repeats the save at the end of its next turn, ending the effect on itself on a success. Second Failure: The target has the Petrified condition instead of the Restrained condition." "unsupported_action_shape" [ 1 ]
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
        , resources = [ T.resource 1 "shared" (T.recharge 4) ]
        }
    }
