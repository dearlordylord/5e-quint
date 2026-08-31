let T = ./_stat_block_types.dhall
in  { challengeRating = 2
    , id = "stat_block_cultist_fanatic"
    , kind = "statBlock"
    , name = "Cultist Fanatic"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:577-608" }
    , statBlock =
        { abilityScores = { str = 11, dex = 14, con = 12, int = 10, wis = 14, cha = 13 }
        , ac = { value = { kind = "literal", value = 13 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = T.meleeAttack { name = "Pact Blade", attackAbility = "dex", attackBonus = +4, reachFeet = 5, onHit = { first = T.damage { damageType = "slashing", dice = 1, dieSize = 8, flat = (Some +2), static = 6 }, rest = [ T.damage { damageType = "necrotic", dice = 2, dieSize = 6, flat = (None Integer), static = 7 } ] } } }
            , T.executable { procedureOrdinal = 2, procedure = T.spellcasting { name = "Spellcasting", ability = "wis", spellSaveDc = (Some { kind = "fixed", dc = 12 }), spellAttackBonus = (Some { kind = "literal", value = +4 }), components = T.spellDefinitionComponents, groups = { first = T.atWill { spells =
                      { first = -- RAW: Monsters/Monsters-C-D.md:577-608 — At Will: Light.
                        T.spellRef { spellId = "light", count = (None Natural), castAtLevel = (None Natural) }
                      , rest = [ -- RAW: Monsters/Monsters-C-D.md:577-608 — At Will: Thaumaturgy.
                        T.spellRef { spellId = "thaumaturgy", count = (None Natural), castAtLevel = (None Natural) }
                      ] } }
                  , rest = [ T.limited { resourceOrdinals = { first = 1 , rest = [] : List Natural }, spells =
                      { first = -- RAW: Monsters/Monsters-C-D.md:577-608 — 2/Day: Command.
                        T.spellRef { spellId = "command", count = (None Natural), castAtLevel = (None Natural) }
                      , rest = [] : List T.SpellRef } }
                  , T.limited { resourceOrdinals = { first = 2 , rest = [] : List Natural }, spells =
                      { first = -- RAW: Monsters/Monsters-C-D.md:577-608 — 1/Day: Hold Person.
                        T.spellRef { spellId = "hold_person", count = (None Natural), castAtLevel = (None Natural) }
                      , rest = [] : List T.SpellRef } }
                  ] } } }
            ]
        , bonusActions =
            [ T.executable { procedureOrdinal = 1, procedure = T.spellcasting { name = "Spiritual Weapon (2/Day)", ability = "wis", spellSaveDc = (None { kind : Text, dc : Natural }), spellAttackBonus = (Some { kind = "literal", value = +4 }), components = T.spellDefinitionComponents, groups = { first = T.limited { resourceOrdinals = { first = 3 , rest = [] : List Natural }, spells =
                      { first = -- RAW: Monsters/Monsters-C-D.md:577-608 — Spiritual Weapon, 2/Day, same spellcasting ability as Spellcasting.
                        T.spellRef { spellId = "spiritual_weapon", count = (None Natural), castAtLevel = (None Natural) }
                      , rest = [] : List T.SpellRef } }
                  , rest = [] : List T.Group } } }
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common" ] } }
        , creatureType = "humanoid"
        , gear = [ { item = "Holy Symbol", quantity = None Natural }, { item = "Leather Armor", quantity = None Natural } ]
        , hp = { kind = "literal", value = 44 }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 12
        , savingThrowModifiers = [ { ability = "str", modifier = +0 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +0 }, { ability = "wis", modifier = +4 }, { ability = "cha", modifier = +1 } ]
        , skillModifiers = [ { skill = "deception", modifier = 3 }, { skill = "persuasion", modifier = 3 }, { skill = "religion", modifier = 2 } ]
        , size = { kind = "alternatives", options = [ "medium", "small" ] }
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.daily { uses = 2 }) }, T.resource { ordinal = 2, ownership = "shared", limit = (T.daily { uses = 1 }) }, T.resource { ordinal = 3, ownership = "shared", limit = (T.daily { uses = 2 }) } ]
        }
    }
