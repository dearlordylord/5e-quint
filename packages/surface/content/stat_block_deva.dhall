let T = ./_stat_block_types.dhall
in  { challengeRating = 10
    , id = "stat_block_deva"
    , kind = "statBlock"
    , name = "Deva"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:669-708" }
    , statBlock =
        { abilityScores = { str = 18, dex = 18, con = 18, int = 17, wis = 20, cha = 20 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = T.multiattack { name = "Multiattack", dispatches = [ { count = { kind = "literal", value = +2 }, procedureOrdinal = 2 } ] } }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Holy Mace", attackAbility = "str", attackBonus = +8, reachFeet = 5, onHit = [ T.damage { damageType = "bludgeoning", dice = 1, dieSize = 6, flat = (Some +4), static = 7 }, T.damage { damageType = "radiant", dice = 4, dieSize = 8, flat = (None Integer), static = 18 } ] } }
            , T.executable { procedureOrdinal = 3, procedure = T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 17 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noMaterialComponents, groups = [ T.atWill { spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:669-708 — At Will: Detect Evil and Good.
                        T.spellRef { spellId = "detect_evil_and_good", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:669-708 — At Will: Shapechange, Beast or Humanoid form only with the printed restrictions.
                        T.spellRef { spellId = "shapechange", count = (None Natural), castAtLevel = (None Natural), restriction = (Some "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell") }
                      ] }
                  , T.limited { resourceOrdinals = [ 1 ], spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:669-708 — 1/Day Each: Commune.
                        T.spellRef { spellId = "commune", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:669-708 — 1/Day Each: Raise Dead.
                        T.spellRef { spellId = "raise_dead", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  ] } }
            ]
        , bonusActions =
            [ T.executable { procedureOrdinal = 1, procedure = T.spellcasting { name = "Divine Aid (2/Day)", ability = "cha", spellSaveDc = (None { kind : Text, dc : Natural }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.spellDefinitionComponents, groups = [ T.limited { resourceOrdinals = [ 2 ], spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:669-708 — Divine Aid, 2/Day: Cure Wounds, Lesser Restoration, or Remove Curse.
                        T.spellRef { spellId = "cure_wounds", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:669-708 — Divine Aid, 2/Day: Lesser Restoration.
                        T.spellRef { spellId = "lesser_restoration", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:669-708 — Divine Aid, 2/Day: Remove Curse.
                        T.spellRef { spellId = "remove_curse", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  ] } }
            ]
        , traits = [ T.trait { name = "Exalted Restoration", description = "If the deva dies outside Mount Celestia, its body disappears in smoke, and it gains a new body instantly, reviving with all its Hit Points somewhere in Mount Celestia.", effectKind = (None Text) }, T.trait { name = "Magic Resistance", description = "The deva has Advantage on saving throws against spells and other magical effects.", effectKind = (None Text) } ]
        , alignment = { order = "lawful", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "all" }, telepathy = Some { rangeFeet = 120, response = None Text, requiresLanguageUnderstanding = None { kind : Text, languages : List Text } } }
        , creatureType = "celestial"
        , creatureTypeTags = [ "angel" ]
        , hp = { kind = "literal", value = 229 }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 19
        , savingThrowModifiers = [ { ability = "str", modifier = +4 }, { ability = "dex", modifier = +4 }, { ability = "con", modifier = +4 }, { ability = "int", modifier = +3 }, { ability = "wis", modifier = +9 }, { ability = "cha", modifier = +9 } ]
        , resistances = { kind = "fixed", damageTypes = [ "radiant" ] }
        , immunities = { conditions = Some [ "charmed", "exhaustion", "frightened" ], damageTypes = None (List Text) }
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "insight", modifier = 9 }, { skill = "perception", modifier = 9 } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 90 }, hover = Some True } ]
        , resources = [ T.resource { ordinal = 1, ownership = "each", limit = (T.daily { uses = 1 }) }, T.resource { ordinal = 2, ownership = "shared", limit = (T.daily { uses = 2 }) } ]
        }
    }
