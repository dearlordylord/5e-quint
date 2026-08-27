let T = ./_stat_block_types.dhall
in  { challengeRating = 9
    , id = "stat_block_bone_devil"
    , kind = "statBlock"
    , name = "Bone Devil"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1062-1098" }
    , statBlock =
        { abilityScores = { str = 18, dex = 16, con = 18, int = 13, wis = 14, cha = 16 }
        , ac = { value = { kind = "literal", value = 16 } }
        , actions =
            [ T.text 1 "Multiattack" "The devil makes two Claw attacks and one Infernal Sting attack." "unsupported_action_shape"
            , T.exec 2 (T.attack "Claw" "melee" "str" +8 (Some 10) (None T.Range) (None Text) [ T.damage "slashing" 2 8 (Some +4) 13 ] (None Text))
            , T.text 3 "Infernal Sting" "Melee Attack Roll: +8, reach 10 ft. Hit: 15 (2d10 + 4) Piercing damage plus 18 (4d8) Poison damage, and the target has the Poisoned condition until the start of the devil's next turn. While Poisoned, the target can't regain Hit Points." "unsupported_action_shape"
            ]
        , traits =
            [ T.trait "Diabolical Restoration" "If the devil dies outside the Nine Hells, its body disappears in sulfurous smoke, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Nine Hells."
            , T.trait "Magic Resistance" "The devil has Advantage on saving throws against spells and other magical effects."
            ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication =
            { kind = "spoken_and_understood"
            , languages = { kind = "named", languages = [ "Infernal" ] }
            , telepathy = Some { rangeFeet = 120, response = None Text, requiresLanguageUnderstanding = None { kind : Text, languages : List Text } }
            }
        , creatureType = "fiend"
        , creatureTypeTags = [ "devil" ]
        , hp = { kind = "literal", value = 161 }
        , immunities = { conditions = Some [ "poisoned" ], damageTypes = Some [ "fire", "poison" ] }
        , initiative = { modifier = +7, score = 17 }
        , passivePerception = 12
        , resistances = { kind = "fixed", damageTypes = [ "cold" ] }
        , savingThrowModifiers = [ { ability = "str", modifier = +8 }, { ability = "dex", modifier = +3 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +6 }, { ability = "cha", modifier = +7 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = Some "unimpeded_by_magical_darkness" } ]
        , skillModifiers = [ { skill = "deception", modifier = 7 }, { skill = "insight", modifier = 6 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        }
    }
