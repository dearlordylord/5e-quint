{ challengeRating = 0.5
, id = "stat_block_shadow"
, kind = "statBlock"
, name = "Shadow"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:884-916" }
, statBlock =
  { abilityScores = { cha = 8, con = 13, dex = 14, int = 6, str = 6, wis = 10 }
  , ac.value = { kind = "literal", value = 12 }
  , actions =
    [ { description =
          "Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Necrotic damage, and the target's Strength score decreases by 1d4. The target dies if this reduces that score to 0. If a Humanoid is slain by this attack, a Shadow rises from the corpse 1d4 hours later."
      , kind = "textOnly"
      , name = "Draining Swipe"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "chaotic" }
  , bonusActions =
    [ { description =
          "While in Dim Light or Darkness, the shadow takes the Hide action."
      , kind = "textOnly"
      , name = "Shadow Stealth"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , communication.kind = "none"
  , creatureType = "undead"
  , hp = { kind = "literal", value = 27 }
  , immunities =
    { conditions =
      [ "exhaustion"
      , "frightened"
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
    { damageTypes = [ "acid", "cold", "fire", "lightning", "thunder" ]
    , kind = "fixed"
    }
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -1 }
    , { ability = "con", modifier = +1 }
    , { ability = "dex", modifier = +2 }
    , { ability = "int", modifier = -2 }
    , { ability = "str", modifier = -2 }
    , { ability = "wis", modifier = +0 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "medium"
  , skillModifiers = [ { modifier = 6, skill = "stealth" } ]
  , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
  , traits =
    [ { description =
          "The shadow can move through a space as narrow as 1 inch without expending extra movement to do so."
      , name = "Amorphous"
      }
    , { description =
          "While in sunlight, the shadow has Disadvantage on D20 Tests."
      , name = "Sunlight Weakness"
      }
    ]
  , vulnerabilities = { damageTypes = [ "radiant" ], kind = "fixed" }
  }
}
