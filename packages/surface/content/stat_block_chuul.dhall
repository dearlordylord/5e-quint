let T = ./_stat_block_types.dhall
in  { challengeRating = 4
    , id = "stat_block_chuul"
    , kind = "statBlock"
    , name = "Chuul"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:111-142" }
    , statBlock =
        { abilityScores = { str = 19, dex = 10, con = 16, int = 5, wis = 11, cha = 5 }
        , ac = { value = { kind = "literal", value = 16 } }
        , actions =
            [ T.text 1 "Multiattack" "The chuul makes two Pincer attacks and uses Paralyzing Tentacles." "unsupported_action_shape"
            , T.text 2 "Pincer" "Melee Attack Roll: +6, reach 10 ft. Hit: 9 (1d10 + 4) Bludgeoning damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 14) from one of two pincers." "unsupported_action_shape"
            , T.text 3 "Paralyzing Tentacles" "Constitution Saving Throw: DC 13, one creature Grappled by the chuul. Failure: The target has the Poisoned condition and repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically. While Poisoned, the target has the Paralyzed condition." "unsupported_action_shape"
            ]
        , traits = [ T.trait "Amphibious" "The chuul can breathe air and water.", T.trait "Sense Magic" "The chuul senses magic within 120 feet of itself. This trait otherwise works like the Detect Magic spell but isn't itself magical." ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "understood_but_cannot_speak", languages = { kind = "named", languages = [ "Deep Speech" ] } }
        , creatureType = "aberration"
        , hp = { kind = "literal", value = 76 }
        , initiative = { modifier = +0, score = 10 }
        , passivePerception = 14
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +3 }, { ability = "int", modifier = -3 }, { ability = "wis", modifier = +0 }, { ability = "cha", modifier = -3 } ]
        , immunities = { conditions = Some [ "poisoned" ], damageTypes = Some [ "poison" ] }
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 4 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
