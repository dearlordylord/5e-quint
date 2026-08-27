let T = ./_stat_block_types.dhall
in  { challengeRating = 7
    , id = "stat_block_young_copper_dragon"
    , kind = "statBlock"
    , name = "Young Copper Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:348-375" }
    , statBlock =
        { abilityScores = { str = 19, dex = 12, con = 17, int = 16, wis = 13, cha = 15 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.text 1 "Multiattack" "The dragon makes three Rend attacks. It can replace one attack with a use of Slowing Breath." "unsupported_action_shape"
            , T.exec 2 (T.attack "Rend" "melee" "str" +7 (Some 10) (None T.Range) (None Text) [ T.damage "slashing" 2 10 (Some +4) 15 ] (None Text))
            , T.execSome 3 (T.save "Acid Breath" "dex" 14 (T.line 40 5) (T.damage "acid" 9 8 (None Integer) 40) { kind = "half_damage" } (None Text)) [ 1 ]
            , T.text 4 "Slowing Breath" "Constitution Saving Throw: DC 14, each creature in a 30-foot Cone. Failure: The target can't take Reactions; its Speed is halved; and it can take either an action or a Bonus Action on its turn, not both. This effect lasts until the end of its next turn." "unsupported_action_shape"
            ]
        , alignment = { order = "chaotic", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 119 }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 17
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = +4 }, { ability = "con", modifier = +3 }, { ability = "int", modifier = +3 }, { ability = "wis", modifier = +4 }, { ability = "cha", modifier = +2 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , senses = [ { kind = "blindsight", rangeFeet = 30, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "deception", modifier = 5 }, { skill = "perception", modifier = 7 }, { skill = "stealth", modifier = 4 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        }
    }
