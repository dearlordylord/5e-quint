{ challengeRating = 3
, id = "stat_block_vampire_familiar"
, kind = "statBlock"
, name = "Vampire Familiar"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:439-473" }
, statBlock =
  { abilityScores =
    { cha = 14, con = 15, dex = 16, int = 10, str = 17, wis = 10 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ { description = "The familiar makes two Umbral Dagger attacks."
      , kind = "textOnly"
      , name = "Multiattack"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Melee or Ranged Attack Roll: +5, reach 5 ft. or range 20/60 ft. Hit: 5 (1d4 + 3) Piercing damage plus 7 (3d4) Necrotic damage. If the target is reduced to 0 Hit Points by this attack, the target becomes Stable but has the Poisoned condition for 1 hour. While it has the Poisoned condition, the target has the Paralyzed condition."
      , kind = "textOnly"
      , name = "Umbral Dagger"
      , procedureOrdinal = 2
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , bonusActions =
    [ { description = "The familiar takes the Dash or Disengage action."
      , kind = "textOnly"
      , name = "Deathless Agility"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { additionalLanguages = 1
      , kind = "named_plus_other_languages"
      , languages = [ "Common" ]
      }
    }
  , creatureType = "humanoid"
  , gear = [ { item = "Dagger", quantity = 10 } ]
  , hp = { kind = "literal", value = 65 }
  , immunities =
    { qualifiedConditions =
      [ { condition = "charmed", qualifier = "except from its vampire master" } ]
    }
  , initiative = { modifier = 5, score = 15 }
  , passivePerception = 14
  , resistances = { damageTypes = [ "necrotic" ], kind = "fixed" }
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 2 }
    , { ability = "con", modifier = 2 }
    , { ability = "dex", modifier = 5 }
    , { ability = "int", modifier = 2 }
    , { ability = "str", modifier = 3 }
    , { ability = "wis", modifier = 2 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 4, skill = "perception" }
    , { modifier = 4, skill = "persuasion" }
    , { modifier = 7, skill = "stealth" }
    ]
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 30 }, kind = "climb" }
    ]
  , traits =
    [ { description =
          "While the familiar and its vampire master are on the same plane of existence, the vampire can communicate with the familiar telepathically, and the vampire can perceive through the familiar's senses."
      , name = "Vampiric Connection"
      }
    ]
  }
}
