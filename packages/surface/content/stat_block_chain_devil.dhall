let T = ./_stat_block_types.dhall
in  { challengeRating = 8
    , id = "stat_block_chain_devil"
    , kind = "statBlock"
    , name = "Chain Devil"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:40-75" }
    , statBlock =
        { abilityScores = { str = 18, dex = 15, con = 18, int = 11, wis = 12, cha = 14 }
        , ac = { value = { kind = "literal", value = 15 } }
        , actions =
            [ T.text 1 "Multiattack" "The devil makes two Chain attacks and uses Conjure Infernal Chain." "unsupported_action_shape"
            , T.exec 2
                (T.attack "Chain" "melee" "str" +7 (Some 10) (None T.Range) (None Text)
                  [ T.damage "slashing" 2 6 (Some +4) 11, T.conditionIfSize "grappled" "large" ]
                  (Some "If the target is a Large or smaller creature, it has the Grappled condition (escape DC 14) from one of two chains, and it has the Restrained condition until the grapple ends."))
            , T.text 3 "Conjure Infernal Chain" "The devil conjures a fiery chain to bind a creature. Dexterity Saving Throw: DC 15, one creature the devil can see within 60 feet. Failure: 9 (2d4 + 4) Fire damage, and the target has the Restrained condition until the end of the devil's next turn, at which point the chain disappears. If the target is Large or smaller, the devil moves the target up to 30 feet straight toward itself. Success: The chain disappears." "unsupported_action_shape"
            ]
        , reactions =
            [ T.text 1 "Unnerving Gaze" "Trigger: A creature the devil can see starts its turn within 30 feet of the devil and can see the devil. Response—Wisdom Saving Throw: DC 15, the triggering creature. Failure: The target has the Frightened condition until the end of its turn. Success: The target is immune to this devil's Unnerving Gaze for 24 hours." "unsupported_action_shape"
            ]
        , traits =
            [ T.trait "Diabolical Restoration" "If the devil dies outside the Nine Hells, its body disappears in sulfurous smoke, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Nine Hells."
            , T.trait "Magic Resistance" "The devil has Advantage on saving throws against spells and other magical effects."
            ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication =
            { kind = "spoken_and_understood"
            , languages = { kind = "named", languages = [ "Infernal" ] }
            , telepathy =
                Some
                  { rangeFeet = 120
                  , response = None Text
                  , requiresLanguageUnderstanding = None { kind : Text, languages : List Text }
                  }
            }
        , creatureType = "fiend"
        , creatureTypeTags = [ "devil" ]
        , hp = { kind = "literal", value = 85 }
        , immunities =
            { conditions = Some [ "poisoned" ]
            , damageTypes = Some [ "fire", "poison" ]
            }
        , initiative = { modifier = +5, score = 15 }
        , passivePerception = 11
        , resistances = { kind = "fixed", damageTypes = [ "bludgeoning", "cold", "piercing", "slashing" ] }
        , savingThrowModifiers =
            [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +7 }
            , { ability = "int", modifier = +0 }, { ability = "wis", modifier = +4 }, { ability = "cha", modifier = +2 }
            ]
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = Some "unimpeded_by_magical_darkness" } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        }
    }
