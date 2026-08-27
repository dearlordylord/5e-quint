let T = ./_stat_block_types.dhall
in  { challengeRating = 6
    , id = "stat_block_chimera"
    , kind = "statBlock"
    , name = "Chimera"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:79-107" }
    , statBlock =
        { abilityScores = { str = 19, dex = 11, con = 19, int = 3, wis = 14, cha = 10 }
        , ac = { value = { kind = "literal", value = 14 } }
        , actions =
            [ T.text 1 "Multiattack" "The chimera makes one Ram attack, one Bite attack, and one Claw attack. It can replace the Claw attack with a use of Fire Breath if available." "unsupported_action_shape"
            , T.exec 2 (T.attack "Bite" "melee" "str" +7 (Some 5) (None T.Range) (None Text) [ T.damage "piercing" 2 6 (Some +4) 11, T.advantageDamage "piercing" 2 6 (None Integer) 7 ] (None Text))
            , T.exec 3 (T.attack "Claw" "melee" "str" +7 (Some 5) (None T.Range) (None Text) [ T.damage "slashing" 1 6 (Some +4) 7 ] (None Text))
            , T.exec 4 (T.attack "Ram" "melee" "str" +7 (Some 5) (None T.Range) (None Text) [ T.damage "bludgeoning" 1 12 (Some +4) 10, T.conditionIfSize "prone" "medium" ] (None Text))
            , T.execSome 5 (T.save "Fire Breath" "dex" 15 (T.cone 15) (T.damage "fire" 7 8 (None Integer) 31) { kind = "half_damage" } (None Text)) [ 1 ]
            ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "understood_but_cannot_speak", languages = { kind = "named", languages = [ "Draconic" ] } }
        , creatureType = "monstrosity"
        , hp = { kind = "literal", value = 114 }
        , initiative = { modifier = +0, score = 10 }
        , passivePerception = 18
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = -4 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +0 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 8 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 60 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        }
    }
