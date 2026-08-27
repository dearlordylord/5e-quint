let T = ./_stat_block_types.dhall
in { challengeRating = 2
    , id = "stat_block_bandit_captain"
    , kind = "statBlock"
    , name = "Bandit Captain"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:442-473" }
    , statBlock =
      { abilityScores =
        { cha = 14, con = 14, dex = 16, int = 14, str = 15, wis = 11 }
      , ac.value = { kind = "literal", value = 15 }
      , actions =
    [ T.textOnly { procedureOrdinal = 1, name = "Multiattack", description = "The bandit makes two attacks, using Scimitar and Pistol in any combination.", reason = "unsupported_action_shape" }
    , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Scimitar", attackAbility = "str", attackBonus = +5, reachFeet = 5, onHit = { first = T.damage { damageType = "slashing", dice = 1, dieSize = 6, flat = Some +3, static = 6 }, rest = [] : List T.Effect } } }
    , T.executable { procedureOrdinal = 3, procedure = T.rangedAttack { name = "Pistol", attackAbility = "dex", attackBonus = +5, rangeFeet = { normal = 30, long = 90 }, ammunition = Some "bullet", onHit = { first = T.damage { damageType = "piercing", dice = 1, dieSize = 10, flat = Some +3, static = 8 }, rest = [] : List T.Effect } } }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named", languages = [ "Common", "Thieves' Cant" ] }
        }
      , creatureType = "humanoid"
      , gear =
        [ { item = "Pistol" }
        , { item = "Scimitar" }
        , { item = "Studded Leather Armor" }
        ]
      , hp = { kind = "literal", value = 52 }
      , initiative = { modifier = 3, score = 13 }
      , passivePerception = 10
      , reactions =
    [ T.textOnly { procedureOrdinal = 1, name = "Parry", description = "Trigger: The bandit is hit by a melee attack roll while holding a weapon. Response: The bandit adds 2 to its AC against that attack, possibly causing it to miss.", reason = "unsupported_action_shape" }
    ]
  , savingThrowModifiers =
        [ { ability = "str", modifier = 4 }
        , { ability = "dex", modifier = 3 }
        , { ability = "con", modifier = 2 }
        , { ability = "int", modifier = 2 }
        , { ability = "wis", modifier = 0 }
        , { ability = "cha", modifier = 2 }
        ]
      , size = { kind = "alternatives", options = [ "medium", "small" ] }
      , skillModifiers =
        [ { modifier = 4, skill = "athletics" }
        , { modifier = 4, skill = "deception" }
        ]
      , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
      }
    }
