let T = ./_stat_block_types.dhall
in  { challengeRating = 8
    , id = "stat_block_cloaker"
    , kind = "statBlock"
    , name = "Cloaker"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:187-224" }
    , statBlock =
        { abilityScores = { str = 17, dex = 15, con = 12, int = 13, wis = 14, cha = 7 }
        , ac = { value = { kind = "literal", value = 14 } }
        , actions =
            [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The cloaker makes one Attach attack and two Tail attacks.", reason = "unsupported_action_shape" }
            , T.textOnly { procedureOrdinal = 2, name = "Attach", description = "Melee Attack Roll: +6, reach 5 ft. Hit: 13 (3d6 + 3) Piercing damage. If the target is a Large or smaller creature, the cloaker attaches to it. While the cloaker is attached, the target has the Blinded condition, and the cloaker can't make Attach attacks against other targets. In addition, the cloaker halves the damage it takes (round down), and the target takes the same amount of damage. The cloaker can detach itself by spending 5 feet of movement. The target or a creature within 5 feet of it can take an action to try to detach the cloaker, doing so by succeeding on a DC 14 Strength (Athletics) check.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 3, procedure = T.meleeAttack { name = "Tail", attackAbility = "str", attackBonus = +6, reachFeet = 10, onHit = { first = T.damage { damageType = "slashing", dice = 1, dieSize = 10, flat = (Some +3), static = 8 }, rest = [] : List T.Effect } } }
            ]
        , bonusActions =
            [ T.textOnly { procedureOrdinal = 1, name = "Moan", description = "Wisdom Saving Throw: DC 13, each creature in a 60-foot Emanation originating from the cloaker. Failure: The target has the Frightened condition until the end of the cloaker's next turn. Success: The target is immune to this cloaker's Moan for the next 24 hours.", reason = "unsupported_action_shape" }
            , T.executable { procedureOrdinal = 2, procedure = T.spellcasting { name = "Phantasms", ability = "wis", spellSaveDc = (None { kind : Text, dc : Natural }), spellAttackBonus = (None { kind : Text, value : Integer }), components = T.noComponents, groups = { first = T.limited { resourceOrdinals = { first = 1, rest = [] : List Natural }, spells =
                      { first = -- RAW: Monsters/Monsters-C-D.md:187-224 — Phantasms, Recharge after a Short or Long Rest: Mirror Image; ends early in Bright Light.
                        T.spellRef { spellId = "mirror_image", count = (None Natural), castAtLevel = (None Natural), restriction = (Some "The spell ends early if the cloaker starts or ends its turn in Bright Light") }
                      , rest = [] : List T.SpellRef
                      } }
                  , rest = [] : List T.Group } } }
            ]
        , traits = [ T.trait { name = "Light Sensitivity", description = "While in Bright Light, the cloaker has Disadvantage on attack rolls.", effectKind = (None Text) } ]
        , alignment = { order = "chaotic", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Deep Speech", "Undercommon" ] } }
        , creatureType = "aberration"
        , hp = { kind = "literal", value = 91 }
        , initiative = { modifier = +5, score = 15 }
        , passivePerception = 12
        , savingThrowModifiers = [ { ability = "str", modifier = +3 }, { ability = "dex", modifier = +2 }, { ability = "con", modifier = +1 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +2 }, { ability = "cha", modifier = -2 } ]
        , immunities = { conditions = Some [ "frightened" ], damageTypes = None (List Text) }
        , senses = [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
        , skillModifiers = [ { skill = "stealth", modifier = 5 } ]
        , size = "large"
        , speeds = [ { kind = "walk", feet = { kind = "literal", value = 10 }, hover = None Bool }, { kind = "fly", feet = { kind = "literal", value = 40 }, hover = None Bool } ]
        , resources = [ T.resource { ordinal = 1, ownership = "shared", limit = (T.rest) } ]
        }
    }
