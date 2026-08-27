let T = ./_stat_block_types.dhall
in { challengeRating = 19
    , id = "stat_block_balor"
    , kind = "statBlock"
    , name = "Balor"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:366-408" }
    , statBlock =
      { abilityScores =
        { cha = 22, con = 22, dex = 15, int = 20, str = 26, wis = 16 }
      , ac.value = { kind = "literal", value = 19 }
      , actions =
    [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The balor makes one Flame Whip attack and one Lightning Blade attack.", reason = "unsupported_action_shape" }
    , T.textOnly { procedureOrdinal = 2, name = "Flame Whip", description = "Melee Attack Roll: +14, reach 30 ft. Hit: 18 (3d6 + 8) Force damage plus 17 (5d6) Fire damage. If the target is a Huge or smaller creature, the balor pulls the target up to 25 feet straight toward itself, and the target has the Prone condition.", reason = "unsupported_action_shape" }
    , T.textOnly { procedureOrdinal = 3, name = "Lightning Blade", description = "Melee Attack Roll: +14, reach 10 ft. Hit: 21 (3d8 + 8) Force damage plus 22 (4d10) Lightning damage, and the target can't take Reactions until the start of the balor's next turn.", reason = "unsupported_action_shape" }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
      , bonusActions =
    [ T.textOnly { procedureOrdinal = 1, name = "Teleport", description = "The balor teleports itself or a willing demon within 10 feet of itself up to 60 feet to an unoccupied space the balor can see.", reason = "unsupported_action_shape" }
    ]
  , communication =
        { kind = "spoken_and_understood"
        , languages = { kind = "named", languages = [ "Abyssal" ] }
        , telepathy.rangeFeet = 120
        }
      , creatureType = "fiend"
      , creatureTypeTags = [ "demon" ]
      , hp = { kind = "literal", value = 287 }
      , immunities =
        { conditions = [ "charmed", "frightened", "poisoned" ]
        , damageTypes = [ "fire", "poison" ]
        }
      , initiative = { modifier = 14, score = 24 }
      , passivePerception = 19
      , skillModifiers = [ { skill = "perception", modifier = +9 } ]
      , resistances = { damageTypes = [ "cold", "lightning" ], kind = "fixed" }
      , savingThrowModifiers =
        [ { ability = "str", modifier = 8 }
        , { ability = "dex", modifier = 2 }
        , { ability = "con", modifier = 12 }
        , { ability = "int", modifier = 5 }
        , { ability = "wis", modifier = 9 }
        , { ability = "cha", modifier = 6 }
        ]
      , senses = [ { kind = "truesight", rangeFeet = 120 } ]
      , traits =
    [ T.trait { name = "Death Throes", description = "The balor explodes when it dies. Dexterity Saving Throw: DC 20, each creature in a 30-foot Emanation originating from the balor. Failure: 31 (9d6) Fire damage plus 31 (9d6) Force damage. Success: Half damage. Failure or Success: If the balor dies outside the Abyss, it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss.", effectKind = None Text }
    , T.trait { name = "Fire Aura", description = "At the end of each of the balor's turns, each creature in a 5-foot Emanation originating from the balor takes 13 (3d8) Fire damage.", effectKind = None Text }
    , T.trait { name = "Legendary Resistance (3/Day)", description = "If the balor fails a saving throw, it can choose to succeed instead.", effectKind = None Text }
    , T.trait { name = "Magic Resistance", description = "The balor has Advantage on saving throws against spells and other magical effects.", effectKind = None Text }
    ]
  , size = "huge"
      , speeds =
        [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
        , { feet = { kind = "literal", value = 80 }, kind = "fly" }
        ]
      }
    }
