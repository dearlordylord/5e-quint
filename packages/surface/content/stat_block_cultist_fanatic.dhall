let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_cultist_fanatic"
    , kind = "statBlock"
    , name = "Cultist Fanatic"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:577-608" }
    , statBlock =
        { abilityScores = { str = 11, dex = 14, con = 12, int = 10, wis = 14, cha = 13 }
        , ac = { value = { kind = "literal", value = 13 } }
        , actions =
            [ T.exec 1 (T.attack "Pact Blade" "melee" "str" +4 (Some 5) (None T.Range) (None Text) [ T.damage "slashing" 1 8 (Some +2) 6, T.damage "necrotic" 2 6 (None Integer) 7 ] (None Text))
            , T.textSome 2 "Spellcasting" "The cultist casts one of the following spells, using Wisdom as the spellcasting ability (spell save DC 12, +4 to hit with spell attacks): At Will: Light, Thaumaturgy. 2/Day: Command. 1/Day: Hold Person." "unsupported_spellcasting_restriction" [ 1, 2 ]
            ]
        , bonusActions =
            [ T.textSome 1 "Spiritual Weapon (2/Day)" "The cultist casts the Spiritual Weapon spell, using the same spellcasting ability as Spellcasting." "unsupported_spellcasting_restriction" [ 3 ]
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common" ] } }
        , creatureType = "humanoid"
        , gear = [ { item = "Holy Symbol", quantity = None Natural }, { item = "Leather Armor", quantity = None Natural } ]
        , hp = { kind = "literal", value = 44 }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 12
        , savingThrowModifiers = [ { ability = "str", modifier = +0 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +4 }, { ability = "cha", modifier = +1 } ]
        , skillModifiers = [ { skill = "deception", modifier = 3 }, { skill = "persuasion", modifier = 3 }, { skill = "religion", modifier = 2 } ]
        , size = { kind = "alternatives", options = [ "medium", "small" ] }
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.daily 2), T.resource 2 "shared" (T.daily 1), T.resource 3 "shared" (T.daily 2) ]
        }
    }
