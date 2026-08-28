{ challengeRating = 5
, id = "stat_block_salamander"
, kind = "statBlock"
, name = "Salamander"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:761-789" }
, statBlock =
  { abilityScores =
    { cha = 12, con = 15, dex = 14, int = 11, str = 18, wis = 10 }
  , ac.value = { kind = "literal", value = 15 }
  , actions =
    [ { description =
          "The salamander makes two Flame Spear attacks. It can replace one attack with a use of Constrict."
      , kind = "textOnly"
      , name = "Multiattack"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Melee or Ranged Attack Roll: +7, reach 5 ft. or range 20/60 ft. Hit: 13 (2d8 + 4) Piercing damage plus 7 (2d6) Fire damage. Hit or Miss: The spear magically returns to the salamander's hand immediately after a ranged attack."
      , kind = "textOnly"
      , name = "Flame Spear"
      , procedureOrdinal = 2
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description =
          "Strength Saving Throw: DC 15, one Large or smaller creature the salamander can see within 10 feet. Failure: 11 (2d6 + 4) Bludgeoning damage plus 7 (2d6) Fire damage, the target has the Grappled condition (escape DC 14), and it has the Restrained condition until the grapple ends."
      , kind = "textOnly"
      , name = "Constrict"
      , procedureOrdinal = 3
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Primordial (Ignan)" ] }
    }
  , creatureType = "elemental"
  , hp = { kind = "literal", value = 90 }
  , immunities.damageTypes = [ "fire" ]
  , initiative = { modifier = 2, score = 12 }
  , passivePerception = 10
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 1 }
    , { ability = "con", modifier = 2 }
    , { ability = "dex", modifier = 2 }
    , { ability = "int", modifier = 0 }
    , { ability = "str", modifier = 4 }
    , { ability = "wis", modifier = 0 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
  , size = "large"
  , speeds =
    [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
    , { feet = { kind = "literal", value = 30 }, kind = "climb" }
    ]
  , traits =
    [ { description =
          "At the end of each of the salamander's turns, each creature of the salamander's choice in a 5-foot Emanation originating from the salamander takes 7 (2d6) Fire damage."
      , name = "Fire Aura"
      }
    ]
  , vulnerabilities = { damageTypes = [ "cold" ], kind = "fixed" }
  }
}
