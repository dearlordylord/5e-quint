let T = ./_stat_block_types.dhall
in  { challengeRating = 14
    , id = "stat_block_adult_black_dragon"
    , kind = "statBlock"
    , name = "Adult Black Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:724-772" }
    , statBlock =
        { abilityScores = { str = 23, dex = 14, con = 21, int = 14, wis = 13, cha = 19 }
        , ac = { value = { kind = "literal", value = 19 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Acid Arrow (level 3 version).", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +11, reachFeet = 10, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 6, flat = (Some +6), static = 13 }, rest = [ T.damage { damageType = "acid", dice = 1, dieSize = 8, flat = (None Integer), static = 4 } ] : List T.Effect } }) }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = (T.saveArea { name = "Acid Breath", ability = "dex", dc = 18, area = (T.line { lengthFeet = 60, widthFeet = 5 }), onFail = (T.damage { damageType = "acid", dice = 12, dieSize = 8, flat = (None Integer), static = 54 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            , T.resourceExecutable { procedureOrdinal = 4, procedure = (T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 17 }), spellAttackBonus = (Some { kind = "literal", value = +9 }), components = T.noMaterialComponents, groups = { first = T.atWill { spells = { first = -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:761
                        T.spellRef { spellId = "acid_arrow", count = (None Natural), castAtLevel = (Some 3), restriction = (None Text) }, rest = [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:761
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:761
                        T.spellRef { spellId = "fear", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) } ] : List T.SpellRef } }, rest = [ T.limited { resourceOrdinals = { first = 2, rest = [  ] : List Natural }, spells = { first = -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:762
                        T.spellRef { spellId = "speak_with_dead", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, rest = [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:762
                        T.spellRef { spellId = "vitriolic_sphere", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) } ] : List T.SpellRef } } ] : List T.Group } }), resourceOrdinals = { first = 2, rest = [  ] : List Natural } }
            ]
        , legendaryActions =
            { uses = { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }
            , entries =
                [ T.textOnly { procedureOrdinal = 1, name = "Cloud of Insects", description = "Dexterity Saving Throw: DC 17, one creature the dragon can see within 120 feet. Failure: 22 (4d10) Poison damage, and the target has Disadvantage on saving throws to maintain Concentration until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 2, name = "Frightful Presence", description = "The dragon uses Spellcasting to cast Fear. The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 3, name = "Pounce", description = "The dragon moves up to half its Speed, and it makes one Rend attack.", reason = "unsupported_action_shape" }
                ]
            }
        , traits =
            [ T.trait { name = "Amphibious", description = "The dragon can breathe air and water.", effectKind = None Text }
            , T.trait { name = "Legendary Resistance (3/Day, or 4/Day in Lair)", description = "If the dragon fails a saving throw, it can choose to succeed instead.", effectKind = None Text }
            ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 195 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , initiative = { modifier = +12, score = 22 }
        , passivePerception = 21
        , savingThrowModifiers = [ { ability = "str", modifier = +6 }, { ability = "dex", modifier = +7 }, { ability = "con", modifier = +5 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +6 }, { ability = "cha", modifier = +4 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 11 }, { skill = "stealth", modifier = 7 } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) }, T.resource { ordinal = 2, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
