let T = ./_stat_block_types.dhall
in  { challengeRating = 22
    , id = "stat_block_ancient_bronze_dragon"
    , kind = "statBlock"
    , name = "Ancient Bronze Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:1400-1450" }
    , statBlock =
        { abilityScores = { str = 29, dex = 10, con = 27, int = 18, wis = 17, cha = 25 }
        , ac = { value = { kind = "literal", value = 22 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Repulsion Breath or (B) Spellcasting to cast Guiding Bolt (level 2 version).", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Rend", attackAbility = "str", attackBonus = +16, reachFeet = 15, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 8, flat = Some +9, static = 18 }, rest = [ T.damage { damageType = "lightning", dice = 2, dieSize = 8, flat = None Integer, static = 9 } ] } } }
            , T.resourceExecutable { procedureOrdinal = 3, procedure = T.saveArea { name = "Lightning Breath", ability = "dex", dc = 23, area = T.line { lengthFeet = 120, widthFeet = 10 }, onFail = T.damage { damageType = "lightning", dice = 15, dieSize = 10, flat = None Integer, static = 82 }, onSuccess = { kind = "half_damage" } }, resourceOrdinals = { first = 1, rest = [] : List Natural } }
            , T.textOnly { procedureOrdinal = 4, name = "Repulsion Breath", description = "Strength Saving Throw: DC 23, each creature in a 30-foot Cone. Failure: The target is pushed up to 60 feet straight away from the dragon and has the Prone condition.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 5, procedure = T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = Some { kind = "fixed", dc = 22 }, spellAttackBonus = Some { kind = "literal", value = +14 }, components = T.noMaterialComponents, groups =
                  { first = T.atWill { spells =
                      { first = T.spellRef { spellId = "detect_magic", count = None Natural, castAtLevel = None Natural, restriction = None Text }
                      , rest =
                          [ T.spellRef { spellId = "guiding_bolt", count = None Natural, castAtLevel = Some 2, restriction = None Text }
                          , T.spellRef { spellId = "shapechange", count = None Natural, castAtLevel = None Natural, restriction = Some "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell" }
                          , T.spellRef { spellId = "speak_with_animals", count = None Natural, castAtLevel = None Natural, restriction = None Text }
                          , T.spellRef { spellId = "thaumaturgy", count = None Natural, castAtLevel = None Natural, restriction = None Text }
                          ]
                      }
                    }
                  , rest =
                      [ T.limited { resourceOrdinals = { first = 2, rest = [] : List Natural }, spells =
                            { first = T.spellRef { spellId = "control_water", count = None Natural, castAtLevel = None Natural, restriction = None Text }
                            , rest =
                                [ T.spellRef { spellId = "detect_thoughts", count = None Natural, castAtLevel = None Natural, restriction = None Text }
                                , T.spellRef { spellId = "scrying", count = None Natural, castAtLevel = None Natural, restriction = None Text }
                                , T.spellRef { spellId = "water_breathing", count = None Natural, castAtLevel = None Natural, restriction = None Text }
                                ]
                            }
                          }
                      ]
                  }
              }
            }
            ]
        , legendaryActions =
            { uses = { kind = "lair_bonus", usesOutsideLair = 3, additionalUsesInLair = 1 }
            , entries =
                [ T.textOnly { procedureOrdinal = 1, name = "Guiding Light", description = "The dragon uses Spellcasting to cast Guiding Bolt (level 2 version).", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 2, name = "Pounce", description = "The dragon moves up to half its Speed, and it makes one Rend attack.", reason = "unsupported_action_shape" }
                , T.textOnly { procedureOrdinal = 3, name = "Thunderclap", description = "Constitution Saving Throw: DC 22, each creature in a 20-foot-radius Sphere centered on a point the dragon can see within 120 feet. Failure: 13 (3d8) Thunder damage, and the target has the Deafened condition until the end of its next turn.", reason = "unsupported_action_shape" }
                ]
            }
        , traits =
            [ T.trait { name = "Amphibious", description = "The dragon can breathe air and water.", effectKind = None Text }
            , T.trait { name = "Legendary Resistance (4/Day, or 5/Day in Lair)", description = "If the dragon fails a saving throw, it can choose to succeed instead.", effectKind = None Text }
            ]
        , alignment = { order = "lawful", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 444 }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning" ] }
        , initiative = { modifier = +14, score = 24 }
        , passivePerception = 27
        , savingThrowModifiers = [ { ability = "str", modifier = +9 }, { ability = "dex", modifier = +7 }, { ability = "con", modifier = +8 }, { ability = "int", modifier = +4 }, { ability = "wis", modifier = +10 }, { ability = "cha", modifier = +7 } ]
        , senses = [ { kind = "blindsight", rangeFeet = 60, qualifier = None Text }, { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "insight", modifier = 10 }, { skill = "perception", modifier = 17 }, { skill = "stealth", modifier = 7 } ]
        , size = "gargantuan"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 80 }, hover = None Bool }, { kind = "swim", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = T.recharge { minimumRoll = 5 } }, T.resource { ordinal = 2, ownership = "each", limit = T.daily { uses = 1 } } ]
        }
    }
