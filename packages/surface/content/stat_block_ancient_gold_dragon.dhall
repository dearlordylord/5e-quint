let T = ./_stat_block_types.dhall
in  { challengeRating = 24
    , id = "stat_block_ancient_gold_dragon"
    , kind = "statBlock"
    , name = "Ancient Gold Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:913-961" }
    , statBlock =
        { abilityScores = { str = 30, dex = 14, con = 29, int = 18, wis = 17, cha = 28 }
        , ac = { value = { kind = "literal", value = 22 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Spellcasting to cast Guiding Bolt (level 4 version) or (B) Weakening Breath.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +17, reachFeet = 15, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 8, flat = (Some +10), static = 19 }, rest = [ T.damage { damageType = "fire", dice = 2, dieSize = 8, flat = (None Integer), static = 9 } ] } } }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.saveArea { name = "Fire Breath (Recharge 5–6)", ability = "dex", dc = 24, area = (T.cone { lengthFeet = 90 }), onFail = (T.damage { damageType = "fire", dice = 13, dieSize = 10, flat = (None Integer), static = 71 }), onSuccess = { kind = "half_damage" } }, resourceOrdinals = { first = 1, rest = [] : List Natural } }
            , T.executable { procedureOrdinal = 4, procedure = T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 24 }), spellAttackBonus = (Some { kind = "literal", value = +16 }), components = T.noMaterialComponents, groups =
                  { first = T.atWill { spells =
                      { first = -- RAW: Monsters/Monsters-E-G.md:948 — At Will: Detect Magic.
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , rest = [ -- RAW: Monsters/Monsters-E-G.md:948 — At Will: Guiding Bolt (level 4 version).
                        T.spellRef { spellId = "guiding_bolt", count = (None Natural), castAtLevel = (Some 4), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-E-G.md:948 — At Will: Shapechange with the printed form and maintenance restrictions.
                        T.spellRef { spellId = "shapechange", count = (None Natural), castAtLevel = (None Natural), restriction = (Some "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell") }
                      ] } }
                  , rest = [ T.limited { resourceOrdinals = { first = 2, rest = [] : List Natural }, spells =
                      { first = -- RAW: Monsters/Monsters-E-G.md:949 — 1/Day Each: Flame Strike (level 6 version).
                        T.spellRef { spellId = "flame_strike", count = (None Natural), castAtLevel = (Some 6), restriction = (None Text) }
                      , rest = [ -- RAW: Monsters/Monsters-E-G.md:949 — 1/Day Each: Word of Recall.
                        T.spellRef { spellId = "word_of_recall", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-E-G.md:949 — 1/Day Each: Zone of Truth.
                        T.spellRef { spellId = "zone_of_truth", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] } }
                  ] } } }
            , T.textOnly { procedureOrdinal = 5, name = "Weakening Breath", description = "Strength Saving Throw: DC 24, each creature that isn't currently affected by this breath in a 90-foot Cone. Failure: The target has Disadvantage on Strength-based D20 Tests and subtracts 5 (1d10) from its damage rolls. It repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically.", reason = "unsupported_action_shape" }
            ]
        , legendaryActions = { uses = { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }, entries = [ T.textOnly { procedureOrdinal = 1, name = "Banish", description = "Charisma Saving Throw: DC 24, one creature the dragon can see within 120 feet. Failure: 24 (7d6) Force damage, and the target has the Incapacitated condition and is transported to a harmless demiplane until the start of the dragon's next turn, at which point it reappears in an unoccupied space of the dragon's choice within 120 feet of the dragon. Failure or Success: The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }, T.textOnly { procedureOrdinal = 2, name = "Guiding Light", description = "The dragon uses Spellcasting to cast Guiding Bolt (level 4 version).", reason = "unsupported_action_shape" }, T.textOnly { procedureOrdinal = 3, name = "Pounce", description = "The dragon moves up to half its Speed, and it makes one Rend attack.", reason = "unsupported_action_shape" } ] }
        , traits = [ T.trait { name = "Amphibious", description = "The dragon can breathe air and water.", effectKind = (None Text) }, T.trait { name = "Legendary Resistance (4/Day, or 5/Day in Lair)", description = "If the dragon fails a saving throw, it can choose to succeed instead.", effectKind = (None Text) } ]
        , alignment = { order = "lawful", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 546 }
        , initiative = { modifier = +16, score = 26 }
        , passivePerception = 27
        , savingThrowModifiers = [ { ability = "str", modifier = +10 }, { ability = "dex", modifier = +9 }, { ability = "con", modifier = +9 }, { ability = "wis", modifier = +10 }, { ability = "cha", modifier = +9 } ]
        , skillModifiers = [ { skill = "insight", modifier = 10 }, { skill = "perception", modifier = 17 }, { skill = "persuasion", modifier = 16 }, { skill = "stealth", modifier = 9 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "fire" ] }
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , size = "gargantuan"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) }, T.resource { ordinal = 2, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
