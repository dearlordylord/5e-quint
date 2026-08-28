let T = ./_stat_block_types.dhall
in  { challengeRating = 17
    , id = "stat_block_adult_gold_dragon"
    , kind = "statBlock"
    , name = "Adult Gold Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:861-909" }
    , statBlock =
        { abilityScores = { str = 27, dex = 14, con = 25, int = 16, wis = 15, cha = 24 }
        , ac = { value = { kind = "literal", value = 19 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Spellcasting to cast Guiding Bolt (level 2 version) or (B) Weakening Breath.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +14, reachFeet = 10, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 8, flat = (Some +8), static = 17 }, rest = [ T.damage { damageType = "fire", dice = 1, dieSize = 8, flat = (None Integer), static = 4 } ] } } }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.NonSpellProcedure.saveArea { name = "Fire Breath (Recharge 5–6)", ability = "dex", dc = 21, area = (T.cone { lengthFeet = 60 }), onFail = (T.damage { damageType = "fire", dice = 12, dieSize = 10, flat = (None Integer), static = 66 }), onSuccess = { kind = "half_damage" } }, resourceOrdinals = { first = 1, rest = [] : List Natural } }
            , T.executable { procedureOrdinal = 4, procedure = T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 21 }), spellAttackBonus = (Some { kind = "literal", value = +13 }), components = T.noMaterialComponents, groups =
                  { first = T.atWill { spells =
                      { first = -- RAW: Monsters/Monsters-E-G.md:896 — At Will: Detect Magic.
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural) }
                      , rest = [ -- RAW: Monsters/Monsters-E-G.md:896 — At Will: Guiding Bolt (level 2 version).
                        T.spellRef { spellId = "guiding_bolt", count = (None Natural), castAtLevel = (Some 2) }
                      , -- RAW: Monsters/Monsters-E-G.md:896 — At Will: Shapechange with the printed form and maintenance restrictions.
                        T.restrictedSpellRef { spellId = "shapechange", count = (None Natural), castAtLevel = (None Natural), restriction = { authoredExpression = "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell", deltas = { first = T.beastOrHumanoidTransformationForms, rest = [ T.noTransformationTemporaryHitPoints, T.noConcentrationRequirement ] : List T.InvocationDelta } } }
                      ] } }
                  , rest = [ T.limited { resourceOrdinals = { first = 2, rest = [] : List Natural }, spells =
                      { first = -- RAW: Monsters/Monsters-E-G.md:897 — 1/Day Each: Flame Strike.
                        T.spellRef { spellId = "flame_strike", count = (None Natural), castAtLevel = (None Natural) }
                      , rest = [ -- RAW: Monsters/Monsters-E-G.md:897 — 1/Day Each: Zone of Truth.
                        T.spellRef { spellId = "zone_of_truth", count = (None Natural), castAtLevel = (None Natural) }
                      ] } }
                  ] } } }
            , T.textOnly { procedureOrdinal = 5, name = "Weakening Breath", description = "Strength Saving Throw: DC 21, each creature that isn't currently affected by this breath in a 60-foot Cone. Failure: The target has Disadvantage on Strength-based D20 Tests and subtracts 3 (1d6) from its damage rolls. It repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically.", reason = "unsupported_action_shape" }
            ]
        , legendaryActions = { uses = { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }, entries = [ T.textOnly { procedureOrdinal = 1, name = "Banish", description = "Charisma Saving Throw: DC 21, one creature the dragon can see within 120 feet. Failure: 10 (3d6) Force damage, and the target has the Incapacitated condition and is transported to a harmless demiplane until the start of the dragon's next turn, at which point it reappears in an unoccupied space of the dragon's choice within 120 feet of the dragon. Failure or Success: The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }, T.textOnly { procedureOrdinal = 2, name = "Guiding Light", description = "The dragon uses Spellcasting to cast Guiding Bolt (level 2 version).", reason = "unsupported_action_shape" }, T.textOnly { procedureOrdinal = 3, name = "Pounce", description = "The dragon moves up to half its Speed, and it makes one Rend attack.", reason = "unsupported_action_shape" } ] }
        , traits = [ T.trait { name = "Amphibious", description = "The dragon can breathe air and water.", effectKind = (None Text) }, T.trait { name = "Legendary Resistance (3/Day, or 4/Day in Lair)", description = "If the dragon fails a saving throw, it can choose to succeed instead.", effectKind = (None Text) } ]
        , alignment = { order = "lawful", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 243 }
        , initiative = { modifier = +14, score = 24 }
        , passivePerception = 24
        , savingThrowModifiers = [ { ability = "str", modifier = +8 }, { ability = "dex", modifier = +8 }, { ability = "con", modifier = +7 }, { ability = "wis", modifier = +8 }, { ability = "cha", modifier = +7 } ]
        , skillModifiers = [ { skill = "insight", modifier = 8 }, { skill = "perception", modifier = 14 }, { skill = "persuasion", modifier = 13 }, { skill = "stealth", modifier = 8 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "fire" ] }
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) }, T.resource { ordinal = 2, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
