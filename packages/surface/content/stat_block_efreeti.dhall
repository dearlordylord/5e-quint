let T = ./_stat_block_types.dhall
in  { challengeRating = 11
    , id = "stat_block_efreeti"
    , kind = "statBlock"
    , name = "Efreeti"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:40-77" }
    , statBlock =
        { abilityScores = { str = 22, dex = 12, con = 24, int = 16, wis = 15, cha = 19 }
        , ac = { value = { kind = "literal", value = 17 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The efreeti makes three attacks, using Heated Blade or Hurl Flame in any combination.", reason = "unsupported_action_shape" }
            , T.executable
                { procedureOrdinal = 2
                , procedure = T.meleeAttack
                    { name = "Heated Blade"
                    , attackAbility = "str"
                    , attackBonus = +10
                    , reachFeet = 5
                    , onHit =
                        { first = T.damage { damageType = "slashing", dice = 2, dieSize = 6, flat = Some +6, static = 13 }, rest = [ T.damage { damageType = "fire", dice = 2, dieSize = 12, flat = None Integer, static = 13 } ] }
                    }
                }
            , T.executable
                { procedureOrdinal = 3
                , procedure = T.rangedAttack
                    { name = "Hurl Flame"
                    , attackAbility = "cha"
                    , attackBonus = +8
                    , rangeFeet = { normal = 120, long = 120 }
                    , ammunition = None Text
                    , onHit = { first = T.damage { damageType = "fire", dice = 7, dieSize = 6, flat = None Integer, static = 24 }, rest = [] : List T.Effect }
                    }
                }
            , T.resourceExecutable
                { procedureOrdinal = 4
                , procedure = T.spellcasting
                    { name = "Spellcasting"
                    , ability = "cha"
                    , spellSaveDc = Some { kind = "fixed", dc = 16 }
                    , spellAttackBonus = None { kind : Text, value : Integer }
                    , components = T.noMaterialComponents
                    , groups =
                      { first = T.atWill
                          { spells =
                      { first = -- RAW: Monsters/Monsters-E-G.md:40-77 — At Will: Detect Magic.
                        T.spellRef { spellId = "detect_magic", count = None Natural, castAtLevel = None Natural, restriction = None Text }, rest = [ -- RAW: Monsters/Monsters-E-G.md:40-77 — At Will: Elementalism.
                        T.spellRef { spellId = "elementalism", count = None Natural, castAtLevel = None Natural, restriction = None Text } ] }
                          }, rest = [ T.limited
                          { resourceOrdinals = { first = 1, rest = [] : List Natural }
                          , spells =
                      { first = -- RAW: Monsters/Monsters-E-G.md:40-77 — 1/Day Each: Gaseous Form.
                        T.spellRef { spellId = "gaseous_form", count = None Natural, castAtLevel = None Natural, restriction = None Text }, rest = [ -- RAW: Monsters/Monsters-E-G.md:40-77 — 1/Day Each: Invisibility.
                        T.spellRef { spellId = "invisibility", count = None Natural, castAtLevel = None Natural, restriction = None Text }
                      , -- RAW: Monsters/Monsters-E-G.md:40-77 — 1/Day Each: Major Image.
                        T.spellRef { spellId = "major_image", count = None Natural, castAtLevel = None Natural, restriction = None Text }
                      , -- RAW: Monsters/Monsters-E-G.md:40-77 — 1/Day Each: Plane Shift.
                        T.spellRef { spellId = "plane_shift", count = None Natural, castAtLevel = None Natural, restriction = None Text }
                      , -- RAW: Monsters/Monsters-E-G.md:40-77 — 1/Day Each: Tongues.
                        T.spellRef { spellId = "tongues", count = None Natural, castAtLevel = None Natural, restriction = None Text }
                      , -- RAW: Monsters/Monsters-E-G.md:40-77 — 1/Day Each: Wall of Fire (level 7 version).
                        T.spellRef { spellId = "wall_of_fire", count = None Natural, castAtLevel = Some 7, restriction = None Text } ] }
                          } ] }
                    }
                , resourceOrdinals = { first = 1, rest = [] : List Natural }
                }
            ]
        , traits =
            [ T.trait { name = "Elemental Restoration", description = "If the efreeti dies outside the Elemental Plane of Fire, its body dissolves into ash, and it gains a new body in 1d4 days, reviving with all its Hit Points somewhere on the Plane of Fire.", effectKind = None Text }
            , T.trait { name = "Magic Resistance", description = "The efreeti has Advantage on saving throws against spells and other magical effects.", effectKind = None Text }
            , T.trait { name = "Wishes", description = "The efreeti has a 30 percent chance of knowing the Wish spell. If the efreeti knows it, the efreeti can cast it only on behalf of a non-genie creature who communicates a wish in a way the efreeti can understand. If the efreeti casts the spell for the creature, the efreeti suffers none of the spell's stress. Once the efreeti has cast it three times, the efreeti can't do so again for 365 days.", effectKind = None Text }
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Primordial (Ignan)" ] } }
        , creatureType = "elemental"
        , creatureTypeTags = [ "genie" ]
        , hp = { kind = "literal", value = 212 }
        , initiative = { modifier = +1, score = 11 }
        , passivePerception = 12
        , savingThrowModifiers = [ { ability = "str", modifier = +6 }, { ability = "dex", modifier = +1 }, { ability = "con", modifier = +7 }, { ability = "wis", modifier = +6 }, { ability = "cha", modifier = +8 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "fire" ] }
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 40 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 60 }, hover = Some True } ]
        , resources = [ T.resource { ordinal = 1, ownership = "each", limit = T.daily { uses = 1 } } ]
        }
    }
