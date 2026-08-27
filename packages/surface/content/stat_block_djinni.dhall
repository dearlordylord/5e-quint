let T = ./_stat_block_types.dhall
in  { challengeRating = 11
    , id = "stat_block_djinni"
    , kind = "statBlock"
    , name = "Djinni"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:712-754" }
    , statBlock =
        { abilityScores = { str = 21, dex = 15, con = 22, int = 15, wis = 16, cha = 20 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.text 1 "Multiattack" "The djinni makes three attacks, using Storm Blade or Storm Bolt in any combination." "unsupported_action_shape"
            , T.exec 2 (T.attack "Storm Blade" "melee" "str" +9 (Some 5) (None T.Range) (None Text) [ T.damage "slashing" 2 6 (Some +5) 12, T.damage "lightning" 2 6 (None Integer) 7 ] (None Text))
            , T.exec 3 (T.attack "Storm Bolt" "ranged" "str" +9 (None Natural) (Some { normal = 120, long = 120 }) (None Text) [ T.damage "thunder" 3 8 (None Integer) 13, T.conditionIfSize "prone" "large" ] (None Text))
            , T.text 4 "Create Whirlwind" "The djinni conjures a whirlwind at a point it can see within 120 feet. The whirlwind fills a 20-foot-radius, 60-foot-high Cylinder centered on that point. The whirlwind lasts until the djinni's Concentration on it ends. The djinni can move the whirlwind up to 20 feet at the start of each of its turns. Whenever the whirlwind enters a creature's space or a creature enters the whirlwind, that creature is subjected to the following effect. Strength Saving Throw: DC 17 (a creature makes this save only once per turn, and the djinni is unaffected). Failure: While in the whirlwind, the target has the Restrained condition and moves with the whirlwind. At the start of each of its turns, the Restrained target takes 21 (6d6) Thunder damage. At the end of each of its turns, the target repeats the save, ending the effect on itself on a success." "unsupported_action_shape"
            , T.execSome 5 (T.spellcasting "Spellcasting" "cha" (Some { kind = "fixed", dc = 17 }) (None { kind : Text, value : Integer }) T.noMaterial [ T.atWill [ T.spellRef "detect_evil_and_good" (None Natural) (None Natural) (None Text), T.spellRef "detect_magic" (None Natural) (None Natural) (None Text) ], T.limited [ 1 ] [ T.spellRef "create_food_and_water" (None Natural) (None Natural) (None Text), T.spellRef "tongues" (None Natural) (None Natural) (None Text), T.spellRef "wind_walk" (None Natural) (None Natural) (None Text) ], T.limited [ 2 ] [ T.spellRef "creation" (None Natural) (None Natural) (None Text), T.spellRef "gaseous_form" (None Natural) (None Natural) (None Text), T.spellRef "invisibility" (None Natural) (None Natural) (None Text), T.spellRef "major_image" (None Natural) (None Natural) (None Text), T.spellRef "plane_shift" (None Natural) (None Natural) (None Text) ] ]) [ 1, 2 ]
            ]
        , traits = [ T.trait "Elemental Restoration" "If the djinni dies outside the Elemental Plane of Air, its body dissolves into mist, and it gains a new body in 1d4 days, reviving with all its Hit Points somewhere in the Plane of Air.", T.trait "Magic Resistance" "The djinni has Advantage on saving throws against spells and other magical effects.", T.trait "Wishes" "The djinni has a 30 percent chance of knowing the Wish spell. If the djinni knows it, the djinni can cast it only on behalf of a non-genie creature who communicates a wish in a way the djinni can understand. If the djinni casts the spell for the creature, the djinni suffers none of the spell's stress. Once the djinni has cast it three times, the djinni can't do so again for 365 days." ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Primordial (Auran)" ] } }
        , creatureType = "elemental"
        , creatureTypeTags = [ "genie" ]
        , hp = { kind = "literal", value = 218 }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 13
        , savingThrowModifiers = [ { ability = "str", modifier = +5 }, { ability = "dex", modifier = +6 }, { ability = "con", modifier = +6 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +5 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning", "thunder" ] }
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 90 }, hover = Some True } ]
        , resources = [ T.resource 1 "each" (T.daily 2), T.resource 2 "each" (T.daily 1) ]
        }
    }
