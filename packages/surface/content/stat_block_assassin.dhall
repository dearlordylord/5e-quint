let T = ./_stat_block_types.dhall
in { challengeRating = 8
    , id = "stat_block_assassin"
    , kind = "statBlock"
    , name = "Assassin"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:211-247" }
    , statBlock =
      { abilityScores =
        { cha = 10, con = 14, dex = 18, int = 16, str = 11, wis = 11 }
      , ac.value = { kind = "literal", value = 16 }
      , actions =
    [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The assassin makes three attacks, using Shortsword or Light Crossbow in any combination.", reason = "unsupported_action_shape" }
    , T.textOnly { procedureOrdinal = 2, name = "Shortsword", description = "Melee Attack Roll: +7, reach 5 ft. Hit: 7 (1d6 + 4) Piercing damage plus 17 (5d6) Poison damage, and the target has the Poisoned condition until the start of the assassin's next turn.", reason = "unsupported_action_shape" }
    , T.executable { procedureOrdinal = 3, procedure = T.rangedAttack { name = "Light Crossbow", attackAbility = "dex", attackBonus = +7, rangeFeet = { normal = 80, long = 320 }, ammunition = Some "bolt", onHit = { first = T.damage { damageType = "piercing", dice = 1, dieSize = 8, flat = Some +4, static = 8 }, rest = [ T.damage { damageType = "poison", dice = 6, dieSize = 6, flat = None Integer, static = 21 } ] : List T.Effect } } }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
      , bonusActions =
    [ T.executable { procedureOrdinal = 1, procedure = T.actionOption { name = "Cunning Action", options = { first = "dash", rest = [ "disengage", "hide" ] : List Text } } }
    ]
  , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named", languages = [ "Common", "Thieves' Cant" ] }
        }
      , creatureType = "humanoid"
      , gear =
        [ { item = "Light Crossbow" }
        , { item = "Shortsword" }
        , { item = "Studded Leather Armor" }
        ]
      , hp = { kind = "literal", value = 97 }
      , initiative = { modifier = 10, score = 20 }
      , passivePerception = 16
      , resistances = { damageTypes = [ "poison" ], kind = "fixed" }
      , savingThrowModifiers =
        [ { ability = "str", modifier = 0 }
        , { ability = "dex", modifier = 7 }
        , { ability = "con", modifier = 2 }
        , { ability = "int", modifier = 6 }
        , { ability = "wis", modifier = 0 }
        , { ability = "cha", modifier = 0 }
        ]
      , traits = [ T.trait { name = "Evasion", description = "If the assassin is subjected to an effect that allows it to make a Dexterity saving throw to take only half damage, the assassin instead takes no damage if it succeeds on the save and only half damage if it fails. It can't use this trait if it has the Incapacitated condition.", effectKind = None Text } ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
      , skillModifiers =
        [ { modifier = 7, skill = "acrobatics" }
        , { modifier = 6, skill = "perception" }
        , { modifier = 10, skill = "stealth" }
        ]
      , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
      }
    }
