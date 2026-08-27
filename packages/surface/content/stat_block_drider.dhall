let T = ./_stat_block_types.dhall
in  { challengeRating = 6
    , id = "stat_block_drider"
    , kind = "statBlock"
    , name = "Drider"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:854-890" }
    , statBlock =
        { abilityScores = { str = 16, dex = 19, con = 18, int = 13, wis = 16, cha = 12 }
        , ac = { value = { kind = "literal", value = 19 } }
        , actions =
            [ T.text 1 "Multiattack" "The drider makes three attacks, using Foreleg or Poison Burst in any combination." "unsupported_action_shape"
            , T.exec 2 (T.attack "Foreleg" "melee" "str" +7 (Some 10) (None T.Range) (None Text) [ T.damage "piercing" 2 8 (Some +4) 13 ] (None Text))
            , T.exec 3 (T.attack "Poison Burst" "ranged" "dex" +6 (None Natural) (Some { normal = 120, long = 120 }) (None Text) [ T.damage "poison" 3 6 (Some +3) 13 ] (None Text))
            ]
        , bonusActions =
            [ T.textSome 1 "Magic of the Spider Queen (Recharge 5–6)" "The drider casts Darkness, Faerie Fire, or Web, requiring no Material components and using Wisdom as the spellcasting ability (spell save DC 14)." "unsupported_spellcasting_restriction" [ 1 ]
            ]
        , traits = [ T.trait "Spider Climb" "The drider can climb difficult surfaces, including along ceilings, without needing to make an ability check.", T.trait "Sunlight Sensitivity" "While in sunlight, the drider has Disadvantage on ability checks and attack rolls.", T.trait "Web Walker" "The drider ignores movement restrictions caused by webs, and the drider knows the location of any other creature in contact with the same web." ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Elvish", "Undercommon" ] } }
        , creatureType = "monstrosity"
        , hp = { kind = "literal", value = 123 }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 16
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +4 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +3 }, { ability = "cha", modifier = +1 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 6 }, { skill = "stealth", modifier = 10 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        }
    }
