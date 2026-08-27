let T = ./_stat_block_types.dhall
in  { challengeRating = 13
    , id = "stat_block_adult_brass_dragon"
    , kind = "statBlock"
    , name = "Adult Brass Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1166-1214" }
    , statBlock =
        { abilityScores = { str = 23, dex = 10, con = 21, int = 14, wis = 13, cha = 17 }
        , ac = { value = { kind = "literal", value = 18 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Sleep Breath or (B) Spellcasting to cast Scorching Ray.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +11, reachFeet = 10, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 10, flat = (Some +6), static = 17 }, rest = [ T.damage { damageType = "fire", dice = 1, dieSize = 8, flat = (None Integer), static = 4 } ] : List T.Effect } }) }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = (T.saveArea { name = "Fire Breath", ability = "dex", dc = 18, area = (T.line { lengthFeet = 60, widthFeet = 5 }), onFail = (T.damage { damageType = "fire", dice = 10, dieSize = 8, flat = (None Integer), static = 45 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            , T.textOnly { procedureOrdinal = 4, name = "Sleep Breath", description = "Constitution Saving Throw: DC 18, each creature in a 60-foot Cone. Failure: The target has the Incapacitated condition until the end of its next turn, at which point it repeats the save. Second Failure: The target has the Unconscious condition for 10 minutes. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it.", reason = "unsupported_action_shape" }
            , T.resourceExecutable { procedureOrdinal = 5, procedure = (T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 16 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noMaterialComponents, groups = { first = T.atWill { spells = { first = -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1203
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, rest = [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1203
                        T.spellRef { spellId = "minor_illusion", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1203
                        T.spellRef { spellId = "scorching_ray", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1203
                        T.spellRef { spellId = "shapechange", count = (None Natural), castAtLevel = (None Natural), restriction = (Some "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell") }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1203
                        T.spellRef { spellId = "speak_with_animals", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) } ] : List T.SpellRef } }, rest = [ T.limited { resourceOrdinals = { first = 2, rest = [  ] : List Natural }, spells = { first = -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1204
                        T.spellRef { spellId = "detect_thoughts", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }, rest = [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1204
                        T.spellRef { spellId = "control_weather", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) } ] : List T.SpellRef } } ] : List T.Group } }), resourceOrdinals = { first = 2, rest = [  ] : List Natural } }
            ]
        , legendaryActions =
            { uses = { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }
            , entries =
                [ T.textOnly { procedureOrdinal = 1, name = "Blazing Light", description = "The dragon uses Spellcasting to cast Scorching Ray.", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 2, name = "Pounce", description = "The dragon moves up to half its Speed, and it makes one Rend attack.", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 3, name = "Scorching Sands", description = "Dexterity Saving Throw: DC 16, one creature the dragon can see within 120 feet. Failure: 27 (6d8) Fire damage, and the target's Speed is halved until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }
                ]
            }
        , traits = [ T.trait { name = "Legendary Resistance (3/Day, or 4/Day in Lair)", description = "If the dragon fails a saving throw, it can choose to succeed instead.", effectKind = None Text } ]
        , alignment = { order = "chaotic", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 172 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "fire" ] }
        , initiative = { modifier = +10, score = 20 }
        , passivePerception = 21
        , savingThrowModifiers = [ { ability = "str", modifier = +6 }, { ability = "dex", modifier = +5 }, { ability = "con", modifier = +5 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +6 }, { ability = "cha", modifier = +3 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "history", modifier = 7 }, { skill = "perception", modifier = 11 }, { skill = "persuasion", modifier = 8 }, { skill = "stealth", modifier = 5 } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) }, T.resource { ordinal = 2, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
