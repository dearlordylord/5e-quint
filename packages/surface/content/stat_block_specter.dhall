{ challengeRating = 1
, id = "stat_block_specter"
, kind = "statBlock"
, name = "Specter"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:1284-1310" }
, statBlock =
  { abilityScores =
    { cha = 11, con = 11, dex = 14, int = 10, str = 1, wis = 10 }
  , ac.value = { kind = "literal", value = 12 }
  , actions =
    [ { description =
          "Melee Attack Roll: +4, reach 5 ft. Hit: 7 (2d6) Necrotic damage. If the target is a creature, its Hit Point maximum decreases by an amount equal to the damage taken."
      , kind = "textOnly"
      , name = "Life Drain"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
  , communication =
    { kind = "understood_but_cannot_speak"
    , languages =
      { additionalLanguages = 1
      , kind = "named_plus_other_languages"
      , languages = [ "Common" ]
      }
    }
  , creatureType = "undead"
  , hp = { kind = "literal", value = 22 }
  , immunities =
    { conditions =
      [ "charmed"
      , "exhaustion"
      , "grappled"
      , "paralyzed"
      , "petrified"
      , "poisoned"
      , "prone"
      , "restrained"
      , "unconscious"
      ]
    , damageTypes = [ "necrotic", "poison" ]
    }
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 10
  , resistances =
    { damageTypes =
      [ "acid"
      , "bludgeoning"
      , "cold"
      , "fire"
      , "lightning"
      , "piercing"
      , "slashing"
      , "thunder"
      ]
    , kind = "fixed"
    }
  , savingThrowModifiers =
    [ { ability = "cha", modifier = +0 }
    , { ability = "con", modifier = +0 }
    , { ability = "dex", modifier = +2 }
    , { ability = "int", modifier = +0 }
    , { ability = "str", modifier = -5 }
    , { ability = "wis", modifier = +0 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "medium"
  , speeds =
    [ { feet = { kind = "literal", value = 30 }
      , hover = None Bool
      , kind = "walk"
      }
    , { feet = { kind = "literal", value = 50 }
      , hover = Some True
      , kind = "fly"
      }
    ]
  , traits =
    [ { description =
          "The specter can move through other creatures and objects as if they were Difficult Terrain. It takes 5 (1d10) Force damage if it ends its turn inside an object."
      , name = "Incorporeal Movement"
      }
    , { description =
          "While in sunlight, the specter has Disadvantage on ability checks and attack rolls."
      , name = "Sunlight Sensitivity"
      }
    ]
  }
}
