let T = ./_stat_block_types.dhall
in  { challengeRating = 1
    , id = "stat_block_copper_dragon_wyrmling"
    , kind = "statBlock"
    , name = "Copper Dragon Wyrmling"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:319-344" }
    , statBlock =
        { abilityScores = { str = 15, dex = 12, con = 13, int = 14, wis = 11, cha = 13 }
        , ac = { value = { kind = "literal", value = 16 } }
        , actions =
            [ T.exec 1 (T.attack "Rend" "melee" "str" +4 (Some 5) (None T.Range) (None Text) [ T.damage "slashing" 1 10 (Some +2) 7 ] (None Text))
            , T.execSome 2 (T.save "Acid Breath" "dex" 11 (T.line 20 5) (T.damage "acid" 4 8 (None Integer) 18) { kind = "half_damage" } (None Text)) [ 1 ]
            , T.text 3 "Slowing Breath" "Constitution Saving Throw: DC 11, each creature in a 15-foot Cone. Failure: The target can't take Reactions; its Speed is halved; and it can take either an action or a Bonus Action on its turn, not both. This effect lasts until the end of its next turn." "unsupported_action_shape"
            ]
        , alignment = { order = "chaotic", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 22 }
        , initiative = { modifier = +3, score = 13 }
        , passivePerception = 14
        , savingThrowModifiers = [ { ability = "str", modifier = +2 }, { ability = "dex", modifier = +3 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +1 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , senses = [ { kind = "blindsight", rangeFeet = 10, qualifier = None Text }, { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 4 }, { skill = "stealth", modifier = 3 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 60 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        }
    }
