let T = ./_stat_block_types.dhall
in  { challengeRating = 20
    , id = "stat_block_ancient_brass_dragon"
    , kind = "statBlock"
    , name = "Ancient Brass Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1218-1266" }
    , statBlock =
        { abilityScores = { str = 27, dex = 10, con = 25, int = 16, wis = 15, cha = 22 }
        , ac = { value = { kind = "literal", value = 20 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Sleep Breath or (B) Spellcasting to cast Scorching Ray (level 3 version).", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = (T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +14, reachFeet = 15, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 10, flat = (Some +8), static = 19 }, rest = [ T.damage { damageType = "fire", dice = 2, dieSize = 6, flat = (None Integer), static = 7 } ] : List T.Effect } }) }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.NonSpellProcedure.saveArea ({ name = "Fire Breath", ability = "dex", dc = 21, area = (T.line { lengthFeet = 90, widthFeet = 5 }), onFail = (T.damage { damageType = "fire", dice = 13, dieSize = 8, flat = (None Integer), static = 58 }), onSuccess = { kind = "half_damage" } }), resourceOrdinals = { first = 1, rest = [  ] : List Natural } }
            , T.textOnly { procedureOrdinal = 4, name = "Sleep Breath", description = "Constitution Saving Throw: DC 21, each creature in a 90-foot Cone. Failure: The target has the Incapacitated condition until the end of its next turn, at which point it repeats the save. Second Failure: The target has the Unconscious condition for 10 minutes. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 5, procedure = (T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 20 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noMaterialComponents, groups = { first = T.atWill { spells = { first = -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1255
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural) }, rest = [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1255
                        T.spellRef { spellId = "minor_illusion", count = (None Natural), castAtLevel = (None Natural) }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1255
                        T.spellRef { spellId = "scorching_ray", count = (None Natural), castAtLevel = (Some 3) }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1255
                        T.restrictedSpellRef { spellId = "shapechange", count = (None Natural), castAtLevel = (None Natural), restriction = { authoredExpression = "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell", deltas = { first = T.beastOrHumanoidTransformationForms, rest = [ T.noTransformationTemporaryHitPoints, T.noConcentrationRequirement ] : List T.InvocationDelta } } }, -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1255
                        T.spellRef { spellId = "speak_with_animals", count = (None Natural), castAtLevel = (None Natural) } ] : List T.SpellRef } }, rest = [ T.limited { resourceOrdinals = { first = 2, rest = [  ] : List Natural }, spells = { first = -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1256
                        T.spellRef { spellId = "control_weather", count = (None Natural), castAtLevel = (None Natural) }, rest = [ -- RAW: .references/srd-5.2.1/Monsters/Monsters-A-B.md:1256
                        T.spellRef { spellId = "detect_thoughts", count = (None Natural), castAtLevel = (None Natural) } ] : List T.SpellRef } } ] : List T.Group } }) }
            ]
        , legendaryActions =
            { uses = { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }
            , entries =
                [ T.textOnly { procedureOrdinal = 1, name = "Blazing Light", description = "The dragon uses Spellcasting to cast Scorching Ray (level 3 version).", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 2, name = "Pounce", description = "The dragon moves up to half its Speed, and it makes one Rend attack.", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 3, name = "Scorching Sands", description = "Dexterity Saving Throw: DC 20, one creature the dragon can see within 120 feet. Failure: 36 (8d8) Fire damage, and the target's Speed is halved until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }
                ]
            }
        , traits = [ T.trait { name = "Legendary Resistance (4/Day, or 5/Day in Lair)", description = "If the dragon fails a saving throw, it can choose to succeed instead.", effectKind = None Text } ]
        , alignment = { order = "chaotic", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 332 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "fire" ] }
        , initiative = { modifier = +12, score = 22 }
        , passivePerception = 24
        , savingThrowModifiers = [ { ability = "str", modifier = +8 }, { ability = "dex", modifier = +7 }, { ability = "con", modifier = +7 }, { ability = "int", modifier = +3 }, { ability = "wis", modifier = +9 }, { ability = "cha", modifier = +6 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "history", modifier = 9 }, { skill = "perception", modifier = 14 }, { skill = "persuasion", modifier = 12 }, { skill = "stealth", modifier = 6 } ]
        , size = "gargantuan"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "burrow", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) }, T.resource { ordinal = 2, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
