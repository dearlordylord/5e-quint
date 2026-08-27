let T = ./_stat_block_types.dhall
in  { challengeRating = 9
    , id = "stat_block_clay_golem"
    , kind = "statBlock"
    , name = "Clay Golem"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:146-183" }
    , statBlock =
        { abilityScores = { str = 20, dex = 9, con = 18, int = 3, wis = 8, cha = 1 }
        , ac = { value = { kind = "literal", value = 14 } }
        , actions =
            [ T.text 1 "Multiattack" "The golem makes two Slam attacks, or it makes three Slam attacks if it used Hasten this turn." "unsupported_action_shape"
            , T.exec 2 (T.attack "Slam" "melee" "str" +9 (Some 5) (None T.Range) (None Text) [ T.damage "bludgeoning" 1 10 (Some +5) 10, T.damage "acid" 1 12 (None Integer) 6 ] (Some "The target's Hit Point maximum decreases by an amount equal to the Acid damage taken."))
            ]
        , bonusActions =
            [ T.textSome 1 "Hasten" "The golem takes the Dash and Disengage actions." "unsupported_action_shape" [ 1 ]
            ]
        , traits = [ T.trait "Acid Absorption" "Whenever the golem is subjected to Acid damage, it takes no damage and instead regains a number of Hit Points equal to the Acid damage dealt.", T.trait "Berserk" "Whenever the golem starts its turn Bloodied, roll 1d6. On a 6, the golem goes berserk. On each of its turns while berserk, the golem attacks the nearest creature it can see. If no creature is near enough to move to and attack, the golem attacks an object. Once the golem goes berserk, it continues to be berserk until it is destroyed or it is no longer Bloodied.", T.trait "Immutable Form" "The golem can't shape-shift.", T.trait "Magic Resistance" "The golem has Advantage on saving throws against spells and other magical effects." ]
        , alignment = "unaligned"
        , communication = { kind = "spoken_and_understood", languages = { kind = "named_plus_other_languages", languages = [ "Common" ], additionalLanguages = 1 } }
        , creatureType = "construct"
        , hp = { kind = "literal", value = 123 }
        , initiative = { modifier = +3, score = 13 }
        , passivePerception = 9
        , savingThrowModifiers = [ { ability = "str", modifier = +5 }, { ability = "dex", modifier = -1 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = -4 }, { ability = "wis", modifier = -1 }, { ability = "cha", modifier = -5 } ]
        , resistances = { kind = "fixed", damageTypes = [ "bludgeoning", "piercing", "slashing" ] }
        , immunities = { conditions = Some [ "charmed", "exhaustion", "frightened", "paralyzed", "petrified", "poisoned" ], damageTypes = Some [ "acid", "poison", "psychic" ] }
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource 1 "shared" (T.recharge 5) ]
        }
    }
