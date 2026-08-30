let T = ./_stat_block_types.dhall
in  { challengeRating = 9
    , id = "stat_block_bone_devil"
    , kind = "statBlock"
    , name = "Bone Devil"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1062-1096" }
    , statBlock =
        { abilityScores = { str = 18, dex = 16, con = 18, int = 13, wis = 14, cha = 16 }
        , ac = { value = { kind = "literal", value = 16 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The devil makes two Claw attacks and one Infernal Sting attack.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Claw", attackAbility = "str", attackBonus = +8, reachFeet = 10, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 8, flat = (Some +4), static = 13 }, rest = [  ] : List T.Effect } }) }
            , T.textOnly { procedureOrdinal = 3, name = "Infernal Sting", description = "Melee Attack Roll: +8, reach 10 ft. Hit: 15 (2d10 + 4) Piercing damage plus 18 (4d8) Poison damage, and the target has the Poisoned condition until the start of the devil's next turn. While Poisoned, the target can't regain Hit Points.", reason = "unsupported_action_shape" }
            ]
        , traits =
            [ T.trait { name = "Diabolical Restoration", description = "If the devil dies outside the Nine Hells, its body disappears in sulfurous smoke, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Nine Hells.", effectKind = None Text }
            , T.trait { name = "Magic Resistance", description = "The devil has Advantage on saving throws against spells and other magical effects.", effectKind = None Text }
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
