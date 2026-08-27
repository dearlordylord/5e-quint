let T = ./_stat_block_types.dhall
in  { challengeRating = 10
    , id = "stat_block_aboleth"
    , kind = "statBlock"
    , name = "Aboleth"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:5-59" }
    , statBlock =
        { abilityScores = { str = 21, dex = 9, con = 15, int = 18, wis = 15, cha = 18 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.text 1 "Multiattack" "The aboleth makes two Tentacle attacks and uses either Consume Memories or Dominate Mind if available." "unsupported_action_shape"
            , T.text 2 "Tentacle" "Melee Attack Roll: +9, reach 15 ft. Hit: 12 (2d6 + 5) Bludgeoning damage. If the target is a Large or smaller creature, it has the Grappled condition (escape DC 14) from one of four tentacles." "unsupported_action_shape"
            , T.text 3 "Consume Memories" "Intelligence Saving Throw: DC 16, one creature within 30 feet that is Charmed or Grappled by the aboleth. Failure: 10 (3d6) Psychic damage. Success: Half damage. Failure or Success: The aboleth gains the target's memories if the target is a Humanoid and is reduced to 0 Hit Points by this action." "unsupported_action_shape"
            , T.textSome 4 "Dominate Mind (2/Day)" "Wisdom Saving Throw: DC 16, one creature the aboleth can see within 30 feet. Failure: The target has the Charmed condition until the aboleth dies or is on a different plane of existence from the target. While Charmed, the target acts as an ally to the aboleth and is under its control while within 60 feet of it. In addition, the aboleth and the target can communicate telepathically with each other over any distance. The target repeats the save whenever it takes damage as well as after every 24 hours it spends at least 1 mile away from the aboleth, ending the effect on itself on a success." "unsupported_action_shape" [ 1 ]
            ]
        , legendaryActions =
            { uses = 3
            , entries =
                [ T.text 1 "Lash" "The aboleth makes one Tentacle attack." "unsupported_action_shape"
                , T.text 2 "Psychic Drain" "If the aboleth has at least one creature Charmed or Grappled, it uses Consume Memories and regains 5 (1d10) Hit Points." "unsupported_action_shape"
                ]
            }
        , traits =
            [ T.trait "Amphibious" "The aboleth can breathe air and water."
            , T.trait "Eldritch Restoration" "If destroyed, the aboleth gains a new body in 5d10 days, reviving with all its Hit Points in the Far Realm or another location chosen by the GM."
            , T.trait "Legendary Resistance (3/Day, or 4/Day in Lair)" "If the aboleth fails a saving throw, it can choose to succeed instead."
            , T.trait "Mucus Cloud" "While underwater, the aboleth is surrounded by mucus. Constitution Saving Throw: DC 14, each creature in a 5-foot Emanation originating from the aboleth at the end of the aboleth's turn. Failure: The target is cursed. Until the curse ends, the target's skin becomes slimy, the target can breathe air and water, and it can't regain Hit Points unless it is underwater. While the cursed creature is outside a body of water, the creature takes 6 (1d12) Acid damage at the end of every 10 minutes unless moisture is applied to its skin before those minutes have passed."
            , T.trait "Probing Telepathy" "If a creature the aboleth can see communicates telepathically with the aboleth, the aboleth learns the creature's greatest desires."
            ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication =
            { kind = "spoken_and_understood"
            , languages = { kind = "named", languages = [ "Deep Speech" ] }
            , telepathy = Some { rangeFeet = 120, response = None Text, requiresLanguageUnderstanding = None { kind : Text, languages : List Text } }
            }
        , creatureType = "aberration"
        , hp = { kind = "literal", value = 150 }
        , initiative = { modifier = +7, score = 17 }
        , passivePerception = 20
        , savingThrowModifiers = [ { ability = "str", modifier = +5 }, { ability = "dex", modifier = +3 }, { ability = "con", modifier = +6 }, { ability = "int", modifier = +8 }, { ability = "wis", modifier = +6 }, { ability = "cha", modifier = +4 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "history", modifier = 12 }, { skill = "perception", modifier = 10 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 10 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.daily 2) ]
        }
    }
