let T = ./_stat_block_types.dhall
in  { challengeRating = 16
    , id = "stat_block_adult_blue_dragon"
    , kind = "statBlock"
    , name = "Adult Blue Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:962-1008" }
    , statBlock =
        { abilityScores = { str = 25, dex = 10, con = 23, int = 16, wis = 15, cha = 20 }
        , ac = { value = { kind = "literal", value = 19 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Shatter.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +12, reachFeet = 10, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 8, flat = (Some +7), static = 16 }, rest = [ T.damage { damageType = "lightning", dice = 1, dieSize = 10, flat = (None Integer), static = 5 } ] : List T.Effect } }) }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.NonSpellProcedure.saveArea ({ name = "Lightning Breath", ability = "dex", dc = 19, area = (T.line { lengthFeet = 90, widthFeet = 5 }), onFail = (T.damage { damageType = "lightning", dice = 11, dieSize = 10, flat = (None Integer), static = 60 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            , T.executable { procedureOrdinal = 4, procedure = (T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 18 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noMaterialComponents, groups = { first = T.atWill { spells = { first = -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:997
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural) }, rest = [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:997
                        T.spellRef { spellId = "invisibility", count = (None Natural), castAtLevel = (None Natural) }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:997
                        T.spellRef { spellId = "mage_hand", count = (None Natural), castAtLevel = (None Natural) }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:997
                        T.spellRef { spellId = "shatter", count = (None Natural), castAtLevel = (None Natural) } ] : List T.SpellRef } }, rest = [ T.limited { resourceOrdinals = { first = 2, rest = [  ] : List Natural }, spells = { first = -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:998
                        T.spellRef { spellId = "scrying", count = (None Natural), castAtLevel = (None Natural) }, rest = [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:998
                        T.spellRef { spellId = "sending", count = (None Natural), castAtLevel = (None Natural) } ] : List T.SpellRef } } ] : List T.Group } }) }
            ]
        , legendaryActions =
            { uses = { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }
            , entries =
                [ T.textOnly { procedureOrdinal = 1, name = "Cloaked Flight", description = "The dragon uses Spellcasting to cast Invisibility on itself, and it can fly up to half its Fly Speed. The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 2, name = "Sonic Boom", description = "The dragon uses Spellcasting to cast Shatter. The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 3, name = "Tail Swipe", description = "The dragon makes one Rend attack.", reason = "unsupported_action_shape" }
                ]
            }
        , traits = [ T.trait { name = "Legendary Resistance (3/Day, or 4/Day in Lair)", description = "If the dragon fails a saving throw, it can choose to succeed instead.", effectKind = None Text } ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 212 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning" ] }
        , initiative = { modifier = +10, score = 20 }
        , passivePerception = 22
        , savingThrowModifiers = [ { ability = "str", modifier = +7 }, { ability = "dex", modifier = +5 }, { ability = "con", modifier = +6 }, { ability = "int", modifier = +3 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +5 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 12 }, { skill = "stealth", modifier = 5 } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) }, T.resource { ordinal = 2, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
