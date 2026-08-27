let T = ./_stat_block_types.dhall
in  { challengeRating = 11
    , id = "stat_block_djinni"
    , kind = "statBlock"
    , name = "Djinni"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:712-754" }
    , statBlock =
        { abilityScores = { str = 21, dex = 15, con = 22, int = 15, wis = 16, cha = 20 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The djinni makes three attacks, using Storm Blade or Storm Bolt in any combination.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Storm Blade", attackAbility = "str", attackBonus = +9, reachFeet = 5, onHit = { first = T.damage { damageType = "slashing", dice = 2, dieSize = 6, flat = (Some +5), static = 12 }, rest = [ T.damage { damageType = "lightning", dice = 2, dieSize = 6, flat = (None Integer), static = 7 } ] } } }
            , T.executable { procedureOrdinal = 3, procedure = T.rangedAttack { name = "Storm Bolt", attackAbility = "str", attackBonus = +9, rangeFeet = { normal = 120, long = 120 }, ammunition = (None Text), onHit = { first = T.damage { damageType = "thunder", dice = 3, dieSize = 8, flat = (None Integer), static = 13 }, rest = [ T.conditionIfSize { condition = "prone", maxCreatureSize = "large" } ] } } }
            , T.textOnly { procedureOrdinal = 4, name = "Create Whirlwind", description = "The djinni conjures a whirlwind at a point it can see within 120 feet. The whirlwind fills a 20-foot-radius, 60-foot-high Cylinder centered on that point. The whirlwind lasts until the djinni's Concentration on it ends. The djinni can move the whirlwind up to 20 feet at the start of each of its turns. Whenever the whirlwind enters a creature's space or a creature enters the whirlwind, that creature is subjected to the following effect. Strength Saving Throw: DC 17 (a creature makes this save only once per turn, and the djinni is unaffected). Failure: While in the whirlwind, the target has the Restrained condition and moves with the whirlwind. At the start of each of its turns, the Restrained target takes 21 (6d6) Thunder damage. At the end of each of its turns, the target repeats the save, ending the effect on itself on a success.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 5, procedure = T.spellcasting { name = "Spellcasting", ability = "cha", spellSaveDc = (Some { kind = "fixed", dc = 17 }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noMaterialComponents, groups = { first = T.atWill { spells =
                      { first = -- RAW: Monsters/Monsters-C-D.md:712-754 — At Will: Detect Evil and Good.
                        T.spellRef { spellId = "detect_evil_and_good", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , rest = [ -- RAW: Monsters/Monsters-C-D.md:712-754 — At Will: Detect Magic.
                        T.spellRef { spellId = "detect_magic", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] } }
                  , rest = [ T.limited { resourceOrdinals = { first = 1 , rest = [] : List Natural }, spells =
                      { first = -- RAW: Monsters/Monsters-C-D.md:712-754 — 2/Day Each: Create Food and Water.
                        T.spellRef { spellId = "create_food_and_water", count = (None Natural), castAtLevel = (None Natural), restriction = (Some "can create wine instead of water") }
                      , rest = [ -- RAW: Monsters/Monsters-C-D.md:712-754 — 2/Day Each: Tongues.
                        T.spellRef { spellId = "tongues", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:712-754 — 2/Day Each: Wind Walk.
                        T.spellRef { spellId = "wind_walk", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] } }
                  , T.limited { resourceOrdinals = { first = 2 , rest = [] : List Natural }, spells =
                      { first = -- RAW: Monsters/Monsters-C-D.md:712-754 — 1/Day Each: Creation.
                        T.spellRef { spellId = "creation", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , rest = [ -- RAW: Monsters/Monsters-C-D.md:712-754 — 1/Day Each: Gaseous Form.
                        T.spellRef { spellId = "gaseous_form", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:712-754 — 1/Day Each: Invisibility.
                        T.spellRef { spellId = "invisibility", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:712-754 — 1/Day Each: Major Image.
                        T.spellRef { spellId = "major_image", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      , -- RAW: Monsters/Monsters-C-D.md:712-754 — 1/Day Each: Plane Shift.
                        T.spellRef { spellId = "plane_shift", count = (None Natural), castAtLevel = (None Natural), restriction = (None Text) }
                      ] } }
                  ] } } }
            ]
        , traits = [ T.trait { name = "Elemental Restoration", description = "If the djinni dies outside the Elemental Plane of Air, its body dissolves into mist, and it gains a new body in 1d4 days, reviving with all its Hit Points somewhere in the Plane of Air.", effectKind = (None Text) }, T.trait { name = "Magic Resistance", description = "The djinni has Advantage on saving throws against spells and other magical effects.", effectKind = (None Text) }, T.trait { name = "Wishes", description = "The djinni has a 30 percent chance of knowing the Wish spell. If the djinni knows it, the djinni can cast it only on behalf of a non-genie creature who communicates a wish in a way the djinni can understand. If the djinni casts the spell for the creature, the djinni suffers none of the spell's stress. Once the djinni has cast it three times, the djinni can't do so again for 365 days.", effectKind = (None Text) } ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Primordial (Auran)" ] } }
        , creatureType = "elemental"
        , creatureTypeTags = [ "genie" ]
        , hp = { kind = "literal", value = 218 }
        , initiative = { modifier = +2, score = 12 }
        , passivePerception = 13
        , savingThrowModifiers = [ { ability = "str", modifier = +5 }, { ability = "dex", modifier = +6 }, { ability = "con", modifier = +6 }, { ability = "int", modifier = +2 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +5 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "lightning", "thunder" ] }
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 30 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 90 }, hover = Some True } ]
        , resources = [ T.resource { ordinal = 1, ownership = "each", limit = (T.daily { uses = 2 }) }, T.resource { ordinal = 2, ownership = "each", limit = (T.daily { uses = 1 }) } ]
        }
    }
