let T = ./_stat_block_types.dhall
in  { challengeRating = 14
    , id = "stat_block_adult_copper_dragon"
    , kind = "statBlock"
    , name = "Adult Copper Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:379-425" }
    , statBlock =
        { abilityScores = { str = 23, dex = 12, con = 21, int = 18, wis = 15, cha = 18 }
        , ac = { value = { kind = "literal", value = 18 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Slowing Breath or (B) Spellcasting to cast Mind Spike (level 4 version).", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +11, reachFeet = 10, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 10, flat = (Some +6), static = 17 }, rest = [ T.damage { damageType = "acid", dice = 1, dieSize = 8, flat = (None Integer), static = 4 } ] } } }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.saveArea { name = "Acid Breath", ability = "dex", dc = 18, area = (T.line { lengthFeet = 60, widthFeet = 5 }), onFail = (T.damage { damageType = "acid", dice = 12, dieSize = 8, flat = (None Integer), static = 54 }), onSuccess = { kind = "half_damage" } }, resourceOrdinals = { first = 1, rest = [] : List Natural } }
            , T.textOnly { procedureOrdinal = 4, name = "Slowing Breath", description = "Constitution Saving Throw: DC 18, each creature in a 60-foot Cone. Failure: The target can't take Reactions; its Speed is halved; and it can take either an action or a Bonus Action on its turn, not both. This effect lasts until the end of its next turn.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 5, procedure = T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 17 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noMaterialComponents, groups = { first = T.atWill { spells =
                      { first = -- RAW: Monsters/Monsters-C-D.md:379-425 — At Will: Detect Magic.
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , rest = [ -- RAW: Monsters/Monsters-C-D.md:379-425 — At Will: Mind Spike.
                        T.spellRef { spellId = "mind_spike", count = (None Natural), castAtLevel = (Some 4), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:379-425 — At Will: Minor Illusion.
                        T.spellRef { spellId = "minor_illusion", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:379-425 — At Will: Shapechange, Beast or Humanoid form only with the printed restrictions.
                        T.spellRef { spellId = "shapechange", count = (None Natural), castAtLevel = (None Natural), restriction = (Some "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell") }
                      ] } }
                  , rest = [ T.limited { resourceOrdinals = { first = 2 , rest = [] : List Natural }, spells =
                      { first = -- RAW: Monsters/Monsters-C-D.md:379-425 — 1/Day Each: Greater Restoration.
                        T.spellRef { spellId = "greater_restoration", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , rest = [ -- RAW: Monsters/Monsters-C-D.md:379-425 — 1/Day Each: Major Image.
                        T.spellRef { spellId = "major_image", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] } }
                  ] } } }
            ]
        , legendaryActions = { uses = { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }, entries = [ T.textOnly { procedureOrdinal = 1, name = "Giggling Magic", description = "Charisma Saving Throw: DC 17, one creature the dragon can see within 90 feet. Failure: 24 (7d6) Psychic damage. Until the end of its next turn, the target rolls 1d6 whenever it makes an ability check or attack roll and subtracts the number rolled from the D20 Test. Failure or Success: The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }, T.textOnly { procedureOrdinal = 2, name = "Mind Jolt", description = "The dragon uses Spellcasting to cast Mind Spike (level 4 version). The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }, T.textOnly { procedureOrdinal = 3, name = "Pounce", description = "The dragon moves up to half its Speed, and it makes one Rend attack.", reason = "unsupported_action_shape" } ] }
        , traits = [ T.trait { name = "Legendary Resistance (3/Day, or 4/Day in Lair)", description = "If the dragon fails a saving throw, it can choose to succeed instead.", effectKind = (None Text) } ]
        , alignment = { order = "chaotic", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 184 }
        , initiative = { modifier = +11, score = 21 }
        , passivePerception = 22
        , savingThrowModifiers = [ { ability = "str", modifier = +6 }, { ability = "dex", modifier = +6 }, { ability = "con", modifier = +5 }, { ability = "int", modifier = +4 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +4 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "deception", modifier = 9 }, { skill = "perception", modifier = 12 }, { skill = "stealth", modifier = 6 } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) }, T.resource { ordinal = 2, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
