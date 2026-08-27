let T = ./_stat_block_types.dhall
in  { challengeRating = 23
    , id = "stat_block_ancient_blue_dragon"
    , kind = "statBlock"
    , name = "Ancient Blue Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1012-1058" }
    , statBlock =
        { abilityScores = { str = 29, dex = 10, con = 27, int = 18, wis = 17, cha = 25 }
        , ac = { value = { kind = "literal", value = 22 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Shatter (level 3 version).", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +16, reachFeet = 15, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 8, flat = (Some +9), static = 18 }, rest = [ T.damage { damageType = "lightning", dice = 2, dieSize = 10, flat = (None Integer), static = 11 } ] : List T.Effect } }) }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = (T.saveArea { name = "Lightning Breath", ability = "dex", dc = 23, area = (T.line { lengthFeet = 120, widthFeet = 10 }), onFail = (T.damage { damageType = "lightning", dice = 16, dieSize = 10, flat = (None Integer), static = 88 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            , T.resourceExecutable { procedureOrdinal = 4, procedure = (T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 22 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noMaterialComponents, groups = { first = T.atWill { spells = { first = -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1047
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, rest = [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1047
                        T.spellRef { spellId = "invisibility", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1047
                        T.spellRef { spellId = "mage_hand", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1047
                        T.spellRef { spellId = "shatter", count = (None Natural), castAtLevel = (Some 3), restriction = (None Text) } ] : List T.SpellRef } }, rest = [ T.limited { resourceOrdinals = { first = 2, rest = [  ] : List Natural }, spells = { first = -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1048
                        T.spellRef { spellId = "scrying", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, rest = [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1048
                        T.spellRef { spellId = "sending", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) } ] : List T.SpellRef } } ] : List T.Group } }), resourceOrdinals = { first = 2, rest = [  ] : List Natural } }
            ]
        , legendaryActions =
            { uses = { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }
            , entries =
                [ T.textOnly { procedureOrdinal = 1, name = "Cloaked Flight", description = "The dragon uses Spellcasting to cast Invisibility on itself, and it can fly up to half its Fly Speed. The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 2, name = "Sonic Boom", description = "The dragon uses Spellcasting to cast Shatter (level 3 version). The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 3, name = "Tail Swipe", description = "The dragon makes one Rend attack.", reason = "unsupported_action_shape" }
                ]
            }
        , traits = [ T.trait { name = "Legendary Resistance (4/Day, or 5/Day in Lair)", description = "If the dragon fails a saving throw, it can choose to succeed instead.", effectKind = None Text } ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 481 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning" ] }
        , initiative = { modifier = +14, score = 24 }
        , passivePerception = 27
        , savingThrowModifiers = [ { ability = "str", modifier = +9 }, { ability = "dex", modifier = +7 }, { ability = "con", modifier = +8 }, { ability = "int", modifier = +4 }, { ability = "wis", modifier = +10 }, { ability = "cha", modifier = +7 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 17 }, { skill = "stealth", modifier = 7 } ]
        , size = "gargantuan"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) }, T.resource { ordinal = 2, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
