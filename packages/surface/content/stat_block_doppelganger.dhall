let T = ./_stat_block_types.dhall
in  { challengeRating = 3
    , id = "stat_block_doppelganger"
    , kind = "statBlock"
    , name = "Doppelganger"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:758-789" }
    , statBlock =
        { abilityScores = { str = 11, dex = 18, con = 14, int = 11, wis = 12, cha = 14 }
        , ac = { value = { kind = "literal", value = 14 } }
        , actions =
            [ T.text 1 "Multiattack" "The doppelganger makes two Slam attacks and uses Unsettling Visage if available." "unsupported_action_shape"
            , T.text 2 "Slam" "Melee Attack Roll: +6 (with Advantage during the first round of each combat), reach 5 ft. Hit: 11 (2d6 + 4) Bludgeoning damage." "unsupported_action_shape"
            , T.exec 3
                (T.spellcasting "Read Thoughts" "cha" (Some { kind = "fixed", dc = 12 }) (None { kind : Text, value : Integer }) T.noComponents
                  [ T.atWill
                      [ -- RAW: Monsters/Monsters-C-D.md:758-789 — Read Thoughts casts Detect Thoughts.
                        T.spellRef "detect_thoughts" (None Natural) (None Natural) (None Text)
                      ]
                  ])
            , T.textSome 4 "Unsettling Visage" "Wisdom Saving Throw: DC 12, each creature in a 15-foot Emanation originating from the doppelganger that can see the doppelganger. Failure: The target has the Frightened condition and repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically." "unsupported_action_shape" [ 1 ]
            ]
        , bonusActions =
            [ T.text 1 "Shape-Shift" "The doppelganger shape-shifts into a Medium or Small Humanoid, or it returns to its true form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed." "unsupported_action_shape"
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named_plus_other_languages", languages = [ "Common" ], additionalLanguages = 3 } }
        , creatureType = "monstrosity"
        , hp = { kind = "literal", value = 52 }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 11
        , savingThrowModifiers = [ { ability = "str", modifier = +0 }, { ability = "dex", modifier = +4 }, { ability = "con", modifier = +2 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +1 }, { ability = "cha", modifier = +2 } ]
        , immunities = { conditions = Some [ "charmed" ], damageTypes = None (List Text) }
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "deception", modifier = 6 }, { skill = "insight", modifier = 3 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 6) ]
        }
    }
