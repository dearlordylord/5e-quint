let T = ./_stat_block_types.dhall
in  { challengeRating = 1
    , id = "stat_block_dryad"
    , kind = "statBlock"
    , name = "Dryad"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:929-968" }
    , statBlock =
        { abilityScores = { str = 10, dex = 12, con = 11, int = 14, wis = 15, cha = 18 }
        , ac = { value = { kind = "literal", value = 16 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The dryad makes one Vine Lash or Thorn Burst attack, and it can use Spellcasting to cast Charm Monster.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Vine Lash", attackAbility = "cha", attackBonus = +6, reachFeet = 10, onHit = [ T.damage { damageType = "slashing", dice = 1, dieSize = 8, flat = (Some +4), static = 8 } ] } }
            , T.executable { procedureOrdinal = 3, procedure = T.rangedAttack { name = "Thorn Burst", attackAbility = "cha", attackBonus = +6, rangeFeet = { normal = 60, long = 60 }, ammunition = (None Text), onHit = [ T.damage { damageType = "piercing", dice = 1, dieSize = 6, flat = (Some +4), static = 7 } ] } }
            , T.executable { procedureOrdinal = 4, procedure = T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 14 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noMaterialComponents, groups = [ T.atWill { spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:929-968 — At Will: Animal Friendship.
                        T.spellRef { spellId = "animal_friendship", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:929-968 — At Will: Charm Monster, lasts 24 hours; ends early if the dryad casts it again.
                        T.spellRef { spellId = "charm_monster", count = (None Natural), castAtLevel = (None Natural), restriction = (Some "lasts 24 hours; ends early if the dryad casts the spell again") }
                      , -- RAW: Monsters/Monsters-C-D.md:929-968 — At Will: Druidcraft.
                        T.spellRef { spellId = "druidcraft", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  , T.limited { resourceOrdinals = [ 1 ], spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:929-968 — 1/Day Each: Entangle.
                        T.spellRef { spellId = "entangle", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:929-968 — 1/Day Each: Pass without Trace.
                        T.spellRef { spellId = "pass_without_trace", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  ] } }
            ]
        , bonusActions =
            [ T.textOnly { procedureOrdinal = 1, name = "Tree Stride", description = "If within 5 feet of a Large or bigger tree, the dryad teleports to an unoccupied space within 5 feet of a second Large or bigger tree that is within 60 feet of the previous tree.", reason = "unsupported_action_shape" }
            ]
        , traits = [ T.trait { name = "Magic Resistance", description = "The dryad has Advantage on saving throws against spells and other magical effects.", effectKind = (None Text) }, T.trait { name = "Speak with Beasts and Plants", description = "The dryad can communicate with Beasts and Plants as if they shared a language.", effectKind = (None Text) } ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Elvish", "Sylvan" ] } }
        , creatureType = "fey"
        , hp = { kind = "literal", value = 22 }
        , initiative = { modifier = +1, score = 11 }
        , passivePerception = 14
        , savingThrowModifiers = [ { ability = "str", modifier = +0 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +0 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = +4 } ]
        , senses = [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
        , skillModifiers = [ { skill = "perception", modifier = 4 }, { skill = "stealth", modifier = 5 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
