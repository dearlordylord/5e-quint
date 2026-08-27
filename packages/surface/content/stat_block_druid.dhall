let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_druid"
    , kind = "statBlock"
    , name = "Druid"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:894-925" }
    , statBlock =
        { abilityScores = { str = 10, dex = 12, con = 13, int = 12, wis = 16, cha = 11 }
        , ac = { value = { kind = "literal", value = 13 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The druid makes two attacks, using Vine Staff or Verdant Wisp in any combination.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Vine Staff", attackAbility = "wis", attackBonus = +5, reachFeet = 5, onHit = [ T.damage { damageType = "bludgeoning", dice = 1, dieSize = 8, flat = (Some +3), static = 7 }, T.damage { damageType = "poison", dice = 1, dieSize = 4, flat = (None Integer), static = 2 } ] } }
            , T.executable { procedureOrdinal = 3, procedure = T.rangedAttack { name = "Verdant Wisp", attackAbility = "wis", attackBonus = +5, rangeFeet = { normal = 90, long = 90 }, ammunition = (None Text), onHit = [ T.damage { damageType = "radiant", dice = 3, dieSize = 6, flat = (None Integer), static = 10 } ] } }
            , T.executable { procedureOrdinal = 4, procedure = T.spellcasting { name = "Spellcasting", ability = "wis", spellSaveDc = (Some { kind = "fixed", dc = 13 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.spellDefinitionComponents, groups = [ T.atWill { spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:894-925 — At Will: Druidcraft.
                        T.spellRef { spellId = "druidcraft", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:894-925 — At Will: Speak with Animals.
                        T.spellRef { spellId = "speak_with_animals", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  , T.limited { resourceOrdinals = [ 1 ], spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:894-925 — 2/Day Each: Entangle.
                        T.spellRef { spellId = "entangle", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:894-925 — 2/Day Each: Thunderwave.
                        T.spellRef { spellId = "thunderwave", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  , T.limited { resourceOrdinals = [ 2 ], spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:894-925 — 1/Day Each: Animal Messenger.
                        T.spellRef { spellId = "animal_messenger", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:894-925 — 1/Day Each: Longstrider.
                        T.spellRef { spellId = "longstrider", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:894-925 — 1/Day Each: Moonbeam.
                        T.spellRef { spellId = "moonbeam", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  ] } }
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Druidic", "Sylvan" ] } }
        , creatureType = "humanoid"
        , creatureTypeTags = [ "druid" ]
        , gear = [ { item = "Studded Leather Armor", quantity = None Natural } ]
        , hp = { kind = "literal", value = 44 }
        , initiative = { modifier = +1, score = 11 }
        , passivePerception = 15
        , savingThrowModifiers = [ { ability = "str", modifier = +0 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +3 }, { ability = "cha", modifier = +0 } ]
        , skillModifiers = [ { skill = "medicine", modifier = 5 }, { skill = "nature", modifier = 3 }, { skill = "perception", modifier = 5 } ]
        , size = { kind = "alternatives", options = [ "medium", "small" ] }
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "each", limit = (T.daily { uses = 2 }) }, T.resource { ordinal = 2, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
