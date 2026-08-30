let T = ./_stat_block_types.dhall
in { challengeRating = 5
, id = "stat_block_air_elemental"
, kind = "statBlock"
, name = "Air Elemental"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-A-B.md:61-92" }
, statBlock =
  { abilityScores = { cha = 6, con = 14, dex = 20, int = 6, str = 14, wis = 10 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ T.executable { procedureOrdinal = 1, procedure = T.multiattack { name = "Multiattack", dispatches = { first = { count = { kind = "literal", value = +2 }, procedureOrdinal = 2 }, rest = [] : List T.Dispatch } } }
    , T.executable { procedureOrdinal = 2, procedure = T.meleeAttack { name = "Thunderous Slam", attackAbility = "dex", attackBonus = +8, reachFeet = 10, onHit = { first = T.damage { damageType = "thunder", dice = 2, dieSize = 8, flat = Some +5, static = 14 }, rest = [] : List T.Effect } } }
    , T.resourceTextOnly { procedureOrdinal = 3, name = "Whirlwind", description = "Strength Saving Throw: DC 13, one Medium or smaller creature in the elemental's space. Failure: 24 (4d10 + 2) Thunder damage, and the target is pushed up to 20 feet straight away from the elemental and has the Prone condition. Success: Half damage only.", reason = "unsupported_action_shape", resourceOrdinals = { first = 1, rest = [] : List Natural } }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Primordial (Auran)" ] }
    }
  , creatureType = "elemental"
  , hp = { kind = "literal", value = 90 }
  , immunities =
    { conditions =
      [ "exhaustion"
      , "grappled"
      , "paralyzed"
      , "petrified"
      , "poisoned"
      , "prone"
      , "restrained"
      , "unconscious"
      ]
    , damageTypes = [ "poison", "thunder" ]
    }
  , initiative = { modifier = 5, score = 15 }
  , passivePerception = 10
  , resistances =
    { damageTypes = [ "bludgeoning", "lightning", "piercing", "slashing" ]
    , kind = "fixed"
    }
  , savingThrowModifiers =
    [ { ability = "str", modifier = +2 }
    , { ability = "dex", modifier = +5 }
    , { ability = "con", modifier = +2 }
    , { ability = "int", modifier = -2 }
    , { ability = "wis", modifier = +0 }
    , { ability = "cha", modifier = -2 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , traits = [ T.trait { name = "Air Form", description = "The elemental can enter a creature's space and stop there. It can move through a space as narrow as 1 inch without expending extra movement to do so.", effectKind = None Text } ]
  , size = "large"
  , speeds =
    [ { feet = { kind = "literal", value = 10 }
      , hover = None Bool
      , kind = "walk"
      }
    , { feet = { kind = "literal", value = 90 }
      , hover = Some True
      , kind = "fly"
      }
    ]
  , resources =
    [ { limit = { kind = "recharge", minimumRoll = 4 }
      , ordinal = 1
      , ownership = "shared"
      }
    ]
  }
}
