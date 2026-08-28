let T = ./_stat_block_types.dhall
in  { challengeRating = 21
    , id = "stat_block_ancient_black_dragon"
    , kind = "statBlock"
    , name = "Ancient Black Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:776-824" }
    , statBlock =
        { abilityScores = { str = 27, dex = 14, con = 25, int = 16, wis = 15, cha = 22 }
        , ac = { value = { kind = "literal", value = 22 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Acid Arrow (level 4 version).", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +15, reachFeet = 15, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 8, flat = (Some +8), static = 17 }, rest = [ T.damage { damageType = "acid", dice = 2, dieSize = 8, flat = (None Integer), static = 9 } ] : List T.Effect } }) }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.NonSpellProcedure.saveArea ({ name = "Acid Breath", ability = "dex", dc = 22, area = (T.line { lengthFeet = 90, widthFeet = 10 }), onFail = (T.damage { damageType = "acid", dice = 15, dieSize = 8, flat = (None Integer), static = 67 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            , T.executable { procedureOrdinal = 4, procedure = (T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 21 }), spellAttackBonus = (Some { kind = "literal", value = +13 }), components = T.noMaterialComponents, groups = { first = T.atWill { spells = { first = -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:813
                        T.spellRef { spellId = "acid_arrow", count = (None Natural), castAtLevel = (Some 4), restriction = (None Text) }, rest = [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:813
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:813
                        T.spellRef { spellId = "fear", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) } ] : List T.SpellRef } }, rest = [ T.limited { resourceOrdinals = { first = 2, rest = [  ] : List Natural }, spells = { first = -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:814
                        T.spellRef { spellId = "create_undead", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, rest = [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:814
                        T.spellRef { spellId = "speak_with_dead", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:814
                        T.spellRef { spellId = "vitriolic_sphere", count = (None Natural), castAtLevel = (Some 5), restriction = (None Text) } ] : List T.SpellRef } } ] : List T.Group } }) }
            ]
        , legendaryActions =
            { uses = { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }
            , entries =
                [ T.textOnly { procedureOrdinal = 1, name = "Cloud of Insects", description = "Dexterity Saving Throw: DC 21, one creature the dragon can see within 120 feet. Failure: 33 (6d10) Poison damage, and the target has Disadvantage on saving throws to maintain Concentration until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 2, name = "Frightful Presence", description = "The dragon uses Spellcasting to cast Fear. The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 3, name = "Pounce", description = "The dragon moves up to half its Speed, and it makes one Rend attack.", reason = "unsupported_action_shape" }
                ]
            }
        , traits =
            [ T.trait { name = "Amphibious", description = "The dragon can breathe air and water.", effectKind = None Text }
            , T.trait { name = "Legendary Resistance (4/Day, or 5/Day in Lair)", description = "If the dragon fails a saving throw, it can choose to succeed instead.", effectKind = None Text }
            ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 367 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , initiative = { modifier = +16, score = 26 }
        , passivePerception = 26
        , savingThrowModifiers = [ { ability = "str", modifier = +8 }, { ability = "dex", modifier = +9 }, { ability = "con", modifier = +7 }, { ability = "int", modifier = +3 }, { ability = "wis", modifier = +9 }, { ability = "cha", modifier = +6 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 16 }, { skill = "stealth", modifier = 9 } ]
        , size = "gargantuan"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) }, T.resource { ordinal = 2, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
