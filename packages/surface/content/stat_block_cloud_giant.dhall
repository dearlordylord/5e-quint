let T = ./_stat_block_types.dhall
in  { challengeRating = 9
    , id = "stat_block_cloud_giant"
    , kind = "statBlock"
    , name = "Cloud Giant"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:228-261" }
    , statBlock =
        { abilityScores = { str = 27, dex = 10, con = 22, int = 12, wis = 16, cha = 16 }
        , ac = { value = { kind = "literal", value = 14 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The giant makes two attacks, using Thunderous Mace or Thundercloud in any combination. It can replace one attack with a use of Spellcasting to cast Fog Cloud.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Thunderous Mace", attackAbility = "str", attackBonus = +12, reachFeet = 10, onHit = [ T.damage { damageType = "bludgeoning", dice = 3, dieSize = 8, flat = (Some +8), static = 21 }, T.damage { damageType = "thunder", dice = 2, dieSize = 6, flat = (None Integer), static = 7 } ] } }
            , T.executable { procedureOrdinal = 3, procedure = T.rangedAttack { name = "Thundercloud", attackAbility = "str", attackBonus = +12, rangeFeet = { normal = 240, long = 240 }, ammunition = (None Text), onHit = [ T.damage { damageType = "thunder", dice = 3, dieSize = 6, flat = (Some +8), static = 18 }
                  , T.applyCondition { condition = "incapacitated", expiresAt = T.targetNextTurnEnd }
                  ] } }
            , T.executable { procedureOrdinal = 4, procedure = T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 15 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noMaterialComponents, groups = [ T.atWill { spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:228-261 — At Will: Detect Magic.
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:228-261 — At Will: Fog Cloud.
                        T.spellRef { spellId = "fog_cloud", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:228-261 — At Will: Light.
                        T.spellRef { spellId = "light", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  , T.limited { resourceOrdinals = [ 1 ], spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:228-261 — 1/Day Each: Control Weather.
                        T.spellRef { spellId = "control_weather", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:228-261 — 1/Day Each: Gaseous Form.
                        T.spellRef { spellId = "gaseous_form", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:228-261 — 1/Day Each: Telekinesis.
                        T.spellRef { spellId = "telekinesis", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  ] } }
            ]
        , bonusActions =
            [ T.executable { procedureOrdinal = 1, procedure = T.spellcasting { name = "Misty Step", ability = "cha", spellSaveDc = (None { kind : Text, dc : Natural }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.spellDefinitionComponents, groups = [ T.atWill { spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:228-261 — Misty Step, same spellcasting ability as Spellcasting.
                        T.spellRef { spellId = "misty_step", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  ] } }
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Giant" ] } }
        , creatureType = "giant"
        , hp = { kind = "literal", value = 200 }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 21
        , savingThrowModifiers = [ { ability = "str", modifier = +8 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +10 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +3 } ]
        , skillModifiers = [ { skill = "insight", modifier = 7 }, { skill = "perception", modifier = 11 } ]
        , size = "huge"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 20 }, hover = Some True } ]
        , resources = [ T.resource { ordinal = 1, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
