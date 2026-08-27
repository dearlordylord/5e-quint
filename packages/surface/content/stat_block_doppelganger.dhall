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
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The doppelganger makes two Slam attacks and uses Unsettling Visage if available.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 2, name = "Slam", description = "Melee Attack Roll: +6 (with Advantage during the first round of each combat), reach 5 ft. Hit: 11 (2d6 + 4) Bludgeoning damage.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 3, procedure = T.spellcasting { name = "Read Thoughts", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 12 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noComponents, groups = [ T.atWill { spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:758-789 — Read Thoughts casts Detect Thoughts.
                        T.spellRef { spellId = "detect_thoughts", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  ] } }
            , T.resourceTextOnly { procedureOrdinal = 4, name = "Unsettling Visage", description = "Wisdom Saving Throw: DC 12, each creature in a 15-foot Emanation originating from the doppelganger that can see the doppelganger. Failure: The target has the Frightened condition and repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically.", reason = "unsupported_action_shape", resourceOrdinals = [ 1 ] }
            ]
        , bonusActions =
            [ T.textOnly { procedureOrdinal = 1, name = "Shape-Shift", description = "The doppelganger shape-shifts into a Medium or Small Humanoid, or it returns to its true form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed.", reason = "unsupported_action_shape" }
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
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 6 }) } ]
        }
    }
