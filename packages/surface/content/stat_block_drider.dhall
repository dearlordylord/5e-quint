let T = ./_stat_block_types.dhall
in  { challengeRating = 6
    , id = "stat_block_drider"
    , kind = "statBlock"
    , name = "Drider"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:854-890" }
    , statBlock =
        { abilityScores = { str = 16, dex = 19, con = 18, int = 13, wis = 16, cha = 12 }
        , ac = { value = { kind = "literal", value = 19 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The drider makes three attacks, using Foreleg or Poison Burst in any combination.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Foreleg", attackAbility = "dex", attackBonus = +7, reachFeet = 10, onHit = [ T.damage { damageType = "piercing", dice = 2, dieSize = 8, flat = (Some +4), static = 13 } ] } }
            , T.executable { procedureOrdinal = 3, procedure = T.rangedAttack { name = "Poison Burst", attackAbility = "wis", attackBonus = +6, rangeFeet = { normal = 120, long = 120 }, ammunition = (None Text), onHit = [ T.damage { damageType = "poison", dice = 3, dieSize = 6, flat = (Some +3), static = 13 } ] } }
            ]
        , bonusActions =
            [ T.executable { procedureOrdinal = 1, procedure = T.spellcasting { name = "Magic of the Spider Queen (Recharge 5–6)", ability = "wis", spellSaveDc = (Some { kind = "fixed", dc = 14 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noMaterialComponents, groups = [ T.limited { resourceOrdinals = [ 1 ], spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:854-890 — Magic of the Spider Queen, Recharge 5–6: Darkness, Faerie Fire, or Web.
                        T.spellRef { spellId = "darkness", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:854-890 — Magic of the Spider Queen can cast Faerie Fire.
                        T.spellRef { spellId = "faerie_fire", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:854-890 — Magic of the Spider Queen can cast Web.
                        T.spellRef { spellId = "web", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  ] } }
            ]
        , traits = [ T.trait { name = "Spider Climb", description = "The drider can climb difficult surfaces, including along ceilings, without needing to make an ability check.", effectKind = (None Text) }, T.trait { name = "Sunlight Sensitivity", description = "While in sunlight, the drider has Disadvantage on ability checks and attack rolls.", effectKind = (None Text) }, T.trait { name = "Web Walker", description = "The drider ignores movement restrictions caused by webs, and the drider knows the location of any other creature in contact with the same web.", effectKind = (None Text) } ]
        , alignment = { order = "chaotic", morality = "evil" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Elvish", "Undercommon" ] } }
        , creatureType = "monstrosity"
        , hp = { kind = "literal", value = 123 }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 16
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +4 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +3 }, { ability = "cha", modifier = +1 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 6 }, { skill = "stealth", modifier = 10 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "climb", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.recharge { minimumRoll = 5 }) } ]
        }
    }
