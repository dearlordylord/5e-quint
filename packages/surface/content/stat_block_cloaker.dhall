let T = ./_stat_block_types.dhall
in  { challengeRating = 8
    , id = "stat_block_cloaker"
    , kind = "statBlock"
    , name = "Cloaker"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:187-224" }
    , statBlock =
        { abilityScores = { str = 17, dex = 15, con = 12, int = 13, wis = 14, cha = 7 }
        , ac = { value = { kind = "literal", value = 14 } }
        , actions =
            [ T.text 1 "Multiattack" "The cloaker makes one Attach attack and two Tail attacks." "unsupported_action_shape"
            , T.exec 2 (T.attack "Attach" "melee" "str" +6 (Some 5) (None T.Range) (None Text) [ T.damage "piercing" 3 6 (Some +3) 13, T.conditionIfSize "blinded" "large" ] (Some "If the target is a Large or smaller creature, the cloaker attaches to it. While the cloaker is attached, the target has the Blinded condition, and the cloaker can't make Attach attacks against other targets. In addition, the cloaker halves the damage it takes (round down), and the target takes the same amount of damage. The cloaker can detach itself by spending 5 feet of movement. The target or a creature within 5 feet of it can take an action to try to detach the cloaker, doing so by succeeding on a DC 14 Strength (Athletics) check."))
            , T.exec 3 (T.attack "Tail" "melee" "str" +6 (Some 10) (None T.Range) (None Text) [ T.damage "slashing" 1 10 (Some +3) 8 ] (None Text))
            ]
        , bonusActions =
            [ T.text 1 "Moan" "Wisdom Saving Throw: DC 13, each creature in a 60-foot Emanation originating from the cloaker. Failure: The target has the Frightened condition until the end of the cloaker's next turn. Success: The target is immune to this cloaker's Moan for the next 24 hours." "unsupported_action_shape"
            , T.textSome 2 "Phantasms" "The cloaker casts the Mirror Image spell, requiring no spell components and using Wisdom as the spellcasting ability. The spell ends early if the cloaker starts or ends its turn in Bright Light." "unsupported_action_shape" [ 1 ]
            ]
        , traits = [ T.trait "Light Sensitivity" "While in Bright Light, the cloaker has Disadvantage on attack rolls." ]
        , alignment = { order = "chaotic", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Deep Speech", "Undercommon" ] } }
        , creatureType = "aberration"
        , hp = { kind = "literal", value = 91 }
        , initiative = { modifier = +5, score = 15 }
        , passivePerception = 12
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = -2 } ]
        , immunities = { conditions = Some [ "frightened" ], damageTypes = None (List Text) }
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "stealth", modifier = 5 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 10 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.rest) ]
        }
    }
