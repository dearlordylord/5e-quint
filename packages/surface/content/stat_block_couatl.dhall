let T = ./_stat_block_types.dhall
in  { challengeRating = 4
    , id = "stat_block_couatl"
    , kind = "statBlock"
    , name = "Couatl"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:479-515" }
    , statBlock =
        { abilityScores = { str = 16, dex = 20, con = 17, int = 18, wis = 20, cha = 18 }
        , ac = { value = { kind = "literal", value = 19 } }
        , actions =
            [ T.executable { procedureOrdinal = 1, procedure = T.meleeAttack { name = "Bite", attackAbility = "dex", attackBonus = +7, reachFeet = 5, onHit = [ T.damage { damageType = "piercing", dice = 1, dieSize = 12, flat = (Some +5), static = 11 }
                  , T.applyCondition { condition = "poisoned", expiresAt = T.sourceNextTurnEnd }
                  ] } }
            , T.textOnly { procedureOrdinal = 2, name = "Constrict", description = "Strength Saving Throw: DC 15, one Medium or smaller creature the couatl can see within 5 feet. Failure: 8 (1d6 + 5) Bludgeoning damage. The target has the Grappled condition (escape DC 13), and it has the Restrained condition until the grapple ends.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 3, procedure = T.spellcasting { name = "Spellcasting", ability = "wis", spellSaveDc = (Some { kind = "fixed", dc = 15 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noComponents, groups = [ T.atWill { spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:479-515 — At Will: Detect Evil and Good.
                        T.spellRef { spellId = "detect_evil_and_good", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — At Will: Detect Magic.
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — At Will: Detect Thoughts.
                        T.spellRef { spellId = "detect_thoughts", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — At Will: Shapechange, Beast or Humanoid form only with the printed restrictions.
                        T.spellRef { spellId = "shapechange", count = (None Natural), castAtLevel = (None Natural), restriction = (Some "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell") }
                      ] }
                  , T.limited { resourceOrdinals = [ 1 ], spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:479-515 — 1/Day Each: Create Food and Water.
                        T.spellRef { spellId = "create_food_and_water", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — 1/Day Each: Dream.
                        T.spellRef { spellId = "dream", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — 1/Day Each: Greater Restoration.
                        T.spellRef { spellId = "greater_restoration", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — 1/Day Each: Scrying.
                        T.spellRef { spellId = "scrying", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — 1/Day Each: Sleep.
                        T.spellRef { spellId = "sleep", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  ] } }
            ]
        , bonusActions =
            [ T.executable { procedureOrdinal = 1, procedure = T.spellcasting { name = "Divine Aid", ability = "wis", spellSaveDc = (None { kind : Text, dc : Natural }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noComponents, groups = [ T.limited { resourceOrdinals = [ 2 ], spells =
                      [ -- RAW: Monsters/Monsters-C-D.md:479-515 — Divine Aid shared 2/Day pool: Bless.
                        T.spellRef { spellId = "bless", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — Divine Aid shared 2/Day pool: Lesser Restoration.
                        T.spellRef { spellId = "lesser_restoration", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:479-515 — Divine Aid shared 2/Day pool: Sanctuary.
                        T.spellRef { spellId = "sanctuary", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] }
                  ] } }
            ]
        , traits = [ T.trait { name = "Shielded Mind", description = "The couatl's thoughts can't be read by any means, and other creatures can communicate with it telepathically only if it allows them.", effectKind = (None Text) } ]
        , alignment = { order = "lawful", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "all" }, telepathy = Some { rangeFeet = 120, response = None Text, requiresLanguageUnderstanding = None { kind : Text, languages : List Text } } }
        , creatureType = "celestial"
        , hp = { kind = "literal", value = 60 }
        , initiative = { modifier = +5, score = 15 }
        , passivePerception = 15
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +5 }, { ability = "con", modifier = +5 }, { ability = "int", modifier = +4 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +4 } ]
        , resistances = { kind = "fixed", damageTypes = [ "bludgeoning", "piercing", "slashing" ] }
        , immunities = { conditions = None (List Text), damageTypes = Some [ "psychic", "radiant" ] }
        , senses = [ { kind = "truesight", rangeFeet = 120, qualifier = None Text } ]
        , size = "medium"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 90 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "each", limit = (T.daily { uses = 1 }) }, T.resource { ordinal = 2, ownership = "shared", limit = (T.daily { uses = 2 }) } ]
        }
    }
