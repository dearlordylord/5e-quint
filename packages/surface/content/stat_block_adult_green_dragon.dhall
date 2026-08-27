let T = ./_stat_block_types.dhall
in  { challengeRating = 15
    , id = "stat_block_adult_green_dragon"
    , kind = "statBlock"
    , name = "Adult Green Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:1098-1144" }
    , statBlock =
        { abilityScores = { str = 23, dex = 12, con = 21, int = 18, wis = 15, cha = 18 }
        , ac = { value = { kind = "literal", value = 19 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Mind Spike (level 3 version).", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +11, reachFeet = 10, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 8, flat = (Some +6), static = 15 }, rest = [ T.damage { damageType = "poison", dice = 2, dieSize = 6, flat = (None Integer), static = 7 } ] } } }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.saveArea { name = "Poison Breath (Recharge 5–6)", ability = "con", dc = 18, area = (T.cone { lengthFeet = 60 }), onFail = (T.damage { damageType = "poison", dice = 16, dieSize = 6, flat = (None Integer), static = 56 }), onSuccess = { kind = "half_damage" } }, resourceOrdinals = { first = 1, rest = [] : List Natural } }
            , T.executable { procedureOrdinal = 4, procedure = T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 17 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noMaterialComponents, groups =
                  { first = T.atWill { spells =
                      { first = -- RAW: Monsters/Monsters-E-G.md:1133 — At Will: Detect Magic.
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , rest = [ -- RAW: Monsters/Monsters-E-G.md:1133 — At Will: Mind Spike (level 3 version).
                        T.spellRef { spellId = "mind_spike", count = (None Natural), castAtLevel = (Some 3), restriction = (None Text) }
                      ] } }
                  , rest = [ T.limited { resourceOrdinals = { first = 2, rest = [] : List Natural }, spells =
                      { first = -- RAW: Monsters/Monsters-E-G.md:1134 — 1/Day: Geas.
                        T.spellRef { spellId = "geas", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , rest = [] : List T.SpellRef } }
                  ] } } }
            ]
        , legendaryActions = { uses = { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }, entries = [ T.textOnly { procedureOrdinal = 1, name = "Mind Invasion", description = "The dragon uses Spellcasting to cast Mind Spike (level 3 version).", reason = "unsupported_action_shape" }, T.textOnly { procedureOrdinal = 2, name = "Noxious Miasma", description = "Constitution Saving Throw: DC 17, each creature in a 20-foot-radius Sphere centered on a point the dragon can see within 90 feet. Failure: 7 (2d6) Poison damage, and the target takes a −2 penalty to AC until the end of its next turn. Failure or Success: The dragon can't take this action again until the start of its next turn.", reason = "unsupported_action_shape" }, T.textOnly { procedureOrdinal = 3, name = "Pounce", description = "The dragon moves up to half its Speed, and it makes one Rend attack.", reason = "unsupported_action_shape" } ] }
        , traits = [ T.trait { name = "Amphibious", description = "The dragon can breathe air and water.", effectKind = (None Text) }, T.trait { name = "Legendary Resistance (3/Day, or 4/Day in Lair)", description = "If the dragon fails a saving throw, it can choose to succeed instead.", effectKind = (None Text) } ]
        , alignment = { order = "lawful", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "chromatic" ]
        , hp = { kind = "literal", value = 207 }
        , initiative = { modifier = +11, score = 21 }
        , passivePerception = 22
        , savingThrowModifiers = [ { ability = "str", modifier = +6 }, { ability = "dex", modifier = +6 }, { ability = "con", modifier = +5 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +4 } ]
        , skillModifiers = [ { skill = "deception", modifier = 9 }, { skill = "perception", modifier = 12 }, { skill = "persuasion", modifier = 9 }, { skill = "stealth", modifier = 6 } ]
        , immunities = { conditions = Some [ "poisoned" ], damageTypes = Some [ "poison" ] }
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) }, T.resource { ordinal = 2, ownership = "shared", limit = (T.daily { uses = 1 }) } ]
        }
    }
