let T = ./_stat_block_types.dhall
in { challengeRating = 1
, id = "stat_block_animated_armor"
, kind = "statBlock"
, name = "Animated Armor"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:98-122" }
, statBlock =
  { abilityScores = { cha = 1, con = 13, dex = 11, int = 1, str = 14, wis = 3 }
  , ac.value = { kind = "literal", value = 18 }
  , actions =
    [ T.executable { procedureOrdinal = 1, procedure = T.multiattack { name = "Multiattack", dispatches = { first = { count = { kind = "literal", value = +2 }, procedureOrdinal = 2 }, rest = [] : List T.Dispatch } } }
    , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Slam", attackAbility = "str", attackBonus = +4, reachFeet = 5, onHit = { first = T.damage { damageType = "bludgeoning", dice = 1, dieSize = 6, flat = Some +2, static = 5 }, rest = [] : List T.Effect } } }
    ]
  , alignment = "unaligned"
  , communication.kind = "none"
  , creatureType = "construct"
  , hp = { kind = "literal", value = 33 }
  , immunities =
    { conditions =
      [ "charmed"
      , "deafened"
      , "exhaustion"
      , "frightened"
      , "paralyzed"
      , "petrified"
      , "poisoned"
      ]
    , damageTypes = [ "poison", "psychic" ]
    }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 6
  , savingThrowModifiers =
    [ { ability = "str", modifier = +2 }
    , { ability = "dex", modifier = +0 }
    , { ability = "con", modifier = +1 }
    , { ability = "int", modifier = -5 }
    , { ability = "wis", modifier = -4 }
    , { ability = "cha", modifier = -5 }
    ]
  , senses = [ { kind = "blindsight", rangeFeet = 60 } ]
  , size = "medium"
  , speeds = [ { feet = { kind = "literal", value = 25 }, kind = "walk" } ]
  }
}
