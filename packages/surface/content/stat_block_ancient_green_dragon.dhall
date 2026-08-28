let T = ./_stat_block_types.dhall
in  { challengeRating = 22
    , id = "stat_block_ancient_green_dragon"
    , kind = "statBlock"
    , name = "Ancient Green Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:1148-1194" }
    , statBlock =
        { abilityScores = { str = 27, dex = 12, con = 25, int = 20, wis = 17, cha = 22 }
        , ac = { value = { kind = "literal", value = 21 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Mind Spike (level 5 version).", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +15, reachFeet = 15, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 8, flat = (Some +8), static = 17 }, rest = [ T.damage { damageType = "poison", dice = 3, dieSize = 6, flat = (None Integer), static = 10 } ] } } }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.NonSpellProcedure.saveArea { name = "Poison Breath (Recharge 5–6)", ability = "con", dc = 22, area = (T.cone { lengthFeet = 90 }), onFail = (T.damage { damageType = "poison", dice = 22, dieSize = 6, flat = (None Integer), static = 77 }), onSuccess = { kind = "half_damage" } }, resourceOrdinals = { first = 1, rest = [] : List Natural } }
            , T.executable { procedureOrdinal = 4, procedure = T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 21 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noMaterialComponents, groups =
                  { first = T.atWill { spells =
                      { first = -- RAW: Monsters/Monsters-E-G.md:1183 — At Will: Detect Magic.
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , rest = [ -- RAW: Monsters/Monsters-E-G.md:1183 — At Will: Mind Spike (level 5 version).
                        T.spellRef { spellId = "mind_spike", count = (None Natural), castAtLevel = (Some 5), restriction = (None Text) }
                      ] } }
                  , rest = [ T.limited { resourceOrdinals = { first = 2, rest = [] : List Natural }, spells =
                      { first = -- RAW: Monsters/Monsters-E-G.md:1184 — 1/Day Each: Geas.
                        T.spellRef { spellId = "geas", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , rest = [ -- RAW: Monsters/Monsters-E-G.md:1184 — 1/Day Each: Modify Memory.
                        T.spellRef { spellId = "modify_memory", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] } }
                  ] } } }
            ]
        , legendaryActions = { uses = { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }, entries = [ T.textOnly { procedureOrdinal = 1, name = "Mind Invasion", description = "The dragon uses Spellcasting to cast Mind Spike (level 5 version).", reason = "unsupported_action_shape" }, T.textOnly { procedureOrdinal = 2, name = "Noxious Miasma", description = "Constitution Saving Throw: DC 21, each creature in a 30-foot-radius Sphere centered on a point the dragon can see within 90 feet. Failure: 17 (5d6) Poison damage, and the target takes a −2 penalty to AC until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }, T.textOnly { procedureOrdinal = 3, name = "Pounce", description = "The dragon moves up to half its Speed, and it makes one Rend attack.", reason = "unsupported_action_shape" } ] }
        , traits = [ T.trait { name = "Amphibious", description = "The dragon can breathe air and water.", effectKind = (None Text) }, T.trait { name = "Legendary Resistance (4/Day, or 5/Day in Lair)", description = "If the dragon fails a saving throw, it can choose to succeed instead.", effectKind = (None Text) } ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 402 }
        , initiative = { modifier = +15, score = 25 }
        , passivePerception = 27
        , savingThrowModifiers = [ { ability = "str", modifier = +8 }, { ability = "dex", modifier = +8 }, { ability = "con", modifier = +7 }, { ability = "wis", modifier = +10 }, { ability = "cha", modifier = +6 } ]
        , skillModifiers = [ { skill = "deception", modifier = 13 }, { skill = "perception", modifier = 17 }, { skill = "persuasion", modifier = 13 }, { skill = "stealth", modifier = 8 } ]
        , immunities = { conditions = Some [ "poisoned" ], damageTypes = Some [ "poison" ] }
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , size = "gargantuan"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) }, T.resource { ordinal = 2, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
