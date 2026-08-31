{ challengeRating = 5
, id = "stat_block_vampire_spawn"
, kind = "statBlock"
, name = "Vampire Spawn"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:477-518" }
, statBlock =
  { abilityScores =
    { cha = 12, con = 16, dex = 16, int = 11, str = 16, wis = 10 }
  , ac.value = { kind = "literal", value = 16 }
  , actions =
    [ { description = "The vampire makes two Claw attacks and uses Bite."
      , kind = "textOnly"
      , name = "Multiattack"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Melee Attack Roll: +6, reach 5 ft. Hit: 8 (2d4 + 3) Slashing damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape DC 13) from one of two claws."
      , kind = "textOnly"
      , name = "Claw"
      , procedureOrdinal = 2
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Constitution Saving Throw: DC 14, one creature within 5 feet that is willing or that has the Grappled, Incapacitated, or Restrained condition. Failure: 5 (1d4 + 3) Piercing damage plus 10 (3d6) Necrotic damage. The target's Hit Point maximum decreases by an amount equal to the Necrotic damage taken, and the vampire regains Hit Points equal to that amount."
      , kind = "textOnly"
      , name = "Bite"
      , procedureOrdinal = 3
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , bonusActions =
    [ { description = "The vampire takes the Dash or Disengage action."
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
  , creatureType = "undead"
  , hp = { kind = "literal", value = 90 }
  , initiative = { modifier = 3, score = 13 }
  , passivePerception = 13
  , resistances = { damageTypes = [ "necrotic" ], kind = "fixed" }
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 1 }
    , { ability = "con", modifier = 3 }
    , { ability = "dex", modifier = 6 }
    , { ability = "int", modifier = 0 }
    , { ability = "str", modifier = 3 }
    , { ability = "wis", modifier = 3 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 3, skill = "perception" }
    , { modifier = 6, skill = "stealth" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  , traits =
    [ { description =
          "The vampire can climb difficult surfaces, including along ceilings, without needing to make an ability check."
      , name = "Spider Climb"
      }
    , { description = "The vampire has these weaknesses:"
      , name = "Vampire Weakness"
      }
    , { description =
          "The vampire can't enter a residence without an invitation from an occupant."
      , name = "Forbiddance"
      }
    , { description =
          "The vampire takes 20 Acid damage if it ends its turn in running water."
      , name = "Running Water"
      }
    , { description =
          "The vampire is destroyed if a weapon that deals Piercing damage is driven into the vampire's heart while the vampire has the Incapacitated condition."
      , name = "Stake to the Heart"
      }
    , { description =
          "The vampire takes 20 Radiant damage if it starts its turn in sunlight. While in sunlight, it has Disadvantage on attack rolls and ability checks."
      , name = "Sunlight"
      }
    ]
  }
}
